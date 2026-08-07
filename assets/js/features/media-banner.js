import { listenEvent } from "../utils/events.js";

function initMediaBanners() {
  const banners = document.querySelectorAll("[data-media-banner]");

  banners.forEach((banner) => {
    if (banner.hasAttribute("data-banner-initialized")) return;
    banner.setAttribute("data-banner-initialized", "true");

    const video = banner.querySelector("[data-media-video]");
    const playBtn = banner.querySelector("[data-media-play-btn]");
    if (!video) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      if (playBtn) {
        playBtn.classList.remove("hidden");
        playBtn.classList.add("flex");
        listenEvent(
          "click",
          () => {
            if (video.paused) {
              video.play();
              playBtn.classList.add("hidden");
            }
          },
          playBtn
        );
      }
    } else {
      video.autoplay = true;
      video.play().catch(() => {
        if (playBtn) {
          playBtn.classList.remove("hidden");
          playBtn.classList.add("flex");
        }
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            if (!video.paused) {
              video.pause();
              video.dataset.wasPlaying = "true";
            }
          } else {
            if (video.dataset.wasPlaying === "true" && !prefersReducedMotion) {
              video.play().catch(() => {});
              delete video.dataset.wasPlaying;
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(banner);

    listenEvent("visibilitychange", () => {
      if (document.hidden) {
        if (!video.paused) {
          video.pause();
          video.dataset.wasTabHidden = "true";
        }
      } else {
        if (video.dataset.wasTabHidden === "true" && !prefersReducedMotion) {
          video.play().catch(() => {});
          delete video.dataset.wasTabHidden;
        }
      }
    });
  });
}

if (document.readyState === "loading") {
  listenEvent("DOMContentLoaded", initMediaBanners);
} else {
  initMediaBanners();
}

listenEvent("content:loaded", initMediaBanners);
