import { Request, Response } from "express";

import { handleRootRequest, AppRequest, AppResponse } from "./app";

require("dotenv").config();

const app = require("express")();
const port = 3000;

app.get("/", (req: Request, res: Response): void => {
    const tmpreq: AppRequest = { ip: req.ip };
    const ans: AppResponse = handleRootRequest(tmpreq);
    res.status(ans.status).send(ans.obj);
});

app.get("/health", (req: Request, res: Response): void => {
    res.status(200).send("health");
});

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
