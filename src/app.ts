export type AppRequest = {
    ip: string | undefined;
    query: Record<string, any>;
    headers: { authorization?: string };
};

export type AppResponse = {
    status: number;
    obj: Record<string, unknown>;
};

export async function handleRootRequest(req: AppRequest): Promise<AppResponse> {
    return { status: 200, obj: { message: "success" } };
}

export async function handleHealthRequest(req: AppRequest): Promise<AppResponse> {
    return { status: 200, obj: { message: "success" } };
}
