import { AppRequest, AppResponse } from "./app";
import { processRequest } from "./handler";

export async function handleTest(request: AppRequest): Promise<AppResponse> {
    return { status: 200, obj: { message: "success" } };
}

describe("handler", () => {
    test("callback is called", async () => {
        const handleTestFn = jest.fn(handleTest);
        const rateLimitProvider = jest.fn(
            async (ip: string, maxRequests: number, curTime: number, pastTime: number): Promise<boolean> => {
                return false;
            },
        );
        const timeProvider = jest.fn(() => 10);

        const req: AppRequest = {
            ip: "::1",
            query: {},
            headers: {},
        };

        const ans: AppResponse = await processRequest({
            callback: handleTestFn,
            rateLimitProvider,
            timeProvider,
            req,
            rateLimitMinutes: 1,
            rateLimitMaxRequests: 10,
        });

        expect(handleTestFn).toBeCalled();
        expect(ans.obj.message).toEqual("success");
    });

    test("rate limit", async () => {
        const handleTestFn = jest.fn(handleTest);
        const rateLimitProvider = async (
            ip: string,
            maxRequests: number,
            curTime: number,
            pastTime: number,
        ): Promise<boolean> => true;

        const req: AppRequest = {
            ip: "::1",
            query: {},
            headers: {},
        };

        expect(async () => {
            await processRequest({
                callback: handleTestFn,
                rateLimitProvider,
                timeProvider: () => 10,
                req,
                rateLimitMinutes: 1,
                rateLimitMaxRequests: 2,
            });
        }).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });
});
