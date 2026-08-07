import { listenEvent } from "../utils/events.js";
import { waitForZid } from "../utils/zid.js";

/**
 * Currency + language picker.
 *
 * The option lists are rendered server-side from `store.countries` /
 * `store.languages` (see components/layout/localization_selector.jinja), so
 * there is nothing to fetch and nothing to wait for. This module only opens
 * and closes the panels and calls setRegion on selection.
 *
 * Previously this fetched the lists via `zid.store.region.*` on load, which
 * gave the control three separate ways to silently do nothing: the SDK not
 * being ready yet, an unexpected response shape, and a WeakSet guard that
 * blocked retries. Rendering server-side removes all three.
 */

const initializedTriggers = new WeakSet();

/**
 * 🚨 setRegion requires BOTH `language` and `country_code` on every call —
 * `city_id` is the only optional one. Sending just the field being changed
 * makes the call fail and the click appear to do nothing. So we always merge
 * the change over the current state.
 * @param {{language?: string, country_code?: string}} change
 */
async function applyRegion(change) {
  const group = document.querySelector("[data-localization-group]");
  const payload = {
    language: change.language || group?.getAttribute("data-current-lang"),
    country_code: change.country_code || group?.getAttribute("data-current-country")
  };

  if (!payload.language || !payload.country_code) {
    console.error("[Localization] Missing language or country_code:", payload);
    window.zidOpenRegionSettingDialog?.();
    return;
  }

  // The SDK may still be loading when the user clicks.
  const ready = await waitForZid("store.region.setRegion");
  if (!ready) {
    // The picker is a real control; if the SDK never arrives, hand off to the
    // platform dialog rather than doing nothing.
    window.zidOpenRegionSettingDialog?.();
    return;
  }

  try {
    await window.zid.store.region.setRegion(payload);
    window.location.reload();
  } catch (err) {
    console.error("[Localization] setRegion failed:", payload, err);
    // Never leave the click looking like it did nothing.
    window.zidOpenRegionSettingDialog?.();
  }
}

function initLocalization() {
  document.querySelectorAll("[data-loc-trigger]").forEach((btn) => {
    if (initializedTriggers.has(btn)) return;

    const wrapper = btn.closest("[data-loc-currency-wrapper], [data-loc-language-wrapper]");
    const dropdown = wrapper?.querySelector("[data-loc-dropdown]");
    // No dropdown means a single option — the button is inert by design.
    if (!dropdown) return;

    initializedTriggers.add(btn);

    // Visibility is owned by CSS (:hover / :focus-within on .hdr-loc-wrapper,
    // the same mechanism the nav dropdown uses). These listeners only mirror
    // that state into aria-expanded, which CSS cannot set.
    // Deferred so `focusout` doesn't read activeElement before it has moved.
    const syncExpanded = () =>
      queueMicrotask(() => {
        const open = wrapper.matches(":hover") || wrapper.contains(document.activeElement);
        btn.setAttribute("aria-expanded", String(open));
      });
    ["mouseenter", "mouseleave", "focusin", "focusout"].forEach((evt) =>
      wrapper.addEventListener(evt, syncExpanded)
    );

    dropdown.querySelectorAll("[data-lang-code]").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        applyRegion({ language: item.getAttribute("data-lang-code") });
      });
    });

    dropdown.querySelectorAll("[data-country-code]").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        applyRegion({ country_code: item.getAttribute("data-country-code") });
      });
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLocalization);
} else {
  initLocalization();
}

listenEvent("content:loaded", initLocalization);
