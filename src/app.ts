export type AppRequest = {
    ip: string;
};

export type AppResponse = {
    status: number;
    obj: Record<string, unknown>;
};

export async function handleRootRequest(req: AppRequest): Promise<AppResponse> {
    const res: AppResponse = {
        status: 200,
        obj: { message: "hi there" },
    };
    return res;
}

export async function handleHealthRequest(req: AppRequest): Promise<AppResponse> {
    return { status: 200, obj: { message: "success" } };
}
