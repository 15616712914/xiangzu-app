/** Uses the native share sheet when available, otherwise copies the link. */
export async function shareLink(title: string, text: string, url = window.location.href) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return "shared" as const;
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return "cancelled" as const;
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "copied" as const;
  } catch {
    return "failed" as const;
  }
}
