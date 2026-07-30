/** Converts an ISO 3166-1 alpha-2 country code (e.g. "UA") to its flag emoji. */
export function countryCodeToFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
