"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dict } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "SteamAuth" ? dict.auth.steamError : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError(dict.auth.invalidCredentials);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-black"
      >
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">{dict.auth.loginTitle}</h1>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          {dict.auth.emailLabel}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          {dict.auth.passwordLabel}
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-black/[.08] px-3 py-2 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 h-11 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {isSubmitting ? dict.auth.loginButtonLoading : dict.auth.loginButton}
        </button>

        <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
          <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
          {dict.auth.or}
          <div className="h-px flex-1 bg-black/[.08] dark:bg-white/[.145]" />
        </div>

        <Link
          href="/api/auth/steam/login"
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#1b2838] px-6 text-sm font-medium text-white transition-colors hover:bg-[#2a3f5a]"
        >
          {dict.auth.steamLogin}
        </Link>

        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          {dict.auth.noAccount}{" "}
          <Link href="/register" className="font-medium text-black dark:text-zinc-50">
            {dict.auth.registerLink}
          </Link>
        </p>
      </form>
    </div>
  );
}
