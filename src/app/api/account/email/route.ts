import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasPlaceholderEmail } from "@/lib/account/placeholderEmail";

/**
 * Attaches an email + password login to an account that was created through Steam.
 *
 * Deliberately limited to accounts that still carry the generated Steam placeholder email:
 * changing an already-real email is a different operation that has to re-verify the current
 * password first, and quietly allowing it here would turn "add a login method" into an
 * unauthenticated way to move someone's account to a new address.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Потрібно увійти" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Користувача не знайдено" }, { status: 404 });
  }
  if (!hasPlaceholderEmail(user)) {
    return NextResponse.json(
      { error: "До цього акаунта вже прив'язана пошта" },
      { status: 409 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email і пароль обов'язкові" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Некоректний email" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Пароль має містити щонайменше 8 символів" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== user.id) {
    return NextResponse.json({ error: "Ця пошта вже зайнята" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { email, passwordHash },
  });

  return NextResponse.json({ email });
}
