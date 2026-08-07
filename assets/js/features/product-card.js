import { listenEvent } from "../utils/events.js";

let isInitialized = false;
let isRTL = false;

function updateDirection() {
  isRTL =
    document.documentElement.dir === "rtl" ||
    getComputedStyle(document.documentElement).direction === "rtl";
}

export function initProductCards() {
  updateDirection();
  if (isInitialized) return;
  isInitialized = true;

  document.addEventListener("click", (e) => {
    const prevBtn = e.target.closest("[data-carousel-prev]");
    const nextBtn = e.target.closest("[data-carousel-next]");
    const dotBtn = e.target.closest("[data-carousel-dot]");

    if (prevBtn) {
      const card = prevBtn.closest("[data-product-card]");
      const track = card?.querySelector("[data-carousel-track]");
      if (track) {
        const slideWidth = track.clientWidth;
        track.scrollBy({ left: isRTL ? slideWidth : -slideWidth, behavior: "smooth" });
      }
      return;
    }

    if (nextBtn) {
      const card = nextBtn.closest("[data-product-card]");
      const track = card?.querySelector("[data-carousel-track]");
      if (track) {
        const slideWidth = track.clientWidth;
        track.scrollBy({ left: isRTL ? -slideWidth : slideWidth, behavior: "smooth" });
      }
      return;
    }

    if (dotBtn) {
      const card = dotBtn.closest("[data-product-card]");
      const track = card?.querySelector("[data-carousel-track]");
      const targetIndex = parseInt(dotBtn.getAttribute("data-carousel-dot"), 10);
      if (track && !isNaN(targetIndex)) {
        const slides = track.querySelectorAll(".product-card__carousel-slide");
        if (slides[targetIndex]) {
          slides[targetIndex].scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "start"
          });
        }
      }
    }
  });

  document.addEventListener(
    "scroll",
    (e) => {
      const track = e.target;
      if (!track || !track.matches || !track.matches("[data-carousel-track]")) return;

      const card = track.closest("[data-product-card]");
      if (!card) return;

      const slides = track.querySelectorAll(".product-card__carousel-slide");
      const dots = card.querySelectorAll("[data-carousel-dot]");
      const slideWidth = track.clientWidth;
      if (!slideWidth || slides.length === 0) return;

      const scrollLeft = Math.abs(track.scrollLeft);
      const activeIndex = Math.round(scrollLeft / slideWidth);

      dots.forEach((dot, idx) => {
        if (idx === activeIndex) {
          dot.setAttribute("aria-current", "true");
        } else {
          dot.removeAttribute("aria-current");
        }
      });

      const prevBtn = card.querySelector("[data-carousel-prev]");
      const nextBtn = card.querySelector("[data-carousel-next]");
      if (prevBtn) prevBtn.disabled = activeIndex <= 0;
      if (nextBtn) nextBtn.disabled = activeIndex >= slides.length - 1;
    },
    { capture: true, passive: true }
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProductCards);
} else {
  initProductCards();
}

listenEvent("content:loaded", () => {
  updateDirection();
  initProductCards();
});
