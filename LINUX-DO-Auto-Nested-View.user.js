// ==UserScript==
// @name         LINUX DO Auto Nested View
// @name:zh-CN   LINUX DO 自动嵌套视图
// @namespace    https://github.com/kai-wei-kfuse/linux-do-auto-nested-view
// @version      1.5.4
// @description  Automatically redirect linux.do topic pages and topic links to nested view.
// @description:zh-CN 自动将 linux.do 主题页和主题链接切换到嵌套视图。
// @author       kai-wei-kfuse
// @license      MIT
// @match        https://linux.do/*
// @homepageURL  https://github.com/kai-wei-kfuse/linux-do-auto-nested-view
// @supportURL   https://github.com/kai-wei-kfuse/linux-do-auto-nested-view/issues
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  "use strict";

  const ENABLED_STORAGE_KEY = "linuxdo-auto-nested-view-enabled";
  const TITLE_STORAGE_PREFIX = "linuxdo-auto-nested-view-topic-title-";
  const PRIVATE_MESSAGE_STORAGE_PREFIX =
    "linuxdo-auto-nested-view-private-message-";
  const SITE_TITLE = "LINUX DO";
  const pageWindow =
    typeof unsafeWindow === "undefined" ? window : unsafeWindow;

  let lastHandledUrl = "";
  let observer = null;
  let menuCommandId = null;
  let autoConvertEnabled = loadAutoConvertEnabled();
  const rewrittenLinks = new WeakSet();

  function loadAutoConvertEnabled() {
    try {
      return GM_getValue(ENABLED_STORAGE_KEY, true) !== false;
    } catch {
      return true;
    }
  }

  function saveAutoConvertEnabled(enabled) {
    autoConvertEnabled = enabled;

    try {
      GM_setValue(ENABLED_STORAGE_KEY, enabled);
    } catch {
      // Ignore storage failures so the script still works with its default state.
    }
  }

  function registerToggleMenu() {
    if (typeof GM_registerMenuCommand !== "function") {
      return;
    }

    if (
      menuCommandId !== null &&
      typeof GM_unregisterMenuCommand === "function"
    ) {
      GM_unregisterMenuCommand(menuCommandId);
    }

    const status = autoConvertEnabled ? "开启" : "关闭";
    menuCommandId = GM_registerMenuCommand(
      `自动转换嵌套视图：${status}`,
      () => {
        saveAutoConvertEnabled(!autoConvertEnabled);
        registerToggleMenu();
        applyAutoConvertState();

        if (!autoConvertEnabled) {
          pageWindow.location.reload();
        }
      }
    );
  }

  function stopObserver() {
    if (!observer) {
      return;
    }

    observer.disconnect();
    observer = null;
  }

  function applyAutoConvertState() {
    lastHandledUrl = "";

    if (!autoConvertEnabled) {
      stopObserver();
      return;
    }

    startObserver();
    rewriteTopicLinks();
    redirectToNested();
    syncDocumentTitle();
  }

  function extractTopicId(pathname) {
    const nestedMatch = pathname.match(/^\/n\/topic\/(\d+)(?:\/.*)?$/);
    if (nestedMatch) {
      return nestedMatch[1];
    }

    const topicMatch = pathname.match(/^\/t\/[^/]+\/(\d+)(?:\/.*)?$/);
    if (topicMatch) {
      return topicMatch[1];
    }

    return null;
  }

  function isTopicPage(pathname) {
    return pathname.startsWith("/t/") && Boolean(extractTopicId(pathname));
  }

  function isNestedPage(pathname) {
    return pathname.startsWith("/n/topic/") && Boolean(extractTopicId(pathname));
  }

  function toNestedUrl(urlLike) {
    const url = new URL(urlLike, pageWindow.location.origin);
    const topicId = extractTopicId(url.pathname);
    if (!topicId) {
      return null;
    }

    url.pathname = `/n/topic/${topicId}`;
    return url.toString();
  }

  function getTopicIdFromUrl(urlLike) {
    try {
      const url = new URL(urlLike, pageWindow.location.origin);
      return extractTopicId(url.pathname);
    } catch {
      return null;
    }
  }

  function normalizeTopicTitle(text) {
    const title = text?.replace(/\s+/g, " ").trim();
    if (!title || title.toUpperCase() === "LINUXDO") {
      return null;
    }

    return title.replace(/\s+-\s+LINUX\s*DO$/i, "").trim() || null;
  }

  function extractTitleFromLink(link) {
    if (!link) {
      return null;
    }

    const titleNode = link.querySelector?.(
      ".title, .topic-title, [data-topic-title]"
    );
    return (
      normalizeTopicTitle(titleNode?.textContent) ||
      normalizeTopicTitle(link.getAttribute("title")) ||
      normalizeTopicTitle(link.getAttribute("aria-label")) ||
      normalizeTopicTitle(link.textContent)
    );
  }

  function rememberTopicTitle(link) {
    const topicId = getTopicIdFromUrl(link?.href);
    const title = extractTitleFromLink(link);
    if (!topicId || !title) {
      return;
    }

    try {
      sessionStorage.setItem(`${TITLE_STORAGE_PREFIX}${topicId}`, title);
    } catch {
      // Ignore storage failures; page DOM title detection can still recover.
    }
  }

  function loadRememberedTopicTitle(topicId) {
    try {
      return normalizeTopicTitle(
        sessionStorage.getItem(`${TITLE_STORAGE_PREFIX}${topicId}`)
      );
    } catch {
      return null;
    }
  }

  function rememberPrivateMessageTopic(link) {
    const topicId = getTopicIdFromUrl(link?.href);
    if (!topicId) {
      return;
    }

    try {
      sessionStorage.setItem(`${PRIVATE_MESSAGE_STORAGE_PREFIX}${topicId}`, "1");
    } catch {
      // Ignore storage failures; context checks still protect visible menu links.
    }
  }

  function isRememberedPrivateMessageUrl(urlLike) {
    const topicId = getTopicIdFromUrl(urlLike);
    if (!topicId) {
      return false;
    }

    try {
      return (
        sessionStorage.getItem(`${PRIVATE_MESSAGE_STORAGE_PREFIX}${topicId}`) ===
        "1"
      );
    } catch {
      return false;
    }
  }

  function isPrivateMessageContext(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(
      target.closest(
        [
          "#quick-access-messages",
          ".quick-access-messages",
          ".user-menu-messages-list",
          ".user-messages-list",
          ".private-messages-list",
          ".messages-list",
          ".message-list",
          ".menu-panel.messages",
          ".menu-panel.private-messages",
          ".quick-access-panel.messages",
          ".quick-access-panel.private-messages",
          "[data-user-menu-tab='messages']",
          "[data-tab='messages']",
          "[data-section='messages']",
          "[data-name='messages']",
          "[data-type='private_message']",
          "[data-notification-type='private_message']",
          "[data-archetype='private_message']",
        ].join(",")
      )
    );
  }

  function shouldSkipNestedConversion(link) {
    if (!link) {
      return false;
    }

    if (isRememberedPrivateMessageUrl(link.href)) {
      return true;
    }

    if (!isPrivateMessageContext(link)) {
      return false;
    }

    rememberPrivateMessageTopic(link);
    return true;
  }

  function findTopicTitleInPage() {
    const metaTitle =
      normalizeTopicTitle(
        document.querySelector('meta[property="og:title"]')?.content
      ) ||
      normalizeTopicTitle(
        document.querySelector('meta[name="twitter:title"]')?.content
      );
    if (metaTitle) {
      return metaTitle;
    }

    const titleSelectors = [
      "h1 .fancy-title",
      "h1.topic-title",
      ".topic-title h1",
      ".topic-title",
      ".title-wrapper h1",
      "h1",
    ];

    for (const selector of titleSelectors) {
      const title = normalizeTopicTitle(
        document.querySelector(selector)?.textContent
      );
      if (title) {
        return title;
      }
    }

    return null;
  }

  function syncDocumentTitle() {
    if (!autoConvertEnabled || !isNestedPage(pageWindow.location.pathname)) {
      return;
    }

    const topicId = extractTopicId(pageWindow.location.pathname);
    const title = findTopicTitleInPage() || loadRememberedTopicTitle(topicId);
    if (!title) {
      return;
    }

    const nextTitle = `${title} - ${SITE_TITLE}`;
    if (document.title !== nextTitle) {
      document.title = nextTitle;
    }
  }

  function rewriteTopicLinks(root = document) {
    if (!autoConvertEnabled) {
      return;
    }

    const links = root.querySelectorAll('a[href]');
    for (const link of links) {
      if (shouldSkipNestedConversion(link)) {
        continue;
      }

      const nestedUrl = toNestedUrl(link.href);
      if (!nestedUrl) {
        continue;
      }

      if (link.href === nestedUrl && rewrittenLinks.has(link)) {
        continue;
      }

      rememberTopicTitle(link);
      link.href = nestedUrl;
      rewrittenLinks.add(link);
    }
  }

  function rewriteLinkElement(link) {
    if (!autoConvertEnabled) {
      return;
    }

    if (!link || !link.href) {
      return;
    }

    if (shouldSkipNestedConversion(link)) {
      return;
    }

    const nestedUrl = toNestedUrl(link.href);
    if (!nestedUrl || link.href === nestedUrl) {
      return;
    }

    rememberTopicTitle(link);
    link.href = nestedUrl;
    rewrittenLinks.add(link);
  }

  function findAnchorFromEventTarget(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    return target.closest("a[href]");
  }

  function isNotificationArea(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(
      target.closest(
        [
          "#quick-access-notifications",
          ".user-notifications-list",
          ".notifications-list",
          ".notification-history",
          ".menu-panel.notifications",
          ".notification",
          "[data-notification-id]",
        ].join(",")
      )
    );
  }

  function isBookmarkArea(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(
      target.closest(
        [
          "#quick-access-bookmarks",
          ".quick-access-bookmarks",
          ".user-menu-bookmarks-list",
          ".bookmarks-list",
          ".menu-panel.bookmarks",
          ".quick-access-panel.bookmarks",
          "[data-user-menu-tab='bookmarks']",
          "[data-tab='bookmarks']",
          "[data-section='bookmarks']",
          "[data-name='bookmarks']",
        ].join(",")
      )
    );
  }

  function shouldForceNestedNavigation(target) {
    return isNotificationArea(target) || isBookmarkArea(target);
  }

  function forceMenuTopicNavigation(event) {
    if (!autoConvertEnabled) {
      return;
    }

    if (!shouldForceNestedNavigation(event.target)) {
      return;
    }

    const link = findAnchorFromEventTarget(event.target);
    if (!link) {
      return;
    }

    if (shouldSkipNestedConversion(link)) {
      return;
    }

    const nestedUrl = toNestedUrl(link.href);
    if (!nestedUrl) {
      return;
    }

    rememberTopicTitle(link);
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    pageWindow.location.assign(nestedUrl);
  }

  function interceptNavigationEvent(event) {
    if (!autoConvertEnabled) {
      return;
    }

    const link = findAnchorFromEventTarget(event.target);
    if (!link) {
      return;
    }

    rewriteLinkElement(link);
  }

  function redirectToNested() {
    if (!autoConvertEnabled) {
      lastHandledUrl = "";
      return;
    }

    const { pathname, href } = pageWindow.location;

    if (href === lastHandledUrl) {
      syncDocumentTitle();
      return;
    }

    if (isNestedPage(pathname)) {
      const normalizedNestedUrl = toNestedUrl(href);
      if (normalizedNestedUrl && normalizedNestedUrl !== href) {
        lastHandledUrl = href;
        pageWindow.location.replace(normalizedNestedUrl);
        return;
      }

      lastHandledUrl = href;
      syncDocumentTitle();
      return;
    }

    if (!isTopicPage(pathname)) {
      lastHandledUrl = href;
      return;
    }

    if (isRememberedPrivateMessageUrl(href)) {
      lastHandledUrl = href;
      return;
    }

    const link = document.querySelector("a.nested-view-link");
    if (link && link.href) {
      lastHandledUrl = href;
      pageWindow.location.href = link.href;
      return;
    }

    const nestedUrl = toNestedUrl(href);
    if (nestedUrl && nestedUrl !== href) {
      lastHandledUrl = href;
      pageWindow.location.href = nestedUrl;
    }
  }

  function startObserver() {
    if (!autoConvertEnabled) {
      stopObserver();
      return;
    }

    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            continue;
          }

          if (node.matches?.("a[href]")) {
            rewriteTopicLinks(node.parentElement ?? document);
            continue;
          }

          rewriteTopicLinks(node);
        }
      }

      redirectToNested();
      syncDocumentTitle();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function hookHistoryMethod(methodName) {
    const original = pageWindow.history[methodName];
    pageWindow.history[methodName] = function (...args) {
      if (
        autoConvertEnabled &&
        args.length >= 3 &&
        args[2] != null &&
        !isRememberedPrivateMessageUrl(args[2])
      ) {
        const nestedUrl = toNestedUrl(args[2]);
        if (nestedUrl) {
          args[2] = nestedUrl;
        }
      }

      const result = original.apply(this, args);
      if (autoConvertEnabled) {
        setTimeout(redirectToNested, 0);
        setTimeout(syncDocumentTitle, 0);
      }
      return result;
    };
  }

  registerToggleMenu();
  hookHistoryMethod("pushState");
  hookHistoryMethod("replaceState");
  window.addEventListener("popstate", () => setTimeout(redirectToNested, 0));
  window.addEventListener("DOMContentLoaded", () => {
    rewriteTopicLinks();
    redirectToNested();
    syncDocumentTitle();
  });
  window.addEventListener("click", forceMenuTopicNavigation, true);
  window.addEventListener("pointerdown", interceptNavigationEvent, true);
  window.addEventListener("mousedown", interceptNavigationEvent, true);
  window.addEventListener("click", interceptNavigationEvent, true);
  window.addEventListener("auxclick", interceptNavigationEvent, true);

  applyAutoConvertState();
})();
