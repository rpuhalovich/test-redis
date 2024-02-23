import { RedisClientType } from "redis";

/**
 * reference: https://bhargav-journal.blogspot.com/2020/12/understanding-rate-limiting-algorithms.html
 * Using the sliding log algorithm
 * @param curTime current time
 * @param pastTime time to cut off
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
    const count: number = await rc.zCount(ip, "-inf", "inf");
    return count > maxRequests;
}
