import { listenEvent } from "../utils/events.js";

class DialogManager {
  constructor() {
    this.activeDialogs = new Set();
    this.lastFocusedElements = new Map();

    this.handleGlobalClick = this.handleGlobalClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    document.addEventListener("click", this.handleGlobalClick);
    document.addEventListener("keydown", this.handleKeyDown);
  }

  ensureDialogInDOM(id) {
    let dialogEl = document.querySelector(`dialog[data-dialog="${id}"], dialog#${id}`);
    if (dialogEl) return dialogEl;

    const closeLabel = document.documentElement.lang === "ar" ? "إغلاق النافذة" : "Close dialog";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <dialog id="${id}" class="dialog-shell" data-dialog="${id}" aria-labelledby="${id}-title" aria-hidden="true">
        <div class="dialog-shell__panel" role="document">
          <header class="dialog-shell__header">
            <h2 id="${id}-title" class="dialog-shell__title" data-dialog-title></h2>
            <button type="button" class="dialog-shell__close-btn" data-dialog-close aria-label="${closeLabel}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>
          <div class="dialog-shell__body" data-dialog-body>
            <div class="dialog-shell__state dialog-shell__state--loading" data-dialog-state="loading">
              <svg class="spinner-ring" viewBox="0 0 50 50"><circle class="spinner-ring__path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>
            </div>
            <div class="dialog-shell__state dialog-shell__state--error hidden" data-dialog-state="error">
              <p class="dialog-shell__error-text" data-dialog-error-text></p>
            </div>
            <div class="dialog-shell__state dialog-shell__state--content hidden" data-dialog-state="content"></div>
          </div>
        </div>
      </dialog>
    `;
    dialogEl = wrapper.firstElementChild;
    document.body.appendChild(dialogEl);

    // Idempotent native close event handling (C4)
    dialogEl.addEventListener("close", () => {
      this.handleDialogClosed(id);
    });

    return dialogEl;
  }

  open(id, opts = {}) {
    const dialogEl = this.ensureDialogInDOM(id);
    if (!dialogEl) return;

    if (document.activeElement && typeof document.activeElement.focus === "function") {
      this.lastFocusedElements.set(id, document.activeElement);
    }

    if (window.zidCloseDrawersBeforePopup) {
      window.zidCloseDrawersBeforePopup(() => {});
    }

    if (opts.title) {
      const titleEl = dialogEl.querySelector("[data-dialog-title]");
      if (titleEl) titleEl.textContent = opts.title;
    }

    this.setState(id, opts.state || "loading");

    if (opts.errorMsg) {
      this.setError(id, opts.errorMsg);
    }

    dialogEl.removeAttribute("aria-hidden");
    document.body.classList.add("dialog-open");

    if (typeof dialogEl.showModal === "function") {
      try {
        if (!dialogEl.open) dialogEl.showModal();
      } catch (e) {
        dialogEl.setAttribute("open", "");
      }
    } else {
      dialogEl.setAttribute("open", "");
    }

    this.activeDialogs.add(id);

    setTimeout(() => {
      const focusable = dialogEl.querySelector(
        'button[data-dialog-close], input:not([type="hidden"]), a[href], [tabindex="0"]'
      );
      focusable?.focus();
    }, 50);
  }

  close(id) {
    const dialogEl = document.querySelector(`dialog[data-dialog="${id}"], dialog#${id}`);
    if (!dialogEl) return;

    if (typeof dialogEl.close === "function" && dialogEl.open) {
      try {
        dialogEl.close();
      } catch (e) {
        dialogEl.removeAttribute("open");
        this.handleDialogClosed(id);
      }
    } else {
      dialogEl.removeAttribute("open");
      this.handleDialogClosed(id);
    }
  }

  handleDialogClosed(id) {
    const dialogEl = document.querySelector(`dialog[data-dialog="${id}"], dialog#${id}`);
    if (dialogEl) {
      dialogEl.setAttribute("aria-hidden", "true");
    }

    this.activeDialogs.delete(id);

    if (this.activeDialogs.size === 0) {
      document.body.classList.remove("dialog-open");
    }

    const lastTrigger = this.lastFocusedElements.get(id);
    if (lastTrigger && typeof lastTrigger.focus === "function") {
      lastTrigger.focus();
      this.lastFocusedElements.delete(id);
    }
  }

  setState(id, state) {
    const dialogEl = document.querySelector(`dialog[data-dialog="${id}"], dialog#${id}`);
    if (!dialogEl) return;

    dialogEl.querySelectorAll("[data-dialog-state]").forEach((stateEl) => {
      const currentState = stateEl.getAttribute("data-dialog-state");
      if (currentState === state) {
        stateEl.classList.remove("hidden");
      } else {
        stateEl.classList.add("hidden");
      }
    });
  }

  setContent(id, content) {
    const dialogEl = document.querySelector(`dialog[data-dialog="${id}"], dialog#${id}`);
    if (!dialogEl) return;

    const contentSlot = dialogEl.querySelector('[data-dialog-state="content"]');
    if (contentSlot) {
      if (typeof content === "string") {
        contentSlot.innerHTML = content;
      } else if (content instanceof Node) {
        contentSlot.innerHTML = "";
        contentSlot.appendChild(content);
      }
    }
    this.setState(id, "content");
  }

  setError(id, errorMsg) {
    const dialogEl = document.querySelector(`dialog[data-dialog="${id}"], dialog#${id}`);
    if (!dialogEl) return;

    const errTextEl = dialogEl.querySelector("[data-dialog-error-text]");
    if (errTextEl) errTextEl.textContent = errorMsg;
    this.setState(id, "error");
  }

  handleGlobalClick(e) {
    // Backdrop click-to-close on native <dialog> (C2)
    if (e.target.tagName === "DIALOG" && e.target.hasAttribute("open")) {
      const id = e.target.getAttribute("data-dialog") || e.target.id;
      this.close(id);
      return;
    }

    const openTrigger = e.target.closest("[data-dialog-open]");
    if (openTrigger) {
      e.preventDefault();
      const targetId = openTrigger.getAttribute("data-dialog-open");
      this.open(targetId);
      return;
    }

    const closeTrigger = e.target.closest("[data-dialog-close]");
    if (closeTrigger) {
      e.preventDefault();
      const dialogEl = closeTrigger.closest("dialog");
      if (dialogEl) {
        const id = dialogEl.getAttribute("data-dialog") || dialogEl.id;
        this.close(id);
      }
    }
  }

  handleKeyDown(e) {
    if (e.key === "Escape" && this.activeDialogs.size > 0) {
      const lastId = Array.from(this.activeDialogs).pop();
      this.close(lastId);
    }
  }
}

const dialogManager = new DialogManager();
window.dialogManager = dialogManager;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => dialogManager.init());
} else {
  dialogManager.init();
}

listenEvent("content:loaded", () => dialogManager.init());

export { dialogManager };
export default DialogManager;
