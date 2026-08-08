import { waitForZid } from "../utils/zid.js";
import { dispatchEvent, listenEvent } from "../utils/events.js";
import { dialogManager } from "./dialog.js";

let isInitialized = false;

function initCardAddToCart() {
  if (isInitialized) return;
  isInitialized = true;

  document.addEventListener("click", async (e) => {
    const addBtn = e.target.closest("[data-card-add]");
    if (!addBtn) return;

    const mode = addBtn.getAttribute("data-card-add");
    const productId = addBtn.getAttribute("data-product-id");
    if (!mode || mode === "none") return;

    const selectOptionsTitle = addBtn.getAttribute("data-label-select-options") || "";
    const closeLabel = addBtn.getAttribute("data-label-close") || "";
    const defaultErrorMsg = addBtn.getAttribute("data-label-error") || "";

    if (mode === "dialog") {
      e.preventDefault();
      const dm = window.dialogManager || dialogManager;
      if (dm) {
        dm.open("quick-options", { productId, title: selectOptionsTitle, closeLabel });
      }
      return;
    }

    if (!productId) return;
    e.preventDefault();

    if (addBtn.classList.contains("is-loading") || addBtn.disabled) return;

    const card = addBtn.closest("[data-product-card]");
    const errorEl = card?.querySelector(".product-card__error");
    if (errorEl) errorEl.textContent = "";

    addBtn.classList.add("is-loading");
    addBtn.disabled = true;

    try {
      await waitForZid("cart.addProduct");

      let targetProductId = productId;

      if (mode === "color") {
        const activeSwatch = card?.querySelector(
          ".product-card__swatch-dot.is-active, .product-card__swatch-dot[aria-current='true']"
        );
        const choiceVal = activeSwatch?.getAttribute("data-choice-value");
        const choiceId = activeSwatch?.getAttribute("data-choice-id");
        const optionId = activeSwatch?.closest("[data-option-id]")?.getAttribute("data-option-id");

        if (optionId && (choiceId || choiceVal)) {
          const attributes = { [optionId]: choiceId || choiceVal };
          try {
            await waitForZid("products.getProductOptions");
            const optRes = await window.zid.products.getProductOptions(productId, { attributes });

            const resolvedId =
              optRes?.selected_product?.id ||
              optRes?.id ||
              optRes?.product?.id ||
              optRes?.variant?.id;

            if (resolvedId) {
              targetProductId = resolvedId;
            } else {
              addBtn.classList.remove("is-loading");
              addBtn.disabled = false;
              const dm = window.dialogManager || dialogManager;
              if (dm) {
                dm.open("quick-options", { productId, title: selectOptionsTitle, closeLabel });
              }
              return;
            }
          } catch (optErr) {
            console.error("[CardATC] Option resolution failed, opening dialog:", optErr);
            addBtn.classList.remove("is-loading");
            addBtn.disabled = false;
            const dm = window.dialogManager || dialogManager;
            if (dm) {
              dm.open("quick-options", { productId, title: selectOptionsTitle, closeLabel });
            }
            return;
          }
        }
      }

      const response = await window.zid.cart.addProduct(
        { product_id: targetProductId, quantity: 1 },
        { showErrorNotification: true }
      );

      addBtn.classList.remove("is-loading");
      addBtn.classList.add("is-added");

      dispatchEvent("cart:updated", { response });

      setTimeout(() => {
        addBtn.classList.remove("is-added");
        addBtn.disabled = false;
      }, 1500);
    } catch (err) {
      addBtn.classList.remove("is-loading");
      addBtn.disabled = false;

      const errMsg = err?.message || defaultErrorMsg;
      if (errorEl) {
        errorEl.textContent = errMsg;
      }
      console.error("[CardATC] Add to cart failed:", err);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCardAddToCart);
} else {
  initCardAddToCart();
}

listenEvent("content:loaded", initCardAddToCart);
