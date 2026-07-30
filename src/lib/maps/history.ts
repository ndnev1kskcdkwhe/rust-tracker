import { prisma } from "@/lib/prisma";

/** Records/bumps a map-view for the account history page. Silently a no-op for guests
 * (callers only invoke this when there's a logged-in session). */
export async function recordMapView(userId: string, size: number, seed: number): Promise<void> {
  await prisma.mapViewHistory.upsert({
    where: { userId_size_seed: { userId, size, seed } },
    create: { userId, size, seed },
    update: { viewedAt: new Date() },
  });
}
