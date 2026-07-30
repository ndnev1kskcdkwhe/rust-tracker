import { prisma } from "@/lib/prisma";

/** Records/bumps a player-view for the account history page. Silently a no-op for guests
 * (callers only invoke this when there's a logged-in session). */
export async function recordPlayerView(userId: string, steamId: string): Promise<void> {
  await prisma.playerViewHistory.upsert({
    where: { userId_steamId: { userId, steamId } },
    create: { userId, steamId },
    update: { viewedAt: new Date() },
  });
}
