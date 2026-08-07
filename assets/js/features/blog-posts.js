import { listenEvent } from "../utils/events.js";
import { waitForZid } from "../utils/zid.js";

async function hydrateBlogPosts() {
  const cards = document.querySelectorAll("[data-blog-needs]");
  if (cards.length === 0) return;

  try {
    await waitForZid("blog.get");

    for (const card of cards) {
      if (card.hasAttribute("data-blog-hydrated")) continue;
      card.setAttribute("data-blog-hydrated", "true");

      const slug = card.getAttribute("data-blog-slug");
      if (!slug) continue;

      const needs = (card.getAttribute("data-blog-needs") || "").split(",");

      try {
        const post = await window.zid.blog.get(slug);

        if (!post) continue;

        if (needs.includes("title") && post.title) {
          const titleEl = card.querySelector('[data-blog-field="title"]');
          if (titleEl && !titleEl.textContent.trim()) {
            titleEl.textContent = post.title;
          }
        }

        if (needs.includes("excerpt") && post.content) {
          const excEl = card.querySelector('[data-blog-field="excerpt"]');
          if (excEl && !excEl.textContent.trim()) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(post.content, "text/html");
            const plain = doc.body.textContent || doc.body.innerText || "";
            excEl.textContent = plain.length > 120 ? plain.substring(0, 120) + "..." : plain;
          }
        }

        if (needs.includes("date") && (post.published_at || post.updated_at)) {
          const dateEl = card.querySelector('[data-blog-field="date"]');
          if (dateEl && !dateEl.textContent.trim()) {
            const rawDate = post.published_at || post.updated_at;
            try {
              const lang = document.documentElement.lang || "ar";
              const formattedDate = new Intl.DateTimeFormat(lang, {
                year: "numeric",
                month: "short",
                day: "numeric"
              }).format(new Date(rawDate));
              dateEl.textContent = formattedDate;
            } catch (dtErr) {
              dateEl.textContent = rawDate;
            }
          }
        }
      } catch (err) {
        // Fallback: let server-rendered card content stand
      }
    }
  } catch (sdkErr) {
    // SDK unavailable: let server-rendered card content stand
  }
}

if (document.readyState === "loading") {
  listenEvent("DOMContentLoaded", hydrateBlogPosts);
} else {
  hydrateBlogPosts();
}

listenEvent("content:loaded", hydrateBlogPosts);
