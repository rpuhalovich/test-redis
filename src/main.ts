import { Request, Response } from "express";
import { createClient } from "redis";
import { AppRequest, AppResponse, handleRootRequest } from "./app";

const rc = createClient();
rc.connect();
rc.on("error", (err) => console.log("Redis Client Error", err));

require("dotenv").config();

const app = require("express")();
const port = 3000;

/**
 * Wraps a callback so the rate limiting can be used for every endpoint.
 *
 * NOTE: this is bordering on too much DI, this is just to meet the 'unit test' requirement to test specifically
 * the middleware in the real world, I would do something like an integration test that has a running in memory Redis
 *
 * NOTE: also it's very rigid if we were to change the args for the different DI providers. In the real world,
 * we would just have the handler wrapper with the only args being the callback function and an options obj that
 * would have stuff like the rateLimitMinutes, rateLimitMaxRequests and providers
 *
 * @returns a callback function for express to use
 */
function handler(
    rateLimitProvider: (ip: string, maxRequests: number, curTime: number, pastTime: number) => Promise<boolean>,
    tempLimitProvider: (queryParams: Record<any, unknown>) => Promise<boolean>,
    authProvider: (token: string | undefined) => Promise<boolean>,
    cb: (request: AppRequest) => Promise<AppResponse>,
    rateLimitMinutes: number,
    rateLimitMaxRequests: number,
    authRateLimitMaxRequests: number,
): (req: Request, res: Response) => Promise<void> {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.ip) {
                res.status(400).send("bad request\n");
                return;
            }

            // is authenticated
            const authenticated: boolean = await authProvider(req.headers["authorization"]);

            // temp limit based on query parameters
            const overrideRateLimit: boolean = await tempLimitProvider(req.query);

            // rate limit
            const pastTime = new Date();
            pastTime.setMinutes(pastTime.getMinutes() - rateLimitMinutes);
            const pastTimeMilliseconds: number = pastTime.getTime();
            const curTimeMilliseconds: number = Date.now();
            const isLimited: boolean = await rateLimitProvider(
                req.ip,
                authenticated ? authRateLimitMaxRequests : rateLimitMaxRequests,
                curTimeMilliseconds,
                pastTimeMilliseconds,
            );

            if (isLimited && !overrideRateLimit) {
                res.status(429).send("rate limit exceeded\n");
                return;
            }

            // run cb functionality
            const ans: AppResponse = await cb({ ip: req.ip });
            res.status(ans.status).send(ans.obj);
        } catch (error: unknown) {
            const e = error as Error;
            res.status(500).send(`unexpected error: ${e.message}`);
        }
    };
}

/**
 * using sliding log
 * @returns true if request should be rate limited
 */
async function rateLimit(ip: string, maxRequests: number, curTime: number, pastTime: number): Promise<boolean> {
    await rc.zRemRangeByScore(ip, "-inf", pastTime);
    await rc.zAdd(ip, { score: curTime, value: `${curTime}` });
    const count = await rc.zCount(ip, "-inf", "inf");
    return count > maxRequests;
}

const tempLimit = async (queryParams: Record<any, unknown>): Promise<boolean> => false;
const auth = async (token: string | undefined): Promise<boolean> => false;

app.get("/", handler(rateLimit, tempLimit, auth, handleRootRequest, 1, 10, 20));

app.get(
    "/health",
    handler(
        rateLimit,
        tempLimit,
        auth,
        async (req: AppRequest): Promise<AppResponse> => {
            return { status: 200, obj: { message: "success" } };
        },
        1,
        10,
        20,
    ),
);

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
