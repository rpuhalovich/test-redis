import { Request, Response } from "express";
import { createClient } from "redis";

import { handleRootRequest, AppRequest, AppResponse } from "./app";
import { unexpectedError } from "./error";

const redisClient = createClient();
redisClient.connect();
redisClient.on("error", (err) => console.log("Redis Client Error", err));

require("dotenv").config();

const app = require("express")();
const port = 3000;

app.get("/", async (req: Request, res: Response): Promise<void> => {
    try {
        const tmpreq: AppRequest = { ip: req.ip ? req.ip : "" };
        const ans: AppResponse = handleRootRequest(tmpreq);
        res.status(ans.status).send(ans.obj);
    } catch (error: unknown) {
        unexpectedError(error as Error);
    }
});

app.get("/health", async (req: Request, res: Response): Promise<void> => {
    try {
        console.log(await redisClient.set("name", "ryan"));
        console.log(await redisClient.get("name"));
        res.status(200).send("health\n");
    } catch (error: unknown) {
        unexpectedError(error as Error);
    }
});

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
