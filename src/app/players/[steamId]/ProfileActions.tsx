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

function CopyGlyph({ copied }: { copied: boolean }) {
  return (
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
  );
}

export function CopyableSteamId({ steamId }: { steamId: string }) {
  const { copied, trigger } = useCopyFeedback();
  return (
    <button type="button" onClick={() => trigger(steamId)} className="copy-chip" title="Скопіювати SteamID">
      <span className="mono">{steamId}</span>
      <CopyGlyph copied={copied} />
    </button>
  );
}

export function ShareProfileButton() {
  const { copied, trigger } = useCopyFeedback();
  return (
    <button type="button" onClick={() => trigger(window.location.href)} className="btn btn-sm w-full">
      {copied ? "Посилання скопійовано" : "Поділитися профілем"}
    </button>
  );
}
