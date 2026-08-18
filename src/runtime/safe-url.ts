// ─── URL scheme allowlist ─────────────────────────────────────────────────────
//
// State values are untrusted input. A workbook arrives by email and its data
// may have been hand-edited, so any value that reaches a src= or href= must be
// checked against an allowlist and assigned as a DOM *property* — never
// interpolated into a markup string, which is how `http" onerror="..." ` becomes
// script execution.

const SAFE_IMAGE_SRC = /^(?:https?:\/\/|\/|\.\/|data:image\/)/i;

/**
 * Returns the value if it is safe to place in an <img src>, else null.
 * Callers fall back to rendering the value as text.
 */
export function safeImageSrc(value: string): string | null {
  const src = value.trim();
  // Control characters (newlines, NUL, tabs) can smuggle a scheme past a
  // naive prefix test once a parser normalises them away.
  if (/[\u0000-\u001F\u007F]/.test(src)) return null;
  // Markup metacharacters never appear unencoded in a real image URL. The
  // avatar element assigns this as a property, where they would be inert —
  // but rejecting them keeps the helper safe for any future caller that
  // builds markup, which is the mistake this whole module exists to prevent.
  if (/["'<>`]/.test(src)) return null;
  return SAFE_IMAGE_SRC.test(src) ? src : null;
}
