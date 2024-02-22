// Where we put our business logic.

export type AppRequest = {
    ip: string;
};

export type AppResponse = {
    status: number;
    obj: Record<string, unknown>;
};

export async function handleRootRequest(req: AppRequest): Promise<AppResponse> {
    console.log(req.ip);
    const res: AppResponse = {
        status: 200,
        obj: { message: "hi there" },
    };
    return res;
}
