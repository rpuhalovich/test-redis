import { Request, Response } from "express";
import { createClient } from "redis";

import { unexpectedError } from "./error";

const rc = createClient();
rc.connect();
rc.on("error", (err) => console.log("Redis Client Error", err));

require("dotenv").config();

const app = require("express")();
const port = 3000;

// using sliding log
async function rateLimit(ip: string, maxRequests: number, curTime: number, pastTime: number): Promise<boolean> {
    console.log({ maxRequests, curTime, pastTime });

    await rc.zRemRangeByScore(ip, "-inf", pastTime);
    await rc.zAdd(ip, { score: curTime, value: `${curTime}` });
    const count = await rc.zCount(ip, "-inf", "inf");
    if (count > maxRequests) return true;
    return false;
}

app.get("/", async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.ip) {
            res.status(400).send("bad request\n");
            return;
        }

        const RATE_LIMIT_MINUTES = 60;
        const RATE_LIMIT_MAX_REQUESTS = 10;

        const pastTime = new Date();
        pastTime.setMinutes(pastTime.getMinutes() - RATE_LIMIT_MINUTES);
        const pastTimeMilliseconds: number = pastTime.getTime();
        const curTimeMilliseconds: number = Date.now();
        const isLimited: boolean = await rateLimit(
            req.ip,
            RATE_LIMIT_MAX_REQUESTS,
            curTimeMilliseconds,
            pastTimeMilliseconds,
        );

        if (isLimited) {
            res.status(429).send("rate limit exceeded\n");
            return;
        }

        res.status(200).send("success\n");
    } catch (error: unknown) {
        unexpectedError(error as Error);
    }
});

app.get("/health", async (req: Request, res: Response): Promise<void> => {
    res.status(200).send("health\n");
});

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
