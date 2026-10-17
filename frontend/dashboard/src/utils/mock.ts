/**
 * Feature API compatibility layer. Auth is always server-backed; feature
 * endpoints remain fixture-backed until their backend contracts are shipped.
 */
export const USE_MOCK = true;

export const API_URL: string = import.meta.env.VITE_API_BASE_URL ?? '';

export function mockDelay(ms = 250): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
