import Link from "next/link";

/** Wordmark + mark. The mark is a stylised hex bolt head — industrial, reads at
 * 24px, and avoids leaning on any Facepunch artwork. */
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Rust Tracker">
      <svg viewBox="0 0 32 32" aria-hidden className="logo-mark">
        <path
          d="M16 2.6 27.2 9v14L16 29.4 4.8 23V9z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="16" r="4.4" fill="currentColor" />
      </svg>
      <span className="logo-text">
        Rust<span className="logo-accent">Tracker</span>
      </span>
    </Link>
  );
}
