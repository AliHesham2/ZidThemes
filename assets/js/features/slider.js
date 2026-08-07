import { listenEvent } from "../utils/events.js";

function initSliders() {
  const sliders = document.querySelectorAll("[data-slider]");

  sliders.forEach((slider) => {
    if (slider.hasAttribute("data-slider-initialized")) return;
    slider.setAttribute("data-slider-initialized", "true");

    const track = slider.querySelector("[data-slider-track]");
    const prevBtn = slider.querySelector("[data-slider-prev]");
    const nextBtn = slider.querySelector("[data-slider-next]");
    const controls = slider.querySelector("[data-slider-controls]");

    if (!track) return;

    function getScrollStep() {
      const firstItem = track.querySelector(".slider__item") || track.firstElementChild;
      if (!firstItem) return track.clientWidth * 0.8;
      const style = window.getComputedStyle(track);
      const gap = parseFloat(style.gap || style.columnGap || "0");
      return firstItem.offsetWidth + gap;
    }

    function isRTL() {
      return (
        document.documentElement.dir === "rtl" ||
        window.getComputedStyle(document.documentElement).direction === "rtl"
      );
    }

    function updateControls() {
      const maxScroll = track.scrollWidth - track.clientWidth;

      if (maxScroll <= 2) {
        if (controls) controls.classList.add("slider__controls--hidden");
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
      }

      if (controls) controls.classList.remove("slider__controls--hidden");

      const currentScroll = Math.abs(track.scrollLeft);

      if (prevBtn) {
        prevBtn.disabled = currentScroll <= 2;
      }
      if (nextBtn) {
        nextBtn.disabled = currentScroll >= maxScroll - 2;
      }
    }

    let ticking = false;
    listenEvent(
      "scroll",
      () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            updateControls();
            ticking = false;
          });
          ticking = true;
        }
      },
      track
    );

    listenEvent("resize", updateControls, window);

    if (prevBtn) {
      listenEvent(
        "click",
        () => {
          const step = getScrollStep();
          const dir = isRTL() ? 1 : -1;
          track.scrollBy({ left: step * dir, behavior: "smooth" });
        },
        prevBtn
      );
    }

    if (nextBtn) {
      listenEvent(
        "click",
        () => {
          const step = getScrollStep();
          const dir = isRTL() ? -1 : 1;
          track.scrollBy({ left: step * dir, behavior: "smooth" });
        },
        nextBtn
      );
    }

    track.tabIndex = 0;
    listenEvent(
      "keydown",
      (e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          const step = getScrollStep();
          track.scrollBy({ left: -step, behavior: "smooth" });
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          const step = getScrollStep();
          track.scrollBy({ left: step, behavior: "smooth" });
        }
      },
      track
    );

    updateControls();
  });
}

if (document.readyState === "loading") {
  listenEvent("DOMContentLoaded", initSliders);
} else {
  initSliders();
}

listenEvent("content:loaded", initSliders);
