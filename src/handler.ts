import { Request, Response } from "express";
import { AppRequest, AppResponse } from "./app";

/**
 * Wraps a callback so the rate limiting can be used for every endpoint.
 *
 * NOTE: There's a lot of wrapper stuff here to meet the "unit test" requirement.
 * At the top of the call stack, we would usually do something more akin to an
 * integration test as there's a lot of boilerplate here
 *
 * @returns a callback function for express to use
 */
export function handler(
    callback: (request: AppRequest) => Promise<AppResponse>,
    {
        rateLimitProvider,
        timeProvider,
        authProvider,
        tempOverrideProvider,
        authRateLimitMaxRequests,
        rateLimitMinutes,
        rateLimitMaxRequests,
    }: {
        rateLimitProvider: (ip: string, maxRequests: number, curTime: number, pastTime: number) => Promise<boolean>;
        timeProvider: () => number;
        authProvider?: (token: string) => Promise<boolean>;
        tempOverrideProvider?: (queryParams: Record<string, any>) => Promise<boolean>;
        authRateLimitMaxRequests?: number;
        rateLimitMinutes: number;
        rateLimitMaxRequests: number;
    },
): (req: Request, res: Response) => Promise<void> {
    return async (req: Request, res: Response): Promise<void> => {
        try {
            const appReq: AppRequest = {
                ip: req.ip,
                query: req.query,
                headers: req.headers,
            };
            const ans: AppResponse = await processRequest({
                req: appReq,
                callback,
                rateLimitProvider,
                timeProvider,
                authProvider,
                tempOverrideProvider,
                authRateLimitMaxRequests,
                rateLimitMinutes,
                rateLimitMaxRequests,
            });
            res.status(ans.status).send(ans.obj);
        } catch (error: unknown) {
            const e = error as Error;
            if (e.message === "RATE_LIMIT_EXCEEDED") {
                res.status(429).send("rate limit exceeded");
                return;
            }
            if (e.message === "BAD_REQUEST") {
                res.status(400).send("bad request");
                return;
            }
            res.status(500).send(`unexpected error: ${e.message}`);
        }
    };
}

export async function processRequest({
    callback,
    rateLimitProvider,
    timeProvider,
    authProvider,
    tempOverrideProvider,
    req,
    authRateLimitMaxRequests,
    rateLimitMinutes,
    rateLimitMaxRequests,
}: {
    callback: (request: AppRequest) => Promise<AppResponse>;
    rateLimitProvider: (ip: string, maxRequests: number, curTime: number, pastTime: number) => Promise<boolean>;
    timeProvider: () => number;
    authProvider?: (token: string) => Promise<boolean>;
    tempOverrideProvider?: (queryParams: Record<string, any>) => Promise<boolean>;
    req: AppRequest;
    authRateLimitMaxRequests?: number;
    rateLimitMinutes: number;
    rateLimitMaxRequests: number;
}): Promise<AppResponse> {
    try {
        if (!req.ip) throw new Error("BAD_REQUEST");

        // auth
        let isAuthOverride: boolean = false;
        if (req.headers.authorization && authProvider) {
            isAuthOverride = await authProvider(req.headers.authorization);
        }

        // rate limit
        const curTime: number = timeProvider();
        const MINUTE_IN_MILLISECONDS = 60000;
        const isLimited: boolean = await rateLimitProvider(
            req.ip,
            isAuthOverride && authRateLimitMaxRequests ? authRateLimitMaxRequests : rateLimitMaxRequests,
            curTime,
            curTime - rateLimitMinutes * MINUTE_IN_MILLISECONDS,
        );

        // temp override
        let isTempOverride: boolean = false;
        if (req.query && tempOverrideProvider) {
            isTempOverride = await tempOverrideProvider(req.query);
        }

        if (isLimited && !isTempOverride) throw new Error("RATE_LIMIT_EXCEEDED");

        // run callback functionality
        const ans: AppResponse = await callback(req);
        return ans;
    } catch (error: unknown) {
        const e = error as Error;
        throw e;
    }
}
