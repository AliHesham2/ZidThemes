import { dispatchEvent, listenEvent } from "../utils/events.js";
import { waitForZid } from "../utils/zid.js";

listenEvent("click", async (e) => {
  const addBtn = e.target.closest("[data-add-to-cart]");
  const buyBtn = e.target.closest("[data-buy-now]");

  if (!addBtn && !buyBtn) return;

  const btn = addBtn || buyBtn;
  const isBuyNow = !!buyBtn;
  const formId = btn.getAttribute("data-form-id") || btn.form?.id || btn.closest("form")?.id;

  if (!formId) return;

  e.preventDefault();

  if (btn.classList.contains("is-loading")) return;

  btn.classList.add("is-loading");
  btn.disabled = true;

  try {
    await waitForZid("cart.addProduct");

    let payload = { form_id: formId };
    if (window.bundleCartPayload) {
      payload = { ...window.bundleCartPayload, ...payload };
    }

    if (isBuyNow) {
      await window.zid.cart.buyNow(payload, { showErrorNotification: true });
    } else {
      const response = await window.zid.cart.addProduct(payload, { showErrorNotification: true });

      btn.classList.remove("is-loading");
      btn.classList.add("is-success");

      const label = btn.querySelector(".product-buy-buttons__label");
      const origText = label ? label.textContent : "";
      if (label) label.textContent = "✓";

      dispatchEvent("cart:updated", { response });

      setTimeout(() => {
        btn.classList.remove("is-success");
        if (label) label.textContent = origText;
        btn.disabled = false;
      }, 1500);
    }
  } catch (err) {
    btn.classList.remove("is-loading");
    btn.disabled = false;

    const form = document.getElementById(formId);
    if (form) {
      let errEl = form.querySelector(".form-error");
      if (!errEl) {
        errEl = document.createElement("div");
        errEl.className = "form-error text-[var(--color-error)] text-xs mt-2";
        form.appendChild(errEl);
      }
      errEl.textContent = btn.getAttribute("data-error-msg") || err?.message || "Error";
    }
  }
});
