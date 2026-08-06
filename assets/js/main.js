import { listenEvent } from "./utils/events.js";
import "./features/drawer.js";
import "./features/search.js";
import "./cart/badge.js";

/**
 * Main Theme Entry Point
 */
function initTheme() {
  // Theme initialization logic
}

// Initialize on DOM load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTheme);
} else {
  initTheme();
}

// Re-initialize on dynamic content injected
listenEvent("content:loaded", () => {
  // Dynamic content handler
});
