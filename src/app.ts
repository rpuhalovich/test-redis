export type AppRequest = {
    ip: string;
};

export type AppResponse = {
    status: number;
    obj: Record<string, unknown>;
};

export function handleRootRequest(req: AppRequest): AppResponse {
    console.log(req.ip);
    const res: AppResponse = {
        status: 429,
        obj: { message: "limited" },
    };
    return res;
}
