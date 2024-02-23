import { Request, Response } from "express";
import { AppRequest, AppResponse } from "./app";

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
    cb: (request: AppRequest) => Promise<AppResponse>,
    {
        rateLimitProvider,
        timeProvider,
        rateLimitMinutes,
        rateLimitMaxRequests,
    }: {
        rateLimitProvider: (ip: string, maxRequests: number, curTime: number, pastTime: number) => Promise<boolean>;
        timeProvider: () => number;
        rateLimitMinutes: number;
        rateLimitMaxRequests: number;
    },
): (req: Request, res: Response) => Promise<void> {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.ip) {
                res.status(400).send("bad request");
                return;
            }

            // rate limit
            const curTime: number = timeProvider();
            const MINUTE_IN_MILLISECONDS = 60000;
            const isLimited: boolean = await rateLimitProvider(
                req.ip,
                rateLimitMaxRequests,
                curTime,
                curTime - rateLimitMinutes * MINUTE_IN_MILLISECONDS,
            );

            if (isLimited) {
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
