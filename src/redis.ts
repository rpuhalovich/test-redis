import { RedisClientType } from "redis";

/**
 * using sliding log
 * @returns true if request should be rate limited
 */
export async function rateLimit(
    rc: RedisClientType,
    ip: string,
    maxRequests: number,
    curTime: number,
    pastTime: number,
): Promise<boolean> {
    await rc.zRemRangeByScore(ip, "-inf", pastTime);
    await rc.zAdd(ip, { score: curTime, value: `${curTime}` });
    const count = await rc.zCount(ip, "-inf", "inf");
    return count > maxRequests;
}
