import { RedisClientType, createClient } from "redis";
import { handleRootRequest, handleHealthRequest } from "./app";
import { handler } from "./handler";
import { rateLimit } from "./redis";

const rc: RedisClientType = createClient();
rc.connect();
rc.on("error", (err) => console.log("Redis Client Error", err));

require("dotenv").config();

const app = require("express")();
const port = 3000;

const rateLimitProvider = (ip: string, maxRequests: number, curTime: number, pastTime: number) => {
    return rateLimit(rc, ip, maxRequests, curTime, pastTime);
};

app.get("/", handler(rateLimitProvider, Date.now, handleRootRequest, 1, 10));
app.get("/health", handler(rateLimitProvider, Date.now, handleHealthRequest, 1, 10));
app.listen(port, () => console.log(`listening on port ${port}`));
