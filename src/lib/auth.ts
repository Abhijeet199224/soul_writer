export function getSiteUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3001"
  );
}

export function getAuthCallbackUrl() {
  return `${getSiteUrl()}/auth/callback`;
}
