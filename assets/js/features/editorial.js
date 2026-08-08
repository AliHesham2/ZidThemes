import { listenEvent } from "../utils/events.js";

function initEditorialScrub() {
  const sections = document.querySelectorAll("[data-editorial]");

  sections.forEach((section) => {
    if (section.hasAttribute("data-editorial-listened")) return;
    section.setAttribute("data-editorial-listened", "true");

    let journeyObserver = null;
    let animFrameId = null;
    let lastTimestamp = null;
    let isVisible = false;
    let isInitialized = false;

    function bootJourney() {
      if (isInitialized) return;
      if (window.innerWidth < 1024) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const journey = section.querySelector("[data-editorial-journey]");
      const panel = section.querySelector("[data-editorial-panel]");
      const inner = section.querySelector("[data-editorial-inner]");
      const stage = section.querySelector("[data-editorial-stage]");
      const textWrap = section.querySelector("[data-editorial-texts]");
      const sweep = section.querySelector("[data-editorial-sweep]");

      if (!journey || !panel || !inner || !stage || !textWrap) return;

      isInitialized = true;
      section.setAttribute("data-editorial-initialized", "true");

      function byIndex(attr) {
        return Array.from(journey.querySelectorAll(`[${attr}]`)).sort((a, b) => {
          return +(a.getAttribute(attr) || 0) - +(b.getAttribute(attr) || 0);
        });
      }

      const cards = byIndex("data-editorial-card");
      const texts = byIndex("data-editorial-text");
      const n = Math.min(cards.length, texts.length);
      if (n < 1) return;

      cards.forEach((c, i) => {
        if (i === 0) {
          c.style.translate = "0 0";
          c.style.opacity = "1";
        } else {
          c.style.translate = "0 44px";
          c.style.opacity = "0";
        }
      });

      texts.forEach((t, i) => {
        if (i === 0) {
          t.style.opacity = "1";
          t.style.translate = "0 0";
          t.removeAttribute("inert");
        } else {
          t.style.opacity = "0";
          t.style.translate = "0 28px";
          t.setAttribute("inert", "");
        }
      });

      if (journey) {
        journey.style.setProperty("--vit-level", "1");
        journey.style.setProperty("--vit-i", "1");
      }
      if (sweep) {
        sweep.style.translate = "-150% 0";
      }

      let targetProgress = 0;
      let easedProgress = 0;
      let hasEntered = false;

      function renderFrame(timestamp) {
        if (!isVisible) return;

        if (lastTimestamp === null) {
          lastTimestamp = timestamp;
        }
        const rawDt = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        const dt = Math.min(Math.max(rawDt, 0), 100);

        const rect = journey.getBoundingClientRect();
        const viewportH = window.innerHeight || 800;
        const totalScroll = rect.height - viewportH;

        if (totalScroll > 0) {
          const currentScroll = -rect.top;
          targetProgress = Math.min(Math.max(currentScroll / totalScroll, 0), 1);
        } else {
          targetProgress = 0;
        }

        const k = 1 - Math.pow(1 - 0.02, dt / 16.667);
        easedProgress += (targetProgress - easedProgress) * k;
        const p = easedProgress;

        if (!hasEntered && rect.top <= viewportH * 0.85) {
          hasEntered = true;
        }

        const rawEntryFactor = hasEntered
          ? Math.min(1, Math.max(0, (viewportH * 0.85 - rect.top) / (viewportH * 0.3)))
          : 0;
        const entryFactor = 1 - Math.pow(1 - rawEntryFactor, 3);
        const entryOpacity = entryFactor;

        if (n === 1) {
          stage.style.opacity = `${entryOpacity.toFixed(3)}`;
          texts[0].style.opacity = `${entryOpacity.toFixed(3)}`;
          texts[0].style.translate = `0 ${(28 * (1 - entryFactor)).toFixed(2)}px`;
        } else {
          const totalUnits = 0.8 + (n - 1) * 3.2 + 0.2;
          const currentUnit = p * totalUnits;

          let activeIdx = 0;
          let blockProgress = 0;

          if (currentUnit < 0.8) {
            activeIdx = 0;
            blockProgress = 0;
          } else {
            const rawIdx = (currentUnit - 0.8) / 3.2;
            activeIdx = Math.min(Math.floor(rawIdx), n - 2);
            blockProgress = currentUnit - (0.8 + activeIdx * 3.2);
          }

          const local = (start, dur) => Math.min(Math.max((blockProgress - start) / dur, 0), 1);

          const uTextOut = local(0.0, 0.5);
          const tTextOut = uTextOut;

          const uObjOut = local(0.0, 0.6);
          const tObjOut = uObjOut * uObjOut;

          let vitLevel = 1.0;
          if (blockProgress >= 0.3 && blockProgress < 0.9) {
            const uDim = (blockProgress - 0.3) / 0.6;
            vitLevel = 1.0 - 0.65 * uDim;
          } else if (blockProgress >= 0.9 && blockProgress < 1.2) {
            vitLevel = 0.35;
          } else if (blockProgress >= 1.2 && blockProgress <= 2.1) {
            const uRec = (blockProgress - 1.2) / 0.9;
            vitLevel = 0.35 + 0.65 * uRec;
          } else if (blockProgress > 2.1) {
            vitLevel = 1.0;
          }

          const uObjIn = local(0.9, 1.1);
          const tObjIn = 1 - Math.pow(1 - uObjIn, 3);

          const uSweep = local(1.2, 0.9);
          const tSweep = uSweep * uSweep;
          const sweepX = -150 + 300 * tSweep;

          const uTextIn = local(1.5, 0.7);
          const tTextIn = 1 - Math.pow(1 - uTextIn, 3);

          journey.style.setProperty("--vit-level", vitLevel.toFixed(3));

          const displayedChapter = blockProgress >= 1.2 ? activeIdx + 2 : activeIdx + 1;
          journey.style.setProperty("--vit-i", displayedChapter.toString());

          if (sweep) {
            sweep.style.translate = `${sweepX.toFixed(2)}% 0`;
          }

          stage.style.opacity = `${entryOpacity.toFixed(3)}`;

          cards.forEach((c, idx) => {
            const refl = c.querySelector(".editorial__reflection");

            if (idx === activeIdx) {
              const objY = 28 * tObjOut;
              const objOpacity = 1 - tObjOut;
              c.style.translate = `0 ${objY.toFixed(2)}px`;
              c.style.opacity = `${(objOpacity * entryOpacity).toFixed(3)}`;
              if (refl) refl.style.opacity = `${(0.16 * objOpacity * entryOpacity).toFixed(3)}`;
            } else if (idx === activeIdx + 1) {
              const objY = 44 * (1 - tObjIn);
              const objOpacity = tObjIn;
              c.style.translate = `0 ${objY.toFixed(2)}px`;
              c.style.opacity = `${(objOpacity * entryOpacity).toFixed(3)}`;
              if (refl) refl.style.opacity = `${(0.16 * objOpacity * entryOpacity).toFixed(3)}`;
            } else {
              c.style.translate = "0 44px";
              c.style.opacity = "0";
              if (refl) refl.style.opacity = "0";
            }
          });

          texts.forEach((t, idx) => {
            const isCurrent = idx === (blockProgress >= 1.2 ? activeIdx + 1 : activeIdx);
            if (isCurrent) {
              t.removeAttribute("inert");
            } else {
              t.setAttribute("inert", "");
            }

            if (idx === activeIdx) {
              const textOpacity = 1 - tTextOut;
              const textY = -24 * tTextOut;
              t.style.opacity = `${(textOpacity * entryOpacity).toFixed(3)}`;
              t.style.translate = `0 ${textY.toFixed(2)}px`;
            } else if (idx === activeIdx + 1) {
              const textOpacity = tTextIn;
              const textY = 28 * (1 - tTextIn);
              t.style.opacity = `${(textOpacity * entryOpacity).toFixed(3)}`;
              t.style.translate = `0 ${textY.toFixed(2)}px`;
            } else {
              t.style.opacity = "0";
              t.style.translate = "0 28px";
            }
          });
        }

        animFrameId = requestAnimationFrame(renderFrame);
      }

      journeyObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            isVisible = entry.isIntersecting;
            if (isVisible) {
              if (!animFrameId) {
                lastTimestamp = null;
                animFrameId = requestAnimationFrame(renderFrame);
              }
            } else {
              if (animFrameId) {
                cancelAnimationFrame(animFrameId);
                animFrameId = null;
              }
            }
          });
        },
        { threshold: 0.05 }
      );

      journeyObserver.observe(journey);
    }

    bootJourney();

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleMediaChange = () => {
      if (mediaQuery.matches && !isInitialized) {
        bootJourney();
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleMediaChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleMediaChange);
    }
  });
}

if (document.readyState === "loading") {
  listenEvent("DOMContentLoaded", initEditorialScrub);
} else {
  initEditorialScrub();
}

listenEvent("content:loaded", initEditorialScrub);
