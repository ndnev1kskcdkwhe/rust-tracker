/**
 * Steam sign-in creates an account before we know any email address, but `User.email` is
 * required and unique — so it gets a synthetic one derived from the SteamID. Treating that
 * value as "no email yet" is a rule several places depend on (the account page's display,
 * and whether the add-email form is offered), so it lives in one place rather than being
 * re-spelled as an `endsWith` check each time.
 */
export function steamPlaceholderEmail(steamId: string): string {
  return `${steamId}@steamcommunity.com`;
}

/**
 * Exact match against the generated value rather than a domain suffix check: a suffix test
 * would also swallow any real address at that domain, and would keep returning true after
 * someone sets a genuine email if the domains happened to line up.
 */
export function hasPlaceholderEmail(user: { email: string; steamId: string | null }): boolean {
  return user.steamId !== null && user.email === steamPlaceholderEmail(user.steamId);
}
