import { waitForZid } from "../utils/zid.js";
import { listenEvent } from "../utils/events.js";

class WishlistManager {
  constructor() {
    this.wishlistProductIds = new Set();
    this.isLoggedIn = false;
    this.isInitialized = false;

    this.handleWishlistClick = this.handleWishlistClick.bind(this);
  }

  async initialize() {
    if (this.isInitialized) return;

    const ready = await waitForZid("account.wishlists");
    if (ready) {
      await this.syncWishlistState();
    } else {
      this.isLoggedIn = false;
      this.updateAllButtons();
    }

    document.addEventListener("click", this.handleWishlistClick);

    this.isInitialized = true;
  }

  async syncWishlistState() {
    if (!window.zid?.account?.wishlists) {
      this.isLoggedIn = false;
      this.updateAllButtons();
      return;
    }

    try {
      const response = await window.zid.account.wishlists();
      this.isLoggedIn = true;

      let productIds = [];
      if (response?.results && Array.isArray(response.results)) {
        productIds = response.results.map((item) => item.id);
      } else if (Array.isArray(response)) {
        productIds = response.map((item) => (typeof item === "object" ? item.id : item));
      }

      this.wishlistProductIds = new Set(productIds);
      this.updateAllButtons();
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        this.isLoggedIn = false;
      } else {
        console.error("[Wishlist] Sync error:", error);
      }
      this.updateAllButtons();
    }
  }

  handleWishlistClick(event) {
    const button = event.target.closest("[data-wishlist-btn]");
    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    const productId = button.getAttribute("data-product-id");
    if (!productId) return;

    if (!this.isLoggedIn) {
      this.triggerAuthPopup();
      return;
    }

    if (this.wishlistProductIds.has(productId)) {
      this.removeFromWishlist(productId);
    } else {
      this.addToWishlist(productId);
    }
  }

  triggerAuthPopup() {
    if (window.zidCloseDrawersBeforePopup) {
      window.zidCloseDrawersBeforePopup(() => {
        window.auth_dialog?.open();
      });
    } else {
      window.auth_dialog?.open();
    }
  }

  async addToWishlist(productId) {
    const button = this.getButton(productId);
    if (button) this.setButtonState(button, "loading");

    try {
      const response = await window.zid.account.addToWishlists(
        { product_ids: [productId] },
        { showErrorNotification: true }
      );
      if (response) {
        this.wishlistProductIds.add(productId);
        this.updateButtonsForProduct(productId, "filled");
      } else {
        this.updateButtonsForProduct(productId, "empty");
      }
    } catch (error) {
      console.error("[Wishlist] Add failed:", error);
      this.updateButtonsForProduct(productId, "empty");
    }
  }

  async removeFromWishlist(productId) {
    const button = this.getButton(productId);
    if (button) this.setButtonState(button, "loading");

    try {
      await window.zid.account.removeFromWishlist(productId, { showErrorNotification: true });
      this.wishlistProductIds.delete(productId);
      this.updateButtonsForProduct(productId, "empty");
    } catch (error) {
      console.error("[Wishlist] Remove failed:", error);
      this.updateButtonsForProduct(productId, "filled");
    }
  }

  updateButtonsForProduct(productId, state) {
    document
      .querySelectorAll(`[data-wishlist-btn][data-product-id="${productId}"]`)
      .forEach((btn) => {
        this.setButtonState(btn, state);
      });
  }

  updateAllButtons() {
    document.querySelectorAll("[data-wishlist-btn]").forEach((button) => {
      const productId = button.getAttribute("data-product-id");
      if (!productId) return;

      if (this.wishlistProductIds.has(productId)) {
        this.setButtonState(button, "filled");
      } else {
        this.setButtonState(button, "empty");
      }
    });
  }

  setButtonState(button, state) {
    const labelAdd = button.getAttribute("data-label-add") || "";
    const labelRemove = button.getAttribute("data-label-remove") || "";
    const labelLoading = button.getAttribute("data-label-loading") || "";

    switch (state) {
      case "empty":
        button.classList.remove("is-loading", "is-active");
        button.setAttribute("aria-label", labelAdd);
        button.setAttribute("aria-pressed", "false");
        button.disabled = false;
        break;
      case "filled":
        button.classList.remove("is-loading");
        button.classList.add("is-active");
        button.setAttribute("aria-label", labelRemove);
        button.setAttribute("aria-pressed", "true");
        button.disabled = false;
        break;
      case "loading":
        button.classList.add("is-loading");
        button.setAttribute("aria-label", labelLoading);
        button.disabled = true;
        break;
    }
  }

  getButton(productId) {
    return document.querySelector(`[data-wishlist-btn][data-product-id="${productId}"]`);
  }
}

const wishlistManager = new WishlistManager();
window.wishlistManager = wishlistManager;

export function initWishlist() {
  wishlistManager.initialize();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWishlist);
} else {
  initWishlist();
}

listenEvent("content:loaded", () => wishlistManager.updateAllButtons());

export { wishlistManager };
export default WishlistManager;
