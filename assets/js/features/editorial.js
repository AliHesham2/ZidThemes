import { listenEvent } from "../utils/events.js";

function initEditorialScrub() {
  const sections = document.querySelectorAll("[data-editorial]");

  sections.forEach((section) => {
    if (section.hasAttribute("data-editorial-listened")) return;
    section.setAttribute("data-editorial-listened", "true");

    let journeyObserver = null;
    let resizeObserver = null;
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

      const layouts = texts.map((t) => t.getAttribute("data-layout") || "image_first");

      let innerW = 0;
      let stageW = 0;
      let stageX = [];
      let textX = [];
      let textW = 0;

      function measureLayout() {
        const innerRect = inner.getBoundingClientRect();
        const stageRect = stage.getBoundingClientRect();

        innerW = innerRect.width || 1200;
        stageW = stageRect.width || 600;

        const isRTL = document.documentElement.dir === "rtl";
        const circleGap = 140;
        const cL = 0.06;
        const cR = 0.94;
        const circleW = Math.round(stageW * (cR - cL));

        textW = Math.max(Math.round(innerW * 0.3), 260);

        const pairW = circleW + circleGap + textW;
        const pairLeft = Math.max(Math.round((innerW - pairW) / 2), 0);

        stageX = layouts.map((l) => {
          const ltrX =
            l === "image_first"
              ? Math.round(pairLeft - stageW * cL)
              : Math.round(pairLeft + textW + circleGap - stageW * cL);
          return isRTL ? innerW - stageW - ltrX : ltrX;
        });

        textX = layouts.map((l) => {
          const ltrX = l === "image_first" ? pairLeft + circleW + circleGap : pairLeft;
          return isRTL ? innerW - textW - ltrX : ltrX;
        });

        texts.forEach((t, i) => {
          t.style.left = `${textX[i]}px`;
          t.style.width = `${textW}px`;
        });
      }

      measureLayout();

      let resizeTimer = null;
      resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          measureLayout();
        }, 100);
      });
      resizeObserver.observe(inner);

      stage.style.transform = `translate3d(${stageX[0]}px, -50%, 0) scale(0.88)`;
      stage.style.opacity = "0";

      cards.forEach((c, i) => {
        if (i === 0) {
          c.style.transform = "translate3d(0%, 0, 0) scale(1)";
          c.style.opacity = "1";
          c.classList.add("is-active");
        } else {
          c.style.transform = "translate3d(85%, 0, 0) scale(0.95)";
          c.style.opacity = "0";
          c.classList.remove("is-active");
        }
      });

      texts.forEach((t, i) => {
        if (i === 0) {
          t.style.opacity = "0";
          t.style.transform = "translate3d(0, -50%, 0) translateY(28px)";
          t.removeAttribute("inert");
        } else {
          t.style.opacity = "0";
          t.style.transform = "translate3d(0, -50%, 0)";
          t.setAttribute("inert", "");
        }
      });

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
        const entryScale = 0.88 + 0.12 * entryFactor;
        const entryOpacity = entryFactor;

        if (n === 1) {
          stage.style.transform = `translate3d(${stageX[0]}px, -50%, 0) scale(${entryScale})`;
          stage.style.opacity = `${entryOpacity}`;
          texts[0].style.opacity = `${entryOpacity}`;
          texts[0].style.transform = `translate3d(0, -50%, 0) translateY(${28 * (1 - entryFactor)}px)`;
        } else {
          const totalUnits = 0.8 + (n - 1) * 3.2;
          const currentUnit = p * totalUnits;

          let activeIdx = 0;
          let transProgress = 0;

          if (currentUnit < 0.8) {
            activeIdx = 0;
            transProgress = 0;
          } else {
            const rawIdx = (currentUnit - 0.8) / 3.2;
            activeIdx = Math.min(Math.floor(rawIdx), n - 2);
            transProgress = Math.min(Math.max(rawIdx - activeIdx, 0), 1);
          }

          const tStage =
            transProgress < 0.5
              ? 2 * transProgress * transProgress
              : 1 - Math.pow(-2 * transProgress + 2, 2) / 2;

          const currentStageX =
            stageX[activeIdx] + (stageX[activeIdx + 1] - stageX[activeIdx]) * tStage;

          stage.style.transform = `translate3d(${currentStageX}px, -50%, 0) scale(${entryScale})`;
          stage.style.opacity = `${entryOpacity}`;

          cards.forEach((c, idx) => {
            if (idx === activeIdx) {
              const cardX = -85 * tStage;
              const cardOpacity = 1 - tStage;
              const cardScale = 1 - 0.06 * tStage;
              c.style.transform = `translate3d(${cardX}%, 0, 0) scale(${cardScale})`;
              c.style.opacity = `${cardOpacity}`;
              c.classList.toggle("is-active", tStage < 0.5);
            } else if (idx === activeIdx + 1) {
              const cardX = 85 * (1 - tStage);
              const cardOpacity = tStage;
              const cardScale = 0.95 + 0.05 * tStage;
              c.style.transform = `translate3d(${cardX}%, 0, 0) scale(${cardScale})`;
              c.style.opacity = `${cardOpacity}`;
              c.classList.toggle("is-active", tStage >= 0.5);
            } else if (idx < activeIdx) {
              c.style.transform = "translate3d(-85%, 0, 0) scale(0.94)";
              c.style.opacity = "0";
              c.classList.remove("is-active");
            } else {
              c.style.transform = "translate3d(85%, 0, 0) scale(0.95)";
              c.style.opacity = "0";
              c.classList.remove("is-active");
            }
          });

          texts.forEach((t, idx) => {
            const isCurrent = idx === (tStage > 0.5 ? activeIdx + 1 : activeIdx);
            if (isCurrent) {
              t.removeAttribute("inert");
            } else {
              t.setAttribute("inert", "");
            }

            if (idx === activeIdx) {
              const textOpacity = Math.max(0, 1 - transProgress * 2);
              const textY = -24 * transProgress;
              t.style.opacity = `${textOpacity * entryOpacity}`;
              t.style.transform = `translate3d(0, -50%, 0) translateY(${textY}px)`;
            } else if (idx === activeIdx + 1) {
              const textOpacity = Math.max(0, (transProgress - 0.5) * 2);
              const textY = 28 * (1 - textOpacity);
              t.style.opacity = `${textOpacity * entryOpacity}`;
              t.style.transform = `translate3d(0, -50%, 0) translateY(${textY}px)`;
            } else {
              t.style.opacity = "0";
              t.style.transform = "translate3d(0, -50%, 0)";
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
              stage.style.willChange = "transform, opacity";
              if (!animFrameId) {
                lastTimestamp = null;
                animFrameId = requestAnimationFrame(renderFrame);
              }
            } else {
              stage.style.willChange = "auto";
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
