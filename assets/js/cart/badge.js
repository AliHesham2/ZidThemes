import { listenEvent, notifyContentLoaded } from "../utils/events.js";
import { esc } from "../utils/escape.js";

/**
 * Wait for Zid SDK readiness helper
 */

const initializedTriggers = new WeakSet();

/**
 * Live Cart Drawer & Cart Badge Manager
 */
export class CartManager {
  constructor() {
    this.cart = null;
    this.init();
  }

  async init() {
    const ready = await waitForZid();
    if (!ready) return;

    this.bindTriggers();

    // Listen for custom cart update events
    listenEvent("cart:updated", () => {
      this.fetchAndRenderCart();
    });

    // Initial silent sync
    this.syncCartBadge();
  }

  bindTriggers() {
    document.querySelectorAll('[data-drawer-trigger="cart"]').forEach((trigger) => {
      if (initializedTriggers.has(trigger)) return;
      initializedTriggers.add(trigger);

      trigger.addEventListener("click", () => {
        this.fetchAndRenderCart().then(() => {
          if (this.cart && window.zidTracking?.sendGaCartDetailViewedEvent) {
            window.zidTracking.sendGaCartDetailViewedEvent({ cart: this.cart });
          }
        });
      });
    });
  }

  async fetchAndRenderCart() {
    if (!window.zid?.cart?.get) return;

    try {
      const cart = await window.zid.cart.get();
      if (cart) {
        this.cart = cart;
        this.renderCart();
      }
    } catch (err) {
      console.error("[Cart] Failed to fetch cart:", err);
    }
  }

  async syncCartBadge() {
    if (!window.zid?.cart?.get) return;
    try {
      const cart = await window.zid.cart.get();
      if (cart) {
        this.cart = cart;
        const count = cart.cart_items_quantity ?? cart.products_count ?? 0;
        this.updateBadgeCount(count);
      }
    } catch (err) {
      // Silent catch on initial sync
    }
  }

  updateBadgeCount(count) {
    document.querySelectorAll(".js-cart-count-badge").forEach((el) => {
      el.textContent = count;
      if (count > 0) {
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    });
  }

  renderCart() {
    if (!this.cart) return;

    const count = this.cart.cart_items_quantity ?? this.cart.products_count ?? 0;
    this.updateBadgeCount(count);

    const itemsContainer = document.querySelector(".cart-drawer__items");
    const emptyContainer = document.querySelector(".cart-drawer__empty");
    const totalsListEl = document.querySelector(".cart-drawer__totals-list");
    const footerEl = document.querySelector(".cart-drawer__footer");

    if (!itemsContainer) return;

    const products = this.cart.products || [];

    if (products.length === 0) {
      itemsContainer.innerHTML = "";
      emptyContainer?.classList.remove("hidden");
      footerEl?.classList.add("opacity-50", "pointer-events-none");
      if (totalsListEl) totalsListEl.innerHTML = "";
      return;
    }

    emptyContainer?.classList.add("hidden");
    footerEl?.classList.remove("opacity-50", "pointer-events-none");

    // Render totals list from cart.totals array
    if (totalsListEl && Array.isArray(this.cart.totals)) {
      totalsListEl.innerHTML = this.cart.totals
        .map(
          (total) => `
        <div class="flex items-center justify-between py-1 border-b border-border/30 last:border-0 font-medium">
          <span>${esc(total.title)}</span>
          <span class="text-primary font-bold">${esc(total.value_string)}</span>
        </div>
      `
        )
        .join("");
    }

    // Render cart items with safe DOM escaping and 44px hit targets
    itemsContainer.innerHTML = products
      .map((item) => {
        const itemImage = item.images?.[0]?.origin || item.product?.images?.[0]?.origin || "";
        const formattedPrice = item.formatted_price || item.price_string || "";
        const safeName = esc(item.name);
        return `
        <div class="cart-drawer__item flex items-center gap-3 p-3 bg-surface border border-border rounded-md" data-line-id="${esc(item.id)}">
          ${
            itemImage
              ? `<img src="${esc(itemImage)}" alt="${safeName}" class="w-16 h-16 object-contain rounded border border-border/50 shrink-0" />`
              : `<div class="w-16 h-16 bg-secondary/30 rounded flex items-center justify-center text-muted shrink-0 text-xs">No Image</div>`
          }
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-medium text-foreground truncate m-0">${safeName}</h4>
            <p class="text-xs text-primary font-bold mt-1 m-0">${esc(formattedPrice)}</p>
            <div class="flex items-center gap-1 mt-2">
              <button type="button" class="js-qty-decrease min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-foreground hover:text-primary border border-border rounded font-bold" aria-label="Decrease quantity">-</button>
              <span class="text-sm font-bold px-2">${item.quantity}</span>
              <button type="button" class="js-qty-increase min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-foreground hover:text-primary border border-border rounded font-bold" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <button type="button" class="js-item-remove p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-muted hover:text-error rounded-md" aria-label="Remove item">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      `;
      })
      .join("");

    this.bindItemActions(itemsContainer);
  }

  bindItemActions(container) {
    container.querySelectorAll(".cart-drawer__item").forEach((itemEl) => {
      const lineId = itemEl.getAttribute("data-line-id");
      const itemData = this.cart.products.find((p) => String(p.id) === String(lineId));
      if (!itemData) return;

      const currentQty = itemData.quantity;

      itemEl.querySelector(".js-qty-decrease")?.addEventListener("click", async () => {
        if (currentQty <= 1) {
          await this.removeItem(lineId);
        } else {
          await this.updateQuantity(lineId, currentQty - 1);
        }
      });

      itemEl.querySelector(".js-qty-increase")?.addEventListener("click", async () => {
        await this.updateQuantity(lineId, currentQty + 1);
      });

      itemEl.querySelector(".js-item-remove")?.addEventListener("click", async () => {
        await this.removeItem(lineId);
      });
    });
  }

  async updateQuantity(cartProductId, newQty) {
    if (!window.zid?.cart?.updateProduct) return;
    try {
      await window.zid.cart.updateProduct(
        { product_id: cartProductId, quantity: newQty },
        { showErrorNotification: true }
      );
      await this.fetchAndRenderCart();
      notifyContentLoaded();
    } catch (err) {
      console.error("[Cart] Update error:", err);
    }
  }

  async removeItem(cartProductId) {
    if (!window.zid?.cart?.removeProduct) return;
    try {
      await window.zid.cart.removeProduct(
        { product_id: cartProductId },
        { showErrorNotification: true }
      );
      await this.fetchAndRenderCart();
      notifyContentLoaded();
    } catch (err) {
      console.error("[Cart] Remove error:", err);
    }
  }
}

let cartManagerInstance = null;

function initCartManager() {
  if (!cartManagerInstance) {
    cartManagerInstance = new CartManager();
  } else {
    cartManagerInstance.bindTriggers();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCartManager);
} else {
  initCartManager();
}

listenEvent("content:loaded", initCartManager);
