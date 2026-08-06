import { listenEvent } from "../utils/events.js";

const initializedTriggers = new WeakSet();

function initAuthTriggers() {
  document.querySelectorAll("[data-account-trigger]").forEach((trigger) => {
    if (initializedTriggers.has(trigger)) return;
    initializedTriggers.add(trigger);

    trigger.addEventListener("click", (e) => {
      // If customer is already authenticated, allow native link to /profile
      if (window.customerAuthState?.isAuthenticated) {
        return;
      }

      // Guest customer -> Intercept & open SDK auth popup
      e.preventDefault();

      if (window.zidCloseDrawersBeforePopup) {
        window.zidCloseDrawersBeforePopup(() => {
          window.auth_dialog?.open();
        });
      } else {
        window.auth_dialog?.open();
      }
    });
  });
}

// Listen for platform authentication success event
window.addEventListener("vitrin:auth:success", () => {
  if (window.customerAuthState) {
    window.customerAuthState.isAuthenticated = true;
    window.customerAuthState.isGuest = false;
  }
  window.location.reload();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthTriggers);
} else {
  initAuthTriggers();
}

listenEvent("content:loaded", initAuthTriggers);
