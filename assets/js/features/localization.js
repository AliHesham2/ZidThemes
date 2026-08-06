import { listenEvent } from "../utils/events.js";
import { esc } from "../utils/escape.js";

async function waitForZid(maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    if (window.zid?.store?.region) return true;
    await new Promise((r) => setTimeout(r, 100 * Math.min(i + 1, 10)));
  }
  return false;
}

const initializedGroups = new WeakSet();
let globalClickListenerAttached = false;
let globalEscListenerAttached = false;

async function initLocalization() {
  const locGroup = document.querySelector("[data-localization-group]");
  if (!locGroup || initializedGroups.has(locGroup)) return;
  initializedGroups.add(locGroup);

  const ready = await waitForZid();
  if (!ready) return;

  try {
    const rawLanguages = await window.zid.store.region.languages();
    const rawCountries = await window.zid.store.region.countries();

    const languages = Array.isArray(rawLanguages) ? rawLanguages : [];
    const countries = Array.isArray(rawCountries) ? rawCountries : (rawCountries?.countries ?? []);

    setupLanguageSelector(locGroup, languages);
    setupCurrencySelector(locGroup, countries);
    attachGlobalListeners(locGroup);
  } catch (err) {
    console.error("[Localization] Failed to load region options:", err);
  }
}

function toggleDropdown(btn, dropdown, forceClose = false) {
  const isOpen = !dropdown.classList.contains("hidden") && !forceClose;

  // Close all localization dropdowns first
  document.querySelectorAll("[data-loc-dropdown]").forEach((dd) => dd.classList.add("hidden"));
  document
    .querySelectorAll("[data-loc-trigger]")
    .forEach((tr) => tr.setAttribute("aria-expanded", "false"));

  if (!isOpen && !forceClose) {
    dropdown.classList.remove("hidden");
    btn.setAttribute("aria-expanded", "true");
  }
}

function setupLanguageSelector(groupEl, languages) {
  const btn = groupEl.querySelector('[data-loc-trigger="language"]');
  const dropdown = groupEl.querySelector('[data-loc-dropdown="language"]');
  const listEl = groupEl.querySelector(".js-loc-language-list");
  const chevron = btn?.querySelector(".js-loc-chevron");

  if (!btn || !dropdown || !listEl) return;

  if (languages.length <= 1) {
    chevron?.classList.add("hidden");
    btn.setAttribute("tabindex", "-1");
    btn.classList.remove("hover:bg-secondary/40");
    btn.style.pointerEvents = "none";
    dropdown.classList.add("hidden");
    return;
  }

  chevron?.classList.remove("hidden");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown(btn, dropdown);
  });

  const currentLang =
    btn.getAttribute("data-current-lang") || document.documentElement.lang || "ar";

  listEl.innerHTML = languages
    .map((lang) => {
      const code = lang.code || lang.id || "ar";
      const isCurrent = code === currentLang;
      return `
      <button
        type="button"
        class="w-full text-start px-2 py-1 text-xs rounded hover:bg-secondary/40 transition-colors flex items-center justify-between ${
          isCurrent ? "font-bold text-primary" : "text-foreground"
        }"
        data-lang-code="${esc(code)}"
        ${isCurrent ? 'aria-current="true"' : ""}
      >
        <span>${esc(lang.name || code.toUpperCase())}</span>
        ${isCurrent ? '<span class="text-xs">✓</span>' : ""}
      </button>
    `;
    })
    .join("");

  listEl.querySelectorAll("[data-lang-code]").forEach((itemBtn) => {
    itemBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const selectedCode = itemBtn.getAttribute("data-lang-code");
      try {
        await window.zid.store.region.setRegion({ language: selectedCode });
        window.location.reload();
      } catch (err) {
        console.error("[Localization] setRegion language failed:", err);
      }
    });
  });
}

function setupCurrencySelector(groupEl, countries) {
  const btn = groupEl.querySelector('[data-loc-trigger="currency"]');
  const dropdown = groupEl.querySelector('[data-loc-dropdown="currency"]');
  const listEl = groupEl.querySelector(".js-loc-currency-list");
  const chevron = btn?.querySelector(".js-loc-chevron");

  if (!btn || !dropdown || !listEl) return;

  const currenciesMap = new Map();
  countries.forEach((c) => {
    const code = c.currency_code || c.code;
    if (code && !currenciesMap.has(code)) {
      currenciesMap.set(code, {
        code,
        countryCode: c.code || c.iso_code_2,
        name: c.name || code,
        symbol: c.currency_symbol || c.symbol || code
      });
    }
  });

  const currencies = Array.from(currenciesMap.values());

  if (currencies.length <= 1) {
    chevron?.classList.add("hidden");
    btn.setAttribute("tabindex", "-1");
    btn.classList.remove("hover:bg-secondary/40");
    btn.style.pointerEvents = "none";
    dropdown.classList.add("hidden");
    return;
  }

  chevron?.classList.remove("hidden");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDropdown(btn, dropdown);
  });

  const currentCode = btn.getAttribute("data-current-currency") || "SAR";

  listEl.innerHTML = currencies
    .map((curr) => {
      const isCurrent = curr.code === currentCode;
      return `
      <button
        type="button"
        class="w-full text-start px-2 py-1 text-xs rounded hover:bg-secondary/40 transition-colors flex items-center justify-between ${
          isCurrent ? "font-bold text-primary" : "text-foreground"
        }"
        data-country-code="${esc(curr.countryCode)}"
        ${isCurrent ? 'aria-current="true"' : ""}
      >
        <span>${esc(curr.symbol)} ${esc(curr.code)}</span>
        ${isCurrent ? '<span class="text-xs">✓</span>' : ""}
      </button>
    `;
    })
    .join("");

  listEl.querySelectorAll("[data-country-code]").forEach((itemBtn) => {
    itemBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const countryCode = itemBtn.getAttribute("data-country-code");
      try {
        await window.zid.store.region.setRegion({ country_code: countryCode });
        window.location.reload();
      } catch (err) {
        console.error("[Localization] setRegion currency failed:", err);
      }
    });
  });
}

function attachGlobalListeners(groupEl) {
  if (!globalClickListenerAttached) {
    globalClickListenerAttached = true;
    document.addEventListener("click", (e) => {
      if (!e.target.closest("[data-localization-group]")) {
        document
          .querySelectorAll("[data-loc-dropdown]")
          .forEach((dd) => dd.classList.add("hidden"));
        document
          .querySelectorAll("[data-loc-trigger]")
          .forEach((tr) => tr.setAttribute("aria-expanded", "false"));
      }
    });
  }

  if (!globalEscListenerAttached) {
    globalEscListenerAttached = true;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const openDropdown = document.querySelector("[data-loc-dropdown]:not(.hidden)");
        if (openDropdown) {
          const wrapper = openDropdown.closest(
            "[data-loc-currency-wrapper], [data-loc-language-wrapper]"
          );
          const triggerBtn = wrapper?.querySelector("[data-loc-trigger]");
          openDropdown.classList.add("hidden");
          triggerBtn?.setAttribute("aria-expanded", "false");
          triggerBtn?.focus();
        }
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLocalization);
} else {
  initLocalization();
}

listenEvent("content:loaded", initLocalization);
