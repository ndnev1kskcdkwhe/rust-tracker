"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LocaleProvider";
import { Logo } from "../Logo";
import { SteamIcon } from "../SteamIcon";

export default function RegisterPage() {
  const router = useRouter();
  const { dict } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      // The API's own error messages are still Ukrainian-only for now — server-side validation
      // text isn't covered by this translation pass yet.
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? dict.auth.registerButton);
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError(dict.auth.registerFailedButLoggedIn);
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
        <h1 className="auth-title">{dict.auth.registerTitle}</h1>

        {error && <p className="note note-bad">{error}</p>}

        <label className="field">
          {dict.auth.nameLabel}
          <input
            type="text"
            autoComplete="nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </label>

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
          {dict.auth.passwordHintLabel}
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </label>

        <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
          {isSubmitting ? dict.auth.registerButtonLoading : dict.auth.registerButton}
        </button>

        <div className="divider">
          <span>{dict.auth.or}</span>
        </div>

        <Link href="/api/auth/steam/login" className="btn btn-steam w-full">
          <SteamIcon />
          {dict.auth.steamRegister}
        </Link>

        <p className="text-center text-sm muted">
          {dict.auth.haveAccount}{" "}
          <Link href="/login" className="link-accent">
            {dict.auth.loginLink}
          </Link>
        </p>
      </form>
    </div>
  );
}
