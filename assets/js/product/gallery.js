import { listenEvent } from "../utils/events.js";

function initGalleries() {
  const galleries = document.querySelectorAll("[data-product-gallery]");

  galleries.forEach((gallery) => {
    if (gallery.hasAttribute("data-gallery-initialized")) return;
    gallery.setAttribute("data-gallery-initialized", "true");

    const thumbs = gallery.querySelectorAll("[data-gallery-thumb]");
    const slides = gallery.querySelectorAll("[data-gallery-slide]");

    if (thumbs.length === 0 || slides.length === 0) return;

    function activateSlide(index) {
      thumbs.forEach((t, idx) => {
        const isCurrent = idx === index;
        t.classList.toggle("is-active", isCurrent);
        t.classList.toggle("border-[var(--color-primary)]", isCurrent);
        t.classList.toggle("border-transparent", !isCurrent);
        t.setAttribute("aria-selected", isCurrent ? "true" : "false");
      });

      slides.forEach((s, idx) => {
        const isCurrent = idx === index;
        s.classList.toggle("opacity-100", isCurrent);
        s.classList.toggle("z-10", isCurrent);
        s.classList.toggle("opacity-0", !isCurrent);
        s.classList.toggle("pointer-events-none", !isCurrent);

        const video = s.querySelector("video");
        if (video && !isCurrent) {
          video.pause();
        }
      });
    }

    thumbs.forEach((thumb) => {
      listenEvent(
        "click",
        () => {
          const idx = parseInt(thumb.getAttribute("data-gallery-thumb"), 10);
          activateSlide(idx);
        },
        thumb
      );
    });

    const thumbRail = gallery.querySelector(".product-gallery__thumbs");
    if (thumbRail) {
      listenEvent(
        "keydown",
        (e) => {
          const currentActive = Array.from(thumbs).findIndex((t) =>
            t.classList.contains("is-active")
          );
          let nextIdx = -1;

          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            nextIdx = (currentActive + 1) % thumbs.length;
          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            nextIdx = (currentActive - 1 + thumbs.length) % thumbs.length;
          } else if (e.key === "Home") {
            e.preventDefault();
            nextIdx = 0;
          } else if (e.key === "End") {
            e.preventDefault();
            nextIdx = thumbs.length - 1;
          }

          if (nextIdx !== -1) {
            thumbs[nextIdx].focus();
            activateSlide(nextIdx);
          }
        },
        thumbRail
      );
    }
  });
}

if (document.readyState === "loading") {
  listenEvent("DOMContentLoaded", initGalleries);
} else {
  initGalleries();
}

listenEvent("content:loaded", initGalleries);
