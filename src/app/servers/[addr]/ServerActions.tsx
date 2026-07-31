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
    <button type="button" onClick={handleClick} title="Скопіювати" className="addr-chip">
      <span className="addr-text mono">{text}</span>
      <span className="addr-label">{label}</span>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="copy-glyph">
        {copied ? (
          <path
            d="m5 12.5 4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <>
            <rect x="9" y="9" width="11" height="11" rx="2.2" stroke="currentColor" strokeWidth="1.9" />
            <path
              d="M15 6.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h.5"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </button>
  );
}
