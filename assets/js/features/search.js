import { listenEvent } from "../utils/events.js";

const initializedForms = new WeakSet();

function initSearch() {
  document.querySelectorAll(".search-drawer__form").forEach((form) => {
    if (initializedForms.has(form)) return;
    initializedForms.add(form);

    const input = form.querySelector("[data-search-input]");
    if (!input) return;

    form.addEventListener("submit", (e) => {
      if (!input.value.trim()) {
        e.preventDefault();
        input.focus();
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSearch);
} else {
  initSearch();
}

listenEvent("content:loaded", initSearch);
