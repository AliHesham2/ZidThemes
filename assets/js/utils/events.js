/**
 * Custom Event Dispatch & Listen Helpers
 */

/**
 * Dispatch a custom event on an element or document
 * @param {string} eventName
 * @param {object} detail
 * @param {Element|Document} target
 */
export function dispatchEvent(eventName, detail = {}, target = document) {
  const event = new CustomEvent(eventName, {
    bubbles: true,
    cancelable: true,
    detail
  });
  target.dispatchEvent(event);
}

/**
 * Listen for a custom event on an element or document
 * @param {string} eventName
 * @param {Function} handler
 * @param {Element|Document} target
 * @returns {Function} Unsubscribe function
 */
export function listenEvent(eventName, handler, target = document) {
  target.addEventListener(eventName, handler);
  return () => target.removeEventListener(eventName, handler);
}

/**
 * Notify modules that new DOM content has been injected (e.g. AJAX / Quick View)
 * @param {Element} container
 */
export function notifyContentLoaded(container = document) {
  dispatchEvent("content:loaded", { container });
}

/**
 * Notify modules that products data or UI has updated
 * @param {object} detail
 */
export function notifyProductsUpdated(detail = {}) {
  dispatchEvent("products:updated", detail);
}
