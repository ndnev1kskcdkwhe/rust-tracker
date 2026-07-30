"use client";

import { useState } from "react";

function useCopyFeedback() {
  const [copied, setCopied] = useState(false);
  const trigger = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return { copied, trigger };
}

export function CopyableSteamId({ steamId }: { steamId: string }) {
  const { copied, trigger } = useCopyFeedback();
  return (
    <button
      type="button"
      onClick={() => trigger(steamId)}
      className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      title="Скопіювати SteamID"
    >
      {steamId} {copied ? "✓" : "⧉"}
    </button>
  );
}

export function ShareProfileButton() {
  const { copied, trigger } = useCopyFeedback();
  return (
    <button
      type="button"
      onClick={() => trigger(window.location.href)}
      className="h-10 rounded-full border border-solid border-black/[.08] px-4 text-sm font-medium transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
    >
      {copied ? "Посилання скопійовано" : "Поділитися профілем"}
    </button>
  );
}
