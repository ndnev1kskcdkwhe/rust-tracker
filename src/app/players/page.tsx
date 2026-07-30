"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createWorker } from "tesseract.js";
import { extractSteamId64FromText } from "@/lib/players/extractSteamId";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export default function PlayerSearchPage() {
  const router = useRouter();
  const { dict } = useTranslation();
  const [query, setQuery] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    router.push(`/players/${encodeURIComponent(trimmed)}`);
  };

  const processImageFile = useCallback(
    async (file: File) => {
      setIsProcessingImage(true);
      setImageError(null);
      try {
        const worker = await createWorker("eng");
        const {
          data: { text },
        } = await worker.recognize(file);
        await worker.terminate();

        const steamId = extractSteamId64FromText(text);
        if (!steamId) {
          setImageError(dict.players.imageError);
          setIsProcessingImage(false);
          return;
        }
        router.push(`/players/${steamId}`);
      } catch {
        setImageError(dict.players.imageProcessError);
        setIsProcessingImage(false);
      }
    },
    [router, dict.players.imageError, dict.players.imageProcessError]
  );

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const item = Array.from(event.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      if (!item) {
        return;
      }
      const file = item.getAsFile();
      if (file) {
        processImageFile(file);
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processImageFile]);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <div className="w-full max-w-xl">
        <Link href="/" className="text-sm text-zinc-600 dark:text-zinc-400">
          {dict.players.backHome}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-black dark:text-zinc-50">{dict.players.title}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{dict.players.subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.players.placeholder}
            className="flex-1 rounded-lg border border-black/[.08] px-4 py-3 text-black dark:border-white/[.145] dark:bg-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            className="h-12 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            {dict.players.searchButton}
          </button>
        </form>

        <div className="mt-8 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
          <h2 className="text-sm font-medium text-black dark:text-zinc-50">{dict.players.screenshotBoxTitle}</h2>
          <ol className="mt-2 list-decimal pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            {dict.players.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingImage}
            className="mt-4 h-11 rounded-full border border-solid border-black/[.08] px-6 text-sm font-medium transition-colors hover:border-transparent hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            {isProcessingImage ? dict.players.uploadButtonLoading : dict.players.uploadButton}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {imageError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{imageError}</p>}
        </div>
      </div>
    </div>
  );
}
