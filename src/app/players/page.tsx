"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
    <div className="page">
      <div className="shell">
        <h1 className="page-title rise">{dict.players.title}</h1>
        <p className="page-lede rise" style={{ ["--d" as string]: "60ms" }}>
          {dict.players.subtitle}
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-7 flex gap-2 rise"
          style={{ ["--d" as string]: "120ms" }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.players.placeholder}
            autoFocus
            className="input"
          />
          <button type="submit" className="btn btn-primary shrink-0">
            {dict.players.searchButton}
          </button>
        </form>

        <div className="panel mt-6 rise" style={{ ["--d" as string]: "180ms" }}>
          <p className="label">{dict.players.screenshotBoxTitle}</p>
          <ol className="steps">
            {dict.players.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingImage}
            className="btn btn-sm mt-4"
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

          {imageError && <p className="note note-bad mt-3">{imageError}</p>}
        </div>
      </div>
    </div>
  );
}
