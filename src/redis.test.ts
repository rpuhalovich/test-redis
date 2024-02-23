import { RedisClientType, createClient } from "redis";
import { rateLimit } from "./redis";

let rc: RedisClientType = createClient();

describe("rateLimit", () => {
    beforeAll(async () => {
        await rc.connect();
    });

    beforeEach(async () => {
        await rc.flushAll();
    });

    afterAll(async () => {
        await rc.quit();
    });

    it("rate limited after five requests", async () => {
        expect(await rateLimit(rc, "::1", 5, 1100, 0)).toBe(false);
        expect(await rateLimit(rc, "::1", 5, 1200, 100)).toBe(false);
        expect(await rateLimit(rc, "::1", 5, 1300, 200)).toBe(false);
        expect(await rateLimit(rc, "::1", 5, 1400, 300)).toBe(false);
        expect(await rateLimit(rc, "::1", 5, 1500, 400)).toBe(false);
        expect(await rateLimit(rc, "::1", 5, 1600, 500)).toBe(true);
    });

    it("no rate limit after cull", async () => {
        expect(await rateLimit(rc, "::1", 3, 1100, 0)).toBe(false);
        expect(await rateLimit(rc, "::1", 3, 1200, 100)).toBe(false);
        expect(await rateLimit(rc, "::1", 3, 1300, 200)).toBe(false);
        expect(await rateLimit(rc, "::1", 3, 3000, 1500)).toBe(false);
    });
});
