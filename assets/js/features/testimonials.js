import { listenEvent } from "../utils/events.js";

function initTestimonials() {
  const sections = document.querySelectorAll("[data-testimonials]");

  sections.forEach((section) => {
    if (section.hasAttribute("data-testimonials-initialized")) return;
    section.setAttribute("data-testimonials-initialized", "true");

    const slides = section.querySelectorAll("[data-testimonial-slide]");
    const prevBtn = section.querySelector("[data-testimonials-prev]");
    const nextBtn = section.querySelector("[data-testimonials-next]");
    const currentEl = section.querySelector("[data-testimonials-current]");
    const progressEl = section.querySelector("[data-testimonials-progress]");

    if (slides.length <= 1) return;

    let currentIndex = 0;
    let timer = null;
    const isAutoplay = section.getAttribute("data-autoplay") === "true";
    const speed = parseInt(section.getAttribute("data-speed") || "6000", 10);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function isRTL() {
      return (
        document.documentElement.dir === "rtl" ||
        window.getComputedStyle(document.documentElement).direction === "rtl"
      );
    }

    function goTo(index) {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;

      slides.forEach((s, idx) => {
        const isCurrent = idx === index;
        s.classList.toggle("is-active", isCurrent);
        s.classList.toggle("opacity-100", isCurrent);
        s.classList.toggle("translate-y-0", isCurrent);
        s.classList.toggle("z-10", isCurrent);
        s.classList.toggle("opacity-0", !isCurrent);
        s.classList.toggle("translate-y-6", !isCurrent);
        s.classList.toggle("pointer-events-none", !isCurrent);
        s.classList.toggle("z-0", !isCurrent);

        if (isCurrent) {
          s.removeAttribute("aria-hidden");
          s.removeAttribute("tabindex");
        } else {
          s.setAttribute("aria-hidden", "true");
          s.setAttribute("tabindex", "-1");
        }
      });

      currentIndex = index;

      if (currentEl) {
        currentEl.textContent = String(index + 1).padStart(2, "0");
      }

      if (progressEl) {
        const pct = (index + 1) / slides.length;
        progressEl.style.transform = `scaleX(${pct})`;
      }
    }

    function startAutoplay() {
      if (!isAutoplay || prefersReducedMotion || timer) return;
      timer = setInterval(() => {
        goTo(currentIndex + 1);
      }, speed);
    }

    function stopAutoplay() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    if (prevBtn) {
      listenEvent(
        "click",
        () => {
          stopAutoplay();
          goTo(currentIndex - 1);
          startAutoplay();
        },
        prevBtn
      );
    }

    if (nextBtn) {
      listenEvent(
        "click",
        () => {
          stopAutoplay();
          goTo(currentIndex + 1);
          startAutoplay();
        },
        nextBtn
      );
    }

    listenEvent("mouseenter", stopAutoplay, section);
    listenEvent("mouseleave", startAutoplay, section);
    listenEvent("focusin", stopAutoplay, section);
    listenEvent("focusout", startAutoplay, section);

    listenEvent("visibilitychange", () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });

    let touchStartX = 0;
    section.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
      },
      { passive: true }
    );

    listenEvent(
      "touchend",
      (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) > 40) {
          stopAutoplay();
          const rtl = isRTL();
          if (diff > 0) {
            goTo(currentIndex + (rtl ? -1 : 1));
          } else {
            goTo(currentIndex + (rtl ? 1 : -1));
          }
          startAutoplay();
        }
      },
      section
    );

    listenEvent(
      "keydown",
      (e) => {
        if (e.key === "ArrowLeft") {
          stopAutoplay();
          goTo(currentIndex + (isRTL() ? 1 : -1));
          startAutoplay();
        } else if (e.key === "ArrowRight") {
          stopAutoplay();
          goTo(currentIndex + (isRTL() ? -1 : 1));
          startAutoplay();
        }
      },
      section
    );

    goTo(0);
    startAutoplay();
  });
}

if (document.readyState === "loading") {
  listenEvent("DOMContentLoaded", initTestimonials);
} else {
  initTestimonials();
}

listenEvent("content:loaded", initTestimonials);
