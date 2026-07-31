"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { Logo } from "../Logo";
import { SteamIcon } from "../SteamIcon";

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
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="panel auth-card rise">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="auth-title">{dict.auth.loginTitle}</h1>

        {error && <p className="note note-bad">{error}</p>}

        <label className="field">
          {dict.auth.emailLabel}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
        </label>

        <label className="field">
          {dict.auth.passwordLabel}
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </label>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
          {isSubmitting ? dict.auth.loginButtonLoading : dict.auth.loginButton}
        </button>

        <div className="divider">
          <span>{dict.auth.or}</span>
        </div>

        <Link href="/api/auth/steam/login" className="btn btn-steam w-full">
          <SteamIcon />
          {dict.auth.steamLogin}
        </Link>

        <p className="text-center text-sm muted">
          {dict.auth.noAccount}{" "}
          <Link href="/register" className="link-accent">
            {dict.auth.registerLink}
          </Link>
        </p>
      </form>
    </div>
  );
}
