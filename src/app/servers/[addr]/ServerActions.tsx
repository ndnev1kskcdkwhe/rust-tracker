"use client";

import { useState } from "react";

export function CopyableAddress({
  label,
  address,
  commandPrefix,
}: {
  label: string;
  address: string;
  /** e.g. "client.connect" — prepended to both the shown text and the copied value, so
   * pasting straight into the Rust console connects without any extra typing. */
  commandPrefix?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = commandPrefix ? `${commandPrefix} ${address}` : address;

  const handleClick = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Скопіювати"
      className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <span className="font-mono">{text}</span>
      <span className="text-zinc-400">({label})</span>
      {copied ? "✓" : "⧉"}
    </button>
  );
}
