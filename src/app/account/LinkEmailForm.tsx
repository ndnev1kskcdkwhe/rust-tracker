"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LinkEmailForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const res = await fetch("/api/account/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      setIsSaving(false);

      if (!res.ok) {
        setError(data.error ?? "Не вдалося прив'язати пошту");
        return;
      }

      setDone(true);
      // The page reads the email straight from the database, so a refresh is what makes the
      // new address show up in the card above.
      router.refresh();
    } catch {
      setIsSaving(false);
      setError("Не вдалося зв'язатися з сервером. Перевір з'єднання.");
    }
  };

  if (done) {
    return <p className="note note-ok mt-3">Пошту прив&apos;язано. Тепер можна входити і через неї.</p>;
  }

  if (!isOpen) {
    return (
      <div className="mt-4 border-t border-[var(--line)] pt-4">
        <p className="text-sm muted leading-relaxed">
          Акаунт створено через Steam — пошти в нього немає. Прив&apos;яжи її, щоб мати запасний
          спосіб входу, якщо втратиш доступ до Steam.
        </p>
        <button type="button" onClick={() => setIsOpen(true)} className="btn btn-sm mt-3">
          Прив&apos;язати пошту
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 border-t border-[var(--line)] pt-4">
      <label className="field">
        Email
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
        Пароль (мінімум 8 символів)
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

      {error && <p className="note note-bad">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={isSaving} className="btn btn-primary btn-sm">
          {isSaving ? "Зберігаю..." : "Зберегти"}
        </button>
        <button type="button" onClick={() => setIsOpen(false)} className="btn btn-sm">
          Скасувати
        </button>
      </div>
    </form>
  );
}
