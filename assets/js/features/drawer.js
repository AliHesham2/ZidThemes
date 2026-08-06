import { listenEvent } from "../utils/events.js";

const initializedTriggers = new WeakSet();
const activeDrawers = new Set();
let lastFocusedElement = null;
let keydownListenerAttached = false;

/**
 * Focus Trap Handler
 * @param {KeyboardEvent} e
 * @param {Element} drawerEl
 */
function handleFocusTrap(e, drawerEl) {
  if (e.key !== "Tab") return;

  const focusableSelector =
    'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const focusables = Array.from(drawerEl.querySelectorAll(focusableSelector));

  if (focusables.length === 0) {
    e.preventDefault();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

/**
 * Toggle aria-hidden on non-drawer siblings
 * @param {boolean} isInert
 */
function setBackgroundInert(isInert) {
  Array.from(document.body.children).forEach((child) => {
    if (
      child.tagName === "SCRIPT" ||
      child.tagName === "STYLE" ||
      child.hasAttribute("data-drawer")
    ) {
      return;
    }
    if (isInert) {
      child.setAttribute("aria-hidden", "true");
    } else {
      child.removeAttribute("aria-hidden");
    }
  });
}

/**
 * Open specific drawer by ID/name
 * @param {string} drawerId
 */
export function openDrawer(drawerId) {
  // Capture active element BEFORE closing drawers, but preserve original trigger if switching between drawers
  if (document.activeElement && typeof document.activeElement.focus === "function") {
    const isInsideActiveDrawer = document.activeElement.closest("[data-drawer].is-open");
    if (!isInsideActiveDrawer) {
      lastFocusedElement = document.activeElement;
    }
  }

  // Close any other open drawers first
  closeAllDrawers();

  const drawerEl = document.querySelector(`[data-drawer="${drawerId}"]`);
  if (!drawerEl) return;

  drawerEl.classList.add("is-open");
  drawerEl.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
  activeDrawers.add(drawerEl);
  setBackgroundInert(true);

  // Update triggers aria-expanded
  document.querySelectorAll(`[data-drawer-trigger="${drawerId}"]`).forEach((trigger) => {
    trigger.setAttribute("aria-expanded", "true");
  });

  // Focus initial element inside drawer panel
  setTimeout(() => {
    const focusable = drawerEl.querySelector(
      'input:not([type="hidden"]), button[data-drawer-close], a[href], [tabindex="0"]'
    );
    focusable?.focus();
  }, 100);
}

/**
 * Close specific drawer
 * @param {Element} drawerEl
 */
export function closeDrawer(drawerEl) {
  if (!drawerEl) return;

  const drawerId = drawerEl.getAttribute("data-drawer");
  drawerEl.classList.remove("is-open");
  drawerEl.setAttribute("aria-hidden", "true");
  activeDrawers.delete(drawerEl);

  if (activeDrawers.size === 0) {
    document.body.classList.remove("drawer-open");
    setBackgroundInert(false);
  }

  if (drawerId) {
    document.querySelectorAll(`[data-drawer-trigger="${drawerId}"]`).forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
    });
  }

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

/**
 * Close all active drawers
 */
export function closeAllDrawers() {
  document.querySelectorAll("[data-drawer].is-open").forEach((drawer) => {
    closeDrawer(drawer);
  });
}

/**
 * Global Helper: Pre-close drawers before SDK popups open
 */
window.zidCloseDrawersBeforePopup = function (popupOpenCallback) {
  closeAllDrawers();
  if (typeof popupOpenCallback === "function") {
    popupOpenCallback();
  }
};

function initDrawers() {
  // Bind Triggers
  document.querySelectorAll("[data-drawer-trigger]").forEach((trigger) => {
    if (initializedTriggers.has(trigger)) return;
    initializedTriggers.add(trigger);

    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = trigger.getAttribute("data-drawer-trigger");
      openDrawer(targetId);
    });
  });

  // Bind Close Buttons & Backdrops
  document.querySelectorAll("[data-drawer-close]").forEach((closeBtn) => {
    if (initializedTriggers.has(closeBtn)) return;
    initializedTriggers.add(closeBtn);

    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const drawerEl = closeBtn.closest("[data-drawer]");
      closeDrawer(drawerEl);
    });
  });

  // Bind Accessible Nav Menu Dropdown Toggle Buttons (Section E2)
  document.querySelectorAll("[data-menu-toggle]").forEach((toggleBtn) => {
    if (initializedTriggers.has(toggleBtn)) return;
    initializedTriggers.add(toggleBtn);

    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const isExpanded = toggleBtn.getAttribute("aria-expanded") === "true";
      toggleBtn.setAttribute("aria-expanded", isExpanded ? "false" : "true");
    });
  });

  // Attach keydown listener for Focus Trap & Escape key (once)
  if (!keydownListenerAttached) {
    keydownListenerAttached = true;
    document.addEventListener("keydown", (e) => {
      if (activeDrawers.size === 0) return;

      const currentDrawer = Array.from(activeDrawers)[activeDrawers.size - 1];

      if (e.key === "Escape") {
        closeAllDrawers();
      } else if (e.key === "Tab" && currentDrawer) {
        handleFocusTrap(e, currentDrawer);
      }
    });
  }
}

// Initialize on load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDrawers);
} else {
  initDrawers();
}

// Re-initialize on dynamic content loaded
listenEvent("content:loaded", initDrawers);
