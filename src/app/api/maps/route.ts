import { NextResponse } from "next/server";
import { getMapPreview } from "@/lib/maps/getMapPreview";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const sizeParam = params.get("size");
  const seedParam = params.get("seed");
  const mapIdParam = params.get("mapId") ?? undefined;

  if (!sizeParam || !seedParam) {
    return NextResponse.json({ error: "Параметри size і seed обов'язкові" }, { status: 400 });
  }

  const size = Number(sizeParam);
  const seed = Number(seedParam);
  if (!Number.isFinite(size) || !Number.isFinite(seed)) {
    return NextResponse.json({ error: "size і seed мають бути числами" }, { status: 400 });
  }

  const result = await getMapPreview(size, seed, mapIdParam);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
