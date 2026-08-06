import { listenEvent } from "../utils/events.js";

function initSearchForm() {
  const searchInput = document.querySelector("[data-search-input]");
  const searchForm = searchInput?.closest("form");

  if (!searchForm || !searchInput) return;

  searchForm.addEventListener("submit", (e) => {
    const query = searchInput.value.trim();
    if (!query) {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSearchForm);
} else {
  initSearchForm();
}

listenEvent("content:loaded", initSearchForm);
