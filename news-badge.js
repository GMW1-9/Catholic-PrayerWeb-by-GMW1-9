/* Unread What's New badge.
 * Add <script src="news-badge.js"></script> before </body> in index.html.
 * The script compares the current news items with the last version this
 * browser saw. New or changed news items increase the red badge count.
 */
(function () {
  const STORAGE_KEY = "cpw_news_seen_items_v1";
  const COUNT_KEY = "cpw_news_unread_count_v1";

  function getNewsItems() {
    return Array.from(document.querySelectorAll("#newsModal .news-item"))
      .map((item) => item.textContent.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  function createBadge() {
    const button = document.querySelector('[onclick="openNewsModal()"]');
    if (!button) return null;

    let badge = document.getElementById("newsUnreadBadge");
    if (!badge) {
      badge = document.createElement("span");
      badge.id = "newsUnreadBadge";
      badge.setAttribute("aria-label", "Unread updates");
      Object.assign(badge.style, {
        position: "absolute",
        top: "-8px",
        right: "-8px",
        minWidth: "24px",
        height: "24px",
        padding: "2px 6px",
        borderRadius: "999px",
        background: "#ef4444",
        color: "white",
        font: "bold 0.8rem Arial, sans-serif",
        display: "none",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: "20px",
        zIndex: "2"
      });
      button.style.position = "relative";
      button.appendChild(badge);
    }
    return badge;
  }

  function updateBadge(count) {
    const badge = createBadge();
    if (!badge) return;
    const safeCount = Math.max(0, Number(count) || 0);
    badge.textContent = safeCount > 99 ? "99+" : String(safeCount);
    badge.style.display = safeCount > 0 ? "inline-flex" : "none";
  }

  function initialize() {
    const currentItems = getNewsItems();
    if (!currentItems.length) return;

    let seenItems = [];
    try {
      seenItems = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      seenItems = [];
    }

    // Do not count all existing news the first time this feature is installed.
    if (!Array.isArray(seenItems) || seenItems.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentItems));
      localStorage.setItem(COUNT_KEY, "0");
      updateBadge(0);
      return;
    }

    const newItems = currentItems.filter((item) => !seenItems.includes(item));
    const oldCount = Number(localStorage.getItem(COUNT_KEY) || 0);
    const count = oldCount + newItems.length;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentItems));
    localStorage.setItem(COUNT_KEY, String(count));
    updateBadge(count);
  }

  const originalOpenNewsModal = window.openNewsModal;
  window.openNewsModal = function () {
    if (typeof originalOpenNewsModal === "function") {
      originalOpenNewsModal();
    }

    // Opening What's New marks all displayed updates as read.
    const items = getNewsItems();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(COUNT_KEY, "0");
    updateBadge(0);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
