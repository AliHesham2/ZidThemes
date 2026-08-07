import { listenEvent } from "../utils/events.js";
import { waitForZid } from "../utils/zid.js";

async function initNewsletter() {
  const sections = document.querySelectorAll("[data-newsletter]");
  if (sections.length === 0) return;

  for (const sec of sections) {
    const form = sec.querySelector("[data-newsletter-form]");
    const input = sec.querySelector("[data-newsletter-input]");
    const submitBtn = sec.querySelector("[data-newsletter-submit]");
    const vipBox = sec.querySelector("[data-newsletter-vip]");
    const succBox = sec.querySelector("[data-newsletter-success]");
    const errBox = sec.querySelector("[data-newsletter-error]");

    if (!form || form.hasAttribute("data-newsletter-bound")) continue;
    form.setAttribute("data-newsletter-bound", "true");

    let account = null;
    try {
      await waitForZid("account.get");
      account = await window.zid.account.get();
    } catch (e) {
      account = null;
    }

    const isAuthenticated = window.customerAuthState?.isAuthenticated || (account && account.email);
    const isSubscribed = account && (account.is_newsletter_subscriber || account.is_subscribed);

    if (isSubscribed) {
      form.classList.add("hidden");
      if (vipBox) vipBox.classList.remove("hidden");
      continue;
    }

    if (isAuthenticated && account) {
      if (input) {
        input.value = account.email || "";
        input.readOnly = true;
      }

      const pendingIntent = sessionStorage.getItem("mv:newsletter-intent");
      if (pendingIntent === "1") {
        sessionStorage.removeItem("mv:newsletter-intent");
        performSubscribe(account, form, submitBtn, succBox, errBox);
      }
    } else {
      sessionStorage.removeItem("mv:newsletter-intent");
    }

    listenEvent(
      "submit",
      async (e) => {
        e.preventDefault();

        if (errBox) {
          errBox.textContent = "";
          errBox.classList.add("hidden");
        }

        let currentAcct = null;
        let sdkAvailable = true;
        try {
          await waitForZid("account.get");
          currentAcct = await window.zid.account.get();
        } catch (err) {
          currentAcct = null;
          sdkAvailable = false;
        }

        if (!sdkAvailable) {
          if (errBox) {
            const msg =
              form.getAttribute("data-msg-unavailable") || "Newsletter service unavailable.";
            errBox.textContent = msg;
            errBox.classList.remove("hidden");
          }
          return;
        }

        const authed =
          window.customerAuthState?.isAuthenticated || (currentAcct && currentAcct.email);

        if (!authed) {
          sessionStorage.setItem("mv:newsletter-intent", "1");

          const openAuth = () => {
            if (window.auth_dialog?.open) {
              window.auth_dialog.open();
            } else {
              window.location.href = form.action || "/account/login";
            }
          };

          if (window.zidCloseDrawersBeforePopup) {
            window.zidCloseDrawersBeforePopup(openAuth);
          } else {
            openAuth();
          }
        } else {
          performSubscribe(currentAcct, form, submitBtn, succBox, errBox);
        }
      },
      form
    );
  }
}

async function performSubscribe(account, form, submitBtn, succBox, errBox) {
  if (!account || !submitBtn) return;

  submitBtn.classList.add("is-loading");
  submitBtn.disabled = true;

  try {
    await window.zid.account.update(
      {
        name: account.name,
        email: account.email,
        is_newsletter_subscriber: true,
        gender: account.gender ?? null,
        birth_date: account.birth_date ?? null
      },
      { showErrorNotification: true }
    );

    submitBtn.classList.remove("is-loading");
    form.classList.add("hidden");
    if (succBox) succBox.classList.remove("hidden");
  } catch (err) {
    submitBtn.classList.remove("is-loading");
    submitBtn.disabled = false;
    if (errBox) {
      const msg =
        form.getAttribute("data-msg-failed") || err?.message || "Failed to update subscription.";
      errBox.textContent = msg;
      errBox.classList.remove("hidden");
    }
  }
}

if (document.readyState === "loading") {
  listenEvent("DOMContentLoaded", initNewsletter);
} else {
  initNewsletter();
}

listenEvent("content:loaded", initNewsletter);
