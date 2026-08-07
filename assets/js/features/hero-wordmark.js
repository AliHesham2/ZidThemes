import { listenEvent } from "../utils/events.js";

export function initHeroWordmark() {
  const heroes = document.querySelectorAll(".hero-morph");

  heroes.forEach((hero) => {
    const svg = hero.querySelector("svg");
    const textEl = hero.querySelector(".hi-brand-name");

    if (!svg || !textEl || typeof textEl.getComputedTextLength !== "function") {
      return;
    }

    const updateShift = () => {
      try {
        const width = textEl.getComputedTextLength();
        if (!width || width <= 0) return;

        const requiredGap = width + 28;
        const clampedGap = Math.min(400, Math.max(198.1, requiredGap));
        const shift = (clampedGap - 198.1) / 2;

        svg.style.setProperty("--leaf-shift", shift.toFixed(2));
      } catch {}
    };

    updateShift();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(updateShift).catch(() => {});
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initHeroWordmark);
} else {
  initHeroWordmark();
}

listenEvent("content:loaded", initHeroWordmark);
