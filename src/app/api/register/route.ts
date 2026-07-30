import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : undefined;

  if (!email || !password) {
    return NextResponse.json({ error: "Email і пароль обов'язкові" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Пароль має містити щонайменше 8 символів" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Користувач з таким email вже існує" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      subscription: {
        create: {},
      },
    },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
