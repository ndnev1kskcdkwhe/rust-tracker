import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Потрібна авторизація" }, { status: 401 });
  }

  const { id } = await context.params;
  const { count } = await prisma.plantGenome.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (count === 0) {
    return NextResponse.json({ error: "Не знайдено" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
