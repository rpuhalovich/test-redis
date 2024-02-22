import { RedisClientType, createClient } from "redis";
import { AppRequest, AppResponse, handleRootRequest } from "./app";
import { handler } from "./handler";
import { rateLimit } from "./redis";

const rc: RedisClientType = createClient();
rc.connect();
rc.on("error", (err) => console.log("Redis Client Error", err));

require("dotenv").config();

const app = require("express")();
const port = 3000;

// Implement logic for special events based on query params
const tempLimit = async (queryParams: Record<any, unknown>): Promise<boolean> => false;

// Implement auth logic based on given token
const auth = async (token: string | undefined): Promise<boolean> => false;

const healthCb = async (req: AppRequest): Promise<AppResponse> => {
    return { status: 200, obj: { message: "success" } };
};

app.get("/", handler(rateLimit, tempLimit, auth, Date.now, handleRootRequest, rc, 1, 10, 20));
app.get("/health", handler(rateLimit, tempLimit, auth, Date.now, healthCb, rc, 1, 10, 20));
app.listen(port, () => console.log(`listening on port ${port}`));
