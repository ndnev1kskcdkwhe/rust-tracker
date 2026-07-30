"use client";

import { useState } from "react";

export function CopyableAddress({ label, address }: { label: string; address: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Скопіювати адресу"
      className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <span className="font-mono">{address}</span>
      <span className="text-zinc-400">({label})</span>
      {copied ? "✓" : "⧉"}
    </button>
  );
}
