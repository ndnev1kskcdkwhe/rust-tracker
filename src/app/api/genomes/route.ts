import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CROPS } from "@/lib/calculators/genetics/data";
import { isValidGenome } from "@/lib/calculators/genetics/genetics";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Потрібна авторизація" }, { status: 401 });
  }

  const genomes = await prisma.plantGenome.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(genomes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Потрібна авторизація" }, { status: 401 });
  }

  const body = await request.json();
  const crop = body.crop;
  const genes = typeof body.genes === "string" ? body.genes.toUpperCase() : "";
  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : null;

  if (!CROPS.includes(crop)) {
    return NextResponse.json({ error: "Невідома культура" }, { status: 400 });
  }
  if (!isValidGenome(genes)) {
    return NextResponse.json({ error: "Геном має бути 6 літер: G, Y, H, W, X" }, { status: 400 });
  }

  const genome = await prisma.plantGenome.create({
    data: { userId: session.user.id, crop, genes, label },
  });

  return NextResponse.json(genome, { status: 201 });
}
