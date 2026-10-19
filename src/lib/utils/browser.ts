/**
 * Small browser-only helpers. Each one fails soft: storage can be blocked
 * (private windows, disabled site data), the async Clipboard API needs a secure
 * context, and smooth scrolling should respect `prefers-reduced-motion`.
 */

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — persistence is a convenience only.
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Copies text, falling back to a hidden textarea where the Clipboard API is unavailable. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** DOM id for an essay paragraph; shared by the spread, tree and marginalia. */
export const paragraphId = (idx: number) => `para-${idx}`;

/** Scrolls a paragraph into view, focuses it for screen readers and flashes it. */
export function scrollToParagraph(idx: number): void {
  const el = document.getElementById(paragraphId(idx));
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  el.focus({ preventScroll: true });
  el.classList.remove('para-flash');
  void el.offsetWidth; // restart the animation if it is already running
  el.classList.add('para-flash');
}

/** True when a keyboard event originates from a text-entry context. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}
