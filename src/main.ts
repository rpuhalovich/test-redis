import { RedisClientType, createClient } from "redis";
import { handleRootRequest, handleHealthRequest } from "./app";
import { handler } from "./handler";
import { rateLimit } from "./redis";

const rc: RedisClientType = createClient();
rc.connect();
rc.on("error", (err) => console.log("redis client error", err));

require("dotenv").config();

const app = require("express")();
const port = 3000;

/**
 * NOTE: Rate limit temp override from queryparams is bad. Not sure what this requirement means,
 * where would the special requirement check come from the client?
 */
const tempOverrideProvider = async (queryParams: Record<string, any>): Promise<boolean> => {
    return false;
};

const authProvider = async (token: string): Promise<boolean> => {
    return false;
};

const rateLimitProvider = (ip: string, maxRequests: number, curTime: number, pastTime: number) => {
    return rateLimit(rc, ip, maxRequests, curTime, pastTime);
};

const envnum = (val: string | undefined) => (val ? Number(val) : 0);

app.get(
    "/",
    handler(handleRootRequest, {
        rateLimitProvider,
        tempOverrideProvider,
        authProvider,
        timeProvider: Date.now,
        rateLimitMinutes: envnum(process.env.ROOT_RATE_LIMIT_MINUTES),
        rateLimitMaxRequests: envnum(process.env.ROOT_RATE_LIMIT_MAX_REQUESTS),
        authRateLimitMaxRequests: envnum(process.env.ROOT_AUTH_RATE_LIMIT_MAX_REQUESTS),
    }),
);

app.get(
    "/health",
    handler(handleHealthRequest, {
        rateLimitProvider,
        timeProvider: Date.now,
        rateLimitMinutes: envnum(process.env.HEALTH_RATE_LIMIT_MINUTES),
        rateLimitMaxRequests: envnum(process.env.HEALTH_RATE_LIMIT_MAX_REQUESTS),
    }),
);

app.listen(port, () => console.log(`listening on port ${port}`));
