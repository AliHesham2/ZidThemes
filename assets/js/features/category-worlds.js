import { listenEvent } from "../utils/events.js";

const initializedGrids = new WeakSet();

export function initCategoryWorlds() {
  const isFinePointer =
    window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!isFinePointer || isReducedMotion) return;

  const grids = document.querySelectorAll(".category-worlds__grid");

  grids.forEach((grid) => {
    if (initializedGrids.has(grid)) return;
    initializedGrids.add(grid);

    let activeCard = null;
    let rafId = null;
    let pendingX = 0;
    let pendingY = 0;

    const updateTilt = () => {
      rafId = null;
      if (!activeCard) return;

      const rect = activeCard.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = pendingX - rect.left;
      const y = pendingY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = -((y - centerY) / centerY) * 14;
      const rotateY = ((x - centerX) / centerX) * 14;

      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;

      activeCard.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
      activeCard.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
      activeCard.style.setProperty("--tilt-z", "14px");
      activeCard.style.setProperty("--glare-x", `${glareX.toFixed(2)}%`);
      activeCard.style.setProperty("--glare-y", `${glareY.toFixed(2)}%`);
      activeCard.style.setProperty("--glare-o", "1");
    };

    grid.addEventListener("pointermove", (e) => {
      const card = e.target.closest(".category-worlds__card");
      if (!card) {
        if (activeCard) {
          resetCard(activeCard);
          activeCard = null;
        }
        return;
      }

      if (activeCard && activeCard !== card) {
        resetCard(activeCard);
      }

      activeCard = card;
      pendingX = e.clientX;
      pendingY = e.clientY;

      if (!rafId) {
        rafId = requestAnimationFrame(updateTilt);
      }
    });

    grid.addEventListener("pointerleave", () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (activeCard) {
        resetCard(activeCard);
        activeCard = null;
      }
    });
  });
}

function resetCard(card) {
  if (!card) return;
  card.style.removeProperty("--tilt-x");
  card.style.removeProperty("--tilt-y");
  card.style.removeProperty("--tilt-z");
  card.style.removeProperty("--glare-x");
  card.style.removeProperty("--glare-y");
  card.style.removeProperty("--glare-o");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCategoryWorlds);
} else {
  initCategoryWorlds();
}

listenEvent("content:loaded", () => {
  initCategoryWorlds();
});
