import { listenEvent } from "../utils/events.js";

const observedContainers = new WeakSet();
let sharedObserver = null;

/**
 * Check if an element is currently intersecting the visible viewport
 * @param {Element} el
 * @returns {boolean}
 */
function isIntersectingViewport(el) {
  if (!el || typeof el.getBoundingClientRect !== "function") return false;
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  return rect.top < vh && rect.bottom > 0 && rect.left < vw && rect.right > 0;
}

/**
 * Reveal container immediately without animation (used for reduced motion, unsupported observer, or fallback)
 * @param {Element} container
 */
function revealImmediately(container) {
  if (!container) return;
  container.classList.remove("is-revealing");
  container.classList.add("is-revealed");
  if (sharedObserver) {
    sharedObserver.unobserve(container);
  }
}

/**
 * Unconditionally reveal all [data-reveal] elements on the page immediately
 */
function revealAllImmediately() {
  document.querySelectorAll("[data-reveal]").forEach((container) => {
    revealImmediately(container);
  });
}

/**
 * Activate the 3-state reveal animation for a container
 * @param {Element} container
 */
function activateContainer(container) {
  if (!container || container.classList.contains("is-revealed")) return;

  if (sharedObserver) {
    sharedObserver.unobserve(container);
  }

  container.classList.add("is-revealing");

  let isSettled = false;
  let debounceTimer = null;
  let fallbackTimer = null;

  const markRevealed = () => {
    if (isSettled) return;
    isSettled = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    if (fallbackTimer) clearTimeout(fallbackTimer);

    container.removeEventListener("animationend", handleAnimationEnd);
    container.classList.remove("is-revealing");
    container.classList.add("is-revealed");
  };

  const handleAnimationEnd = (e) => {
    if (e.target.closest("[data-reveal]") === container) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(markRevealed, 50);
    }
  };

  container.addEventListener("animationend", handleAnimationEnd);

  // Hard fallback timer (2500ms): guarantees .is-revealed release even if animationend does not fire.
  fallbackTimer = setTimeout(markRevealed, 2500);
}

/**
 * Initialize scroll reveal observer and observe all [data-reveal] containers
 */
export function initScrollReveal() {
  try {
    const isReducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isReducedMotion) {
      revealAllImmediately();
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      revealAllImmediately();
      return;
    }

    if (!sharedObserver) {
      sharedObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              activateContainer(entry.target);
            }
          });
        },
        {
          threshold: 0.08,
          rootMargin: "0px 0px -60px 0px"
        }
      );
    }

    const containers = document.querySelectorAll("[data-reveal]");
    containers.forEach((container) => {
      if (container.parentElement && container.parentElement.closest("[data-reveal]")) {
        console.warn(
          "[ScrollReveal] Nested [data-reveal] container detected and unsupported:",
          container
        );
      }

      if (observedContainers.has(container)) return;
      observedContainers.add(container);

      if (container.classList.contains("is-revealed")) return;

      sharedObserver.observe(container);
    });
  } catch (err) {
    console.error("[ScrollReveal] Failed to initialize scroll reveal observer:", err);
    revealAllImmediately();
  }
}

// Auto-initialize when script loads or DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initScrollReveal);
} else {
  initScrollReveal();
}

// Re-init on AJAX content loading
listenEvent("content:loaded", () => {
  initScrollReveal();
});

// Viewport-only backstop: 3000ms after load, reveal ONLY un-revealed containers that are currently within the visible viewport.
// Containers below the fold remain observed so they animate naturally on scroll arrival.
window.addEventListener("load", () => {
  setTimeout(() => {
    document.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach((container) => {
      if (isIntersectingViewport(container)) {
        activateContainer(container);
      }
    });
  }, 3000);
});
