import { listenEvent } from "../utils/events.js";

function initEditorialScrub() {
  const sections = document.querySelectorAll("[data-editorial]");

  sections.forEach((section) => {
    if (section.hasAttribute("data-editorial-initialized")) return;
    section.setAttribute("data-editorial-initialized", "true");

    const journey = section.querySelector("[data-editorial-journey]");
    const rows = section.querySelectorAll("[data-editorial-row]");

    if (!journey || rows.length <= 1) return;

    let isVisible = false;
    let ticking = false;

    function updateScrub() {
      const rect = journey.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const totalScroll = rect.height - viewportHeight;

      if (totalScroll <= 0) return;

      const currentScroll = -rect.top;
      let progress = currentScroll / totalScroll;
      if (progress < 0) progress = 0;
      if (progress > 1) progress = 1;

      const activeIndex = Math.min(Math.floor(progress * rows.length), rows.length - 1);

      rows.forEach((row, idx) => {
        const isActive = idx === activeIndex;
        row.classList.toggle("is-active", isActive);
        row.classList.toggle("opacity-100", isActive);
        row.classList.toggle("z-10", isActive);
        row.classList.toggle("pointer-events-none", !isActive);
        row.classList.toggle("opacity-0", !isActive);
        row.classList.toggle("z-0", !isActive);
      });
    }

    function onScroll() {
      if (isVisible && !ticking) {
        window.requestAnimationFrame(() => {
          updateScrub();
          ticking = false;
        });
        ticking = true;
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
          if (isVisible) {
            window.addEventListener("scroll", onScroll, { passive: true });
            updateScrub();
          } else {
            window.removeEventListener("scroll", onScroll);
          }
        });
      },
      { threshold: 0.05 }
    );

    observer.observe(journey);
  });
}

if (document.readyState === "loading") {
  listenEvent("DOMContentLoaded", initEditorialScrub);
} else {
  initEditorialScrub();
}

listenEvent("content:loaded", initEditorialScrub);
