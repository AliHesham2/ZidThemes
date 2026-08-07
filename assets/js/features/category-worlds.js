import { listenEvent } from "../utils/events.js";

const initializedGrids = new WeakSet();
const initializedSliders = new WeakSet();

export function initCategoryWorlds() {
  initTilt();
  initSliders();
}

function initTilt() {
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

function initSliders() {
  const wrappers = document.querySelectorAll("[data-category-slider]");

  wrappers.forEach((wrapper) => {
    if (initializedSliders.has(wrapper)) return;
    initializedSliders.add(wrapper);

    const track = wrapper.querySelector(".category-worlds__grid");
    const prevBtn = wrapper.querySelector("[data-slider-prev]");
    const nextBtn = wrapper.querySelector("[data-slider-next]");

    if (!track || !prevBtn || !nextBtn) return;

    let scrollRaf = null;

    const updateControls = () => {
      scrollRaf = null;
      const isRTL = getComputedStyle(track).direction === "rtl";
      const scrollLeft = track.scrollLeft;
      const maxScroll = track.scrollWidth - track.clientWidth;

      let isAtStart = false;
      let isAtEnd = false;

      if (isRTL) {
        const absScroll = Math.abs(scrollLeft);
        isAtStart = absScroll <= 5;
        isAtEnd = absScroll >= maxScroll - 5;
      } else {
        isAtStart = scrollLeft <= 5;
        isAtEnd = scrollLeft >= maxScroll - 5;
      }

      setButtonState(prevBtn, isAtStart);
      setButtonState(nextBtn, isAtEnd);
    };

    const getStepWidth = () => {
      const firstCard = track.querySelector(".category-worlds__card-wrapper");
      if (!firstCard) return track.clientWidth * 0.8;
      const cardWidth = firstCard.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(track).gap) || 16;
      return cardWidth + gap;
    };

    prevBtn.addEventListener("click", () => {
      const isRTL = getComputedStyle(track).direction === "rtl";
      const step = getStepWidth();
      track.scrollBy({ left: isRTL ? step : -step, behavior: "smooth" });
    });

    nextBtn.addEventListener("click", () => {
      const isRTL = getComputedStyle(track).direction === "rtl";
      const step = getStepWidth();
      track.scrollBy({ left: isRTL ? -step : step, behavior: "smooth" });
    });

    const onScrollOrResize = () => {
      if (!scrollRaf) {
        scrollRaf = requestAnimationFrame(updateControls);
      }
    };

    track.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });

    updateControls();
  });
}

function setButtonState(btn, disabled) {
  if (!btn) return;
  btn.disabled = disabled;
  if (disabled) {
    btn.setAttribute("aria-disabled", "true");
    btn.classList.add("is-disabled");
  } else {
    btn.removeAttribute("aria-disabled");
    btn.classList.remove("is-disabled");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCategoryWorlds);
} else {
  initCategoryWorlds();
}

listenEvent("content:loaded", () => {
  initCategoryWorlds();
});
