/**
 * Shared readiness helper for the Zid SDK.
 *
 * `window.zid` is injected by the platform and is frequently NOT present at
 * DOMContentLoaded, so anything touching it has to wait first.
 *
 * This lives here because it was previously duplicated as a module-scope
 * function in two files. Vite flattens the modules into one IIFE scope, so
 * `badge.js` silently resolved the copy that happened to be declared in
 * `localization.js` — and deleting that copy broke `badge.js` with a
 * ReferenceError that only surfaced at runtime. One definition, imported.
 *
 * @param {string} [path] - Dotted sub-path that must also exist, e.g. "cart.get".
 * @param {number} [maxAttempts]
 * @returns {Promise<boolean>}
 */
export async function waitForZid(path = "", maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const root = window.zid;
    if (root) {
      const target = path
        ? path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), root)
        : root;
      if (target) return true;
    }
    await new Promise((r) => setTimeout(r, 100 * Math.min(i + 1, 10)));
  }
  console.error(`[Zid] SDK not available${path ? ` (${path})` : ""}`);
  return false;
}
