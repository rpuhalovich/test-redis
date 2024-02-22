import { Request, Response } from "express";
import { AppRequest, AppResponse } from "./app";
import { RedisClientType } from "redis";

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
export function handler(
    rateLimitProvider: (
        rclient: RedisClientType,
        ip: string,
        maxRequests: number,
        curTime: number,
        pastTime: number,
    ) => Promise<boolean>,
    tempLimitProvider: (queryParams: Record<any, unknown>) => Promise<boolean>,
    authProvider: (token: string | undefined) => Promise<boolean>,
    timeProvider: () => number,
    cb: (request: AppRequest) => Promise<AppResponse>,
    rc: RedisClientType,
    rateLimitMinutes: number,
    rateLimitMaxRequests: number,
    authRateLimitMaxRequests: number,
): (req: Request, res: Response) => Promise<void> {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.ip) {
                res.status(400).send("bad request");
                return;
            }

            // is authenticated
            const authenticated: boolean = await authProvider(req.headers["authorization"]);

            // temp limit based on query parameters
            const overrideRateLimit: boolean = await tempLimitProvider(req.query);

            // rate limit
            const curTime = timeProvider();
            const MINUTE_IN_MILLISECONDS = 60000;
            const isLimited: boolean = await rateLimitProvider(
                rc,
                req.ip,
                authenticated ? authRateLimitMaxRequests : rateLimitMaxRequests,
                curTime,
                curTime - rateLimitMinutes * MINUTE_IN_MILLISECONDS,
            );

            if (isLimited && !overrideRateLimit) {
                res.status(429).send("rate limit exceeded");
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
