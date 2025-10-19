/**
 * This script is injected into the target website.
 * Its job is to find HTML elements and report interactions
 * back to the background script.
 *
 * --- YOU MUST CUSTOMIZE THIS FILE ---
 */

console.log("[Tracker] Content script loaded.");

// Helper to send a message and log ack/errors
function sendEventWithAck(payload) {
  try {
    chrome.runtime.sendMessage(payload, response => {
      if (chrome.runtime.lastError) {
        console.warn(
          "[Tracker] sendMessage error:",
          chrome.runtime.lastError.message
        );
        return;
      }
      console.log("[Tracker] Background ack:", response);
    });
  } catch (e) {
    console.warn("[Tracker] sendMessage threw:", e);
  }
}

// Emit a diagnostic event when the content script loads
try {
  sendEventWithAck({
    type: "TRACK_EVENT",
    eventName: "content_script_loaded",
    eventValue: 1,
    metadata: { url: window.location.href, pageTitle: document.title }
  });
} catch (_) {}

// --- Image hover tracking ---
const IMG_HOVER_COOLDOWN_MS = 2000;
const HOVER_DESC_DELAY_MS = 5000; // wait 5s before describing
const _imageHoverLastTs = new WeakMap();
const _imageHoverTimers = new WeakMap();
const _imageDescCache = new WeakMap();
let _hoverTooltip = null;
let _currentHoverEl = null;
let _lastPointer = { x: 0, y: 0 };

function ensureTooltip() {
  if (_hoverTooltip && _hoverTooltip.parentNode) return _hoverTooltip;
  const t = document.createElement("div");
  t.setAttribute("role", "tooltip");
  t.style.position = "fixed";
  t.style.left = "0px";
  t.style.top = "0px";
  t.style.maxWidth = "480px";
  t.style.background = "rgba(0,0,0,0.85)";
  t.style.color = "#fff";
  t.style.padding = "12px 14px";
  t.style.borderRadius = "8px";
  t.style.fontSize = "18px";
  t.style.lineHeight = "1.35";
  t.style.fontWeight = "600";
  t.style.zIndex = "2147483647";
  t.style.pointerEvents = "none";
  t.style.boxShadow = "0 4px 16px rgba(0,0,0,0.35)";
  document.documentElement.appendChild(t);
  _hoverTooltip = t;
  return t;
}

function showTooltip(text, x, y) {
  const t = ensureTooltip();
  t.textContent = text;
  positionTooltip(x, y);
  t.style.opacity = "1";
}

function positionTooltip(x, y) {
  if (!_hoverTooltip) return;
  const offset = 14;
  let left = Math.round(x + offset);
  let top = Math.round(y + offset);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = _hoverTooltip.getBoundingClientRect();
  if (left + rect.width > vw - 8) left = Math.max(8, vw - rect.width - 8);
  if (top + rect.height > vh - 8) top = Math.max(8, vh - rect.height - 8);
  _hoverTooltip.style.left = `${left}px`;
  _hoverTooltip.style.top = `${top}px`;
}

function hideTooltip() {
  if (_hoverTooltip) {
    try {
      _hoverTooltip.remove();
    } catch (_) {}
    _hoverTooltip = null;
  }
}

function extractBackgroundImageUrl(el) {
  try {
    const bg = window.getComputedStyle(el).backgroundImage || "";
    // Matches url("https://...") or url(https://...)
    const m = bg.match(/url\(("|'|)(.*?)\1\)/);
    return m && m[2] ? m[2] : null;
  } catch (_) {
    return null;
  }
}

function handleImageHover(evt) {
  try {
    // Avoid spurious mouseover when moving within the same element
    if (
      evt.relatedTarget &&
      evt.target &&
      evt.target.contains &&
      evt.target.contains(evt.relatedTarget)
    ) {
      return;
    }
    let imgEl = null;
    let src = null;
    if (evt.target instanceof HTMLImageElement) {
      imgEl = evt.target;
      src = imgEl.currentSrc || imgEl.src || null;
    } else if (evt.target instanceof Element) {
      const bgUrl = extractBackgroundImageUrl(evt.target);
      if (bgUrl) {
        imgEl = evt.target; // treat the element with background image as the image container
        src = bgUrl;
      }
    }
    if (!imgEl || !src) return;

    const last = _imageHoverLastTs.get(imgEl) || 0;
    const now = Date.now();
    if (now - last < IMG_HOVER_COOLDOWN_MS) return;
    _imageHoverLastTs.set(imgEl, now);

    const rect = imgEl.getBoundingClientRect();
    const meta = {
      url: window.location.href,
      pageTitle: document.title,
      src,
      tag: imgEl.tagName.toLowerCase(),
      alt: imgEl instanceof HTMLImageElement ? imgEl.alt || "" : "",
      boundingRect: {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      pointer: { x: Math.round(evt.clientX), y: Math.round(evt.clientY) },
      viewport: { w: window.innerWidth, h: window.innerHeight }
    };
    console.log("[Tracker] image_hovered", meta);
    sendEventWithAck({
      type: "TRACK_EVENT",
      eventName: "image_hovered",
      eventValue: 1,
      metadata: meta
    });

    // schedule a delayed (5s) description request & tooltip
    _currentHoverEl = imgEl;
    _lastPointer = { x: evt.clientX, y: evt.clientY };
    const existing = _imageHoverTimers.get(imgEl);
    if (existing) clearTimeout(existing);
    const timerId = setTimeout(async () => {
      try {
        // use cache if available
        let desc = _imageDescCache.get(imgEl);
        if (!desc) {
          const srcUrl = new URL(src, location.href).toString();
          const blob = await fetch(srcUrl, { mode: "cors" }).then(r =>
            r.ok && r.blob ? r.blob() : Promise.reject(r.status)
          );
          const reader = new FileReader();
          const base64 = await new Promise(res => {
            reader.onload = () =>
              res(String(reader.result).split(",")[1] || "");
            reader.readAsDataURL(blob);
          });
          desc = await new Promise(res => {
            chrome.runtime.sendMessage(
              {
                type: "DESCRIBE_IMAGE",
                base64,
                mimeType: blob.type || "image/jpeg"
              },
              resp => {
                if (resp && resp.ok) res(resp.description || "");
                else res("");
              }
            );
          });
          if (desc) _imageDescCache.set(imgEl, desc);
        }
        if (desc) {
          showTooltip(desc, _lastPointer.x, _lastPointer.y);
        }
      } catch (_) {}
    }, HOVER_DESC_DELAY_MS);
    _imageHoverTimers.set(imgEl, timerId);

    // bind leave handler once to cancel & hide
    if (!imgEl.dataset.trackerHoverBound) {
      imgEl.addEventListener("mouseleave", () => {
        const t = _imageHoverTimers.get(imgEl);
        if (t) clearTimeout(t);
        _imageHoverTimers.delete(imgEl);
        if (_currentHoverEl === imgEl) {
          _currentHoverEl = null;
          hideTooltip();
        }
      });
      imgEl.dataset.trackerHoverBound = "1";
    }
  } catch (e) {
    // ignore
  }
}

document.addEventListener("mouseover", handleImageHover, true);
document.addEventListener(
  "mousemove",
  e => {
    _lastPointer = { x: e.clientX, y: e.clientY };
    if (_hoverTooltip) positionTooltip(e.clientX, e.clientY);
  },
  true
);

// ---- Generic click tracking ----
// Captures all clicks, finds the closest meaningful clickable element,
// and reports the interaction to the background script.

// Heuristics for what counts as a "small" button
const SMALL_BTN_MAX_WIDTH = 240; // px
const SMALL_BTN_MAX_HEIGHT = 80; // px
const SMALL_BTN_MAX_AREA = 26000; // px^2
const SMALL_BTN_MIN_SIZE = 20; // px
const SMALL_SNAP_DISTANCE = 56; // px: prefer small target if within this distance
const MISCLICK_THRESHOLD = 4; // number of near misses before enlarging
const MISCLICK_STORAGE_KEY = "DDE_MISCLICK_MAP_V1"; // per-page map of selectorPath -> count

// Persistence for which element is currently enlarged on this page
const PERSIST_KEY = "DDE_ENLARGED_SELECTOR_V1";
function pagePersistKey() {
  try {
    return location.origin + location.pathname;
  } catch (_) {
    return location.href.split(/[?#]/)[0];
  }
}
function persistSelected(selectorPath) {
  try {
    localStorage.setItem(
      PERSIST_KEY,
      JSON.stringify({ page: pagePersistKey(), selectorPath })
    );
  } catch (_) {}
}
function loadPersistedSelector() {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || obj.page !== pagePersistKey()) return null;
    return obj.selectorPath || null;
  } catch (_) {
    return null;
  }
}

function isElementInteractable(el) {
  if (!el || !(el instanceof Element)) return false;
  const tag = el.tagName;
  const role = (el.getAttribute("role") || "").toLowerCase();
  const type = (el.getAttribute("type") || "").toLowerCase();
  const style = window.getComputedStyle(el);
  if (
    style.pointerEvents === "none" ||
    style.visibility === "hidden" ||
    style.display === "none"
  ) {
    return false;
  }
  if (el.hasAttribute("disabled")) return false;
  if (el.hasAttribute("onclick")) return true;
  if (el.hasAttribute("tabindex")) return true;
  if (el.isContentEditable) return true;
  if (role === "button" || role === "link") return true;
  if (
    tag === "BUTTON" ||
    tag === "A" ||
    tag === "SELECT" ||
    tag === "TEXTAREA" ||
    tag === "LABEL"
  )
    return true;
  if (
    tag === "INPUT" &&
    ["button", "submit", "radio", "checkbox", "file", "image"].includes(type)
  )
    return true;
  if (style.cursor === "pointer") return true;
  return false;
}

function getClickableAncestor(start) {
  let el = start instanceof Element ? start : null;
  while (el) {
    if (isElementInteractable(el)) return el;
    el = el.parentElement;
  }
  return null;
}

function distanceToRect(x, y, rect) {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  return Math.hypot(dx, dy);
}

function findCandidateFromElementsAtPoint(x, y) {
  const chain = document.elementsFromPoint(x, y);
  for (const el of chain) {
    const clickable = getClickableAncestor(el);
    if (clickable) return { el: clickable, strategy: "elementsFromPoint" };
  }
  return null;
}

function findNearestClickableByDistance(x, y, maxDistancePx = 80) {
  const selectors = [
    "button",
    "a[href]",
    "input[type=button]",
    "input[type=submit]",
    "[role=button]",
    "[role=link]",
    "[onclick]",
    "[tabindex]"
  ];
  const candidates = document.querySelectorAll(selectors.join(","));
  let best = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    if (!(c instanceof Element) || !isElementInteractable(c)) continue;
    const rect = c.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const d = distanceToRect(x, y, rect);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  if (best && bestDist <= maxDistancePx) {
    return { el: best, strategy: "nearestByDistance" };
  }
  return null;
}

function buildSelectorPath(el, maxDepth = 5) {
  try {
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < maxDepth) {
      let part = node.tagName.toLowerCase();
      if (node.id) {
        part += `#${node.id}`;
        parts.unshift(part);
        break;
      }
      const cls = (node.className || "")
        .toString()
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);
      if (cls.length) part += "." + cls.join(".");
      parts.unshift(part);
      node = node.parentElement;
      depth += 1;
    }
    return parts.join(" > ");
  } catch (_e) {
    return "";
  }
}

function getElementDescriptor(el) {
  const tag = el.tagName.toLowerCase();
  const role = el.getAttribute("role") || "";
  const type = el.getAttribute("type") || "";
  const id = el.id || "";
  const classes = (el.className || "").toString();
  const ariaLabel = el.getAttribute("aria-label") || "";
  const title = el.getAttribute("title") || "";
  const name = el.getAttribute("name") || "";
  const href =
    el instanceof HTMLAnchorElement ? el.getAttribute("href") || "" : "";
  const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120);
  return { tag, role, type, id, classes, ariaLabel, title, name, href, text };
}

function highlightElement(el) {
  try {
    const rect = el.getBoundingClientRect();
    const hl = document.createElement("div");
    hl.style.position = "fixed";
    hl.style.left = `${Math.round(rect.left)}px`;
    hl.style.top = `${Math.round(rect.top)}px`;
    hl.style.width = `${Math.round(rect.width)}px`;
    hl.style.height = `${Math.round(rect.height)}px`;
    hl.style.border = "2px solid #00BCD4";
    hl.style.borderRadius = "4px";
    hl.style.background = "rgba(0, 188, 212, 0.12)";
    hl.style.zIndex = "2147483647";
    hl.style.pointerEvents = "none";
    document.documentElement.appendChild(hl);
    setTimeout(() => hl.remove(), 350);
  } catch (_) {}
}

let _trackerCurrentlyEnlarged = null;
function enlargeElementTemporarily(
  el,
  scale = 1.15,
  fontScale = 1.15,
  durationMs = 1500
) {
  try {
    // Restore previous enlarged element, if any
    if (_trackerCurrentlyEnlarged && _trackerCurrentlyEnlarged !== el) {
      try {
        const prev = _trackerCurrentlyEnlarged;
        if (prev.dataset.trackerPrevTransform !== undefined) {
          prev.style.transform = prev.dataset.trackerPrevTransform;
        }
        if (prev.dataset.trackerPrevFontSize !== undefined) {
          prev.style.fontSize = prev.dataset.trackerPrevFontSize;
        }
        if (prev.dataset.trackerPrevTransition !== undefined) {
          prev.style.transition = prev.dataset.trackerPrevTransition;
        }
        delete prev.dataset.trackerPrevTransform;
        delete prev.dataset.trackerPrevFontSize;
        delete prev.dataset.trackerPrevTransition;
      } catch (_e) {}
      _trackerCurrentlyEnlarged = null;
    }

    const cs = window.getComputedStyle(el);
    const prevTransform = el.style.transform || "";
    const prevFontSize = el.style.fontSize || "";
    const prevTransition = el.style.transition || "";
    el.dataset.trackerPrevTransform = prevTransform;
    el.dataset.trackerPrevFontSize = prevFontSize;
    el.dataset.trackerPrevTransition = prevTransition;

    const baseFontPx = parseFloat(cs.fontSize || "16");
    const newFontPx = Math.max(10, Math.round(baseFontPx * fontScale));

    // Apply temporary enlargement
    el.style.transition =
      (prevTransition ? prevTransition + ", " : "") +
      "transform 120ms ease, font-size 120ms ease";
    el.style.transformOrigin = "center center";
    el.style.transform = `scale(${scale})`;
    el.style.fontSize = `${newFontPx}px`;
    _trackerCurrentlyEnlarged = el;

    setTimeout(() => {
      try {
        if (el.dataset.trackerPrevTransform !== undefined) {
          el.style.transform = el.dataset.trackerPrevTransform;
        }
        if (el.dataset.trackerPrevFontSize !== undefined) {
          el.style.fontSize = el.dataset.trackerPrevFontSize;
        }
        if (el.dataset.trackerPrevTransition !== undefined) {
          el.style.transition = el.dataset.trackerPrevTransition;
        }
        delete el.dataset.trackerPrevTransform;
        delete el.dataset.trackerPrevFontSize;
        delete el.dataset.trackerPrevTransition;
      } catch (_e) {}
      if (_trackerCurrentlyEnlarged === el) {
        _trackerCurrentlyEnlarged = null;
      }
    }, durationMs);
  } catch (e) {
    console.warn("[Tracker] enlargeElementTemporarily error:", e);
  }
}

// Persistent enlarge helpers (no auto-timeout)
function restoreEnlargedElement(el) {
  try {
    if (!el) return;
    if (el.dataset.trackerPrevTransform !== undefined) {
      el.style.transform = el.dataset.trackerPrevTransform;
    }
    if (el.dataset.trackerPrevFontSize !== undefined) {
      el.style.fontSize = el.dataset.trackerPrevFontSize;
    }
    if (el.dataset.trackerPrevTransition !== undefined) {
      el.style.transition = el.dataset.trackerPrevTransition;
    }
    delete el.dataset.trackerPrevTransform;
    delete el.dataset.trackerPrevFontSize;
    delete el.dataset.trackerPrevTransition;
  } catch (_) {}
}

function applyEnlargePersistent(el, scale = 1.18, fontScale = 1.14) {
  try {
    const cs = window.getComputedStyle(el);
    const prevTransform = el.style.transform || "";
    const prevFontSize = el.style.fontSize || "";
    const prevTransition = el.style.transition || "";
    el.dataset.trackerPrevTransform = prevTransform;
    el.dataset.trackerPrevFontSize = prevFontSize;
    el.dataset.trackerPrevTransition = prevTransition;

    const baseFontPx = parseFloat(cs.fontSize || "16");
    const newFontPx = Math.max(10, Math.round(baseFontPx * fontScale));

    el.style.transition =
      (prevTransition ? prevTransition + ", " : "") +
      "transform 120ms ease, font-size 120ms ease";
    el.style.transformOrigin = "center center";
    el.style.transform = `scale(${scale})`;
    el.style.fontSize = `${newFontPx}px`;
    _trackerCurrentlyEnlarged = el;
  } catch (e) {
    console.warn("[Tracker] applyEnlargePersistent error:", e);
  }
}

function ensureExclusiveEnlarge(el, selectorPath) {
  try {
    if (_trackerCurrentlyEnlarged && _trackerCurrentlyEnlarged !== el) {
      restoreEnlargedElement(_trackerCurrentlyEnlarged);
      _trackerCurrentlyEnlarged = null;
    }
    applyEnlargePersistent(el);
    if (selectorPath) persistSelected(selectorPath);
  } catch (e) {
    console.warn("[Tracker] ensureExclusiveEnlarge error:", e);
  }
}

// Re-apply persisted enlargement on load and when page becomes visible
function tryReapplyPersisted() {
  try {
    const sel = loadPersistedSelector();
    if (!sel) return;
    const el = document.querySelector(sel);
    if (el && isSmallClickable(el)) {
      ensureExclusiveEnlarge(el, sel);
      highlightElement(el);
      return true;
    }
  } catch (_) {}
  return false;
}
(function attachPersistObservers() {
  if (tryReapplyPersisted()) return;
  try {
    const obs = new MutationObserver(() => {
      if (tryReapplyPersisted()) {
        obs.disconnect();
      }
    });
    obs.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  } catch (_) {}
  try {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        tryReapplyPersisted();
      }
    });
  } catch (_) {}
})();

// --- Misclick counting utilities ---
function loadMisclickMap() {
  try {
    const page = pagePersistKey();
    const raw = localStorage.getItem(MISCLICK_STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && obj[page] ? obj[page] : {};
  } catch (_) {
    return {};
  }
}
function saveMisclickMap(map) {
  try {
    const page = pagePersistKey();
    const raw = localStorage.getItem(MISCLICK_STORAGE_KEY);
    const root = raw ? JSON.parse(raw) : {};
    root[page] = map;
    localStorage.setItem(MISCLICK_STORAGE_KEY, JSON.stringify(root));
  } catch (_) {}
}
function incrementMisclick(selectorPath) {
  const map = loadMisclickMap();
  const prev = Number(map[selectorPath] || 0);
  const next = prev + 1;
  map[selectorPath] = next;
  saveMisclickMap(map);
  return next;
}
function resetMisclick(selectorPath) {
  const map = loadMisclickMap();
  if (selectorPath in map) {
    delete map[selectorPath];
    saveMisclickMap(map);
  }
}
function pointInRect(x, y, rect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function isSmallClickable(el) {
  try {
    if (!(el instanceof Element)) return false;
    const rect = el.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    const area = w * h;
    // Allow slightly smaller minimums for links
    const tag = el.tagName.toLowerCase();
    const role = (el.getAttribute("role") || "").toLowerCase();
    const minSide =
      tag === "a" || role === "link"
        ? Math.min(12, SMALL_BTN_MIN_SIZE)
        : SMALL_BTN_MIN_SIZE;
    if (w < minSide || h < minSide) return false;
    if (
      w <= SMALL_BTN_MAX_WIDTH &&
      h <= SMALL_BTN_MAX_HEIGHT &&
      area <= SMALL_BTN_MAX_AREA
    ) {
      return true;
    }
    return false;
  } catch (_) {
    return false;
  }
}

function findSmallClickableCandidate(x, y) {
  try {
    let best = null;
    let bestDist = Infinity;

    const consider = (el, strategy) => {
      if (!(el instanceof Element)) return;
      if (!isElementInteractable(el) || !isSmallClickable(el)) return;
      const rect = el.getBoundingClientRect();
      const d = distanceToRect(x, y, rect);
      if (d < bestDist) {
        best = { el, strategy, dist: d };
        bestDist = d;
      }
    };

    const chain = document.elementsFromPoint(x, y);
    for (const node of chain) {
      if (!(node instanceof Element)) continue;
      consider(node, "smallElementAtPoint");
      let anc = node.parentElement;
      for (let hop = 0; hop < 4 && anc; hop++) {
        consider(anc, "smallAncestor");
        anc = anc.parentElement;
      }
    }

    if (!best) {
      const selectors = [
        "button",
        "a[href]",
        "input[type=button]",
        "input[type=submit]",
        "[role=button]",
        "[role=link]",
        "[onclick]",
        "[tabindex]"
      ];
      const all = document.querySelectorAll(selectors.join(","));
      for (const c of all) consider(c, "smallNearestByDistance");
    }

    if (best && best.dist <= SMALL_SNAP_DISTANCE) {
      return { el: best.el, strategy: best.strategy };
    }
  } catch (_) {}
  return null;
}

document.addEventListener(
  "click",
  evt => {
    try {
      const x = evt.clientX;
      const y = evt.clientY;
      // Simple always-on click log to DevTools for quick verification
      console.log("[Tracker] Page click detected", {
        x,
        y,
        target: evt.target
      });

      // 1) Prefer a clickable ancestor along the composed path
      const composedPath =
        typeof evt.composedPath === "function" ? evt.composedPath() : [];
      let chosen = null;
      for (const node of composedPath) {
        if (node instanceof Element) {
          const cand = getClickableAncestor(node);
          if (cand) {
            chosen = { el: cand, strategy: "ancestor" };
            break;
          }
        }
      }

      // 2) Try elementsFromPoint
      if (!chosen) {
        chosen = findCandidateFromElementsAtPoint(x, y);
      }

      // 3) Fallback to nearest clickable by distance within a small radius
      if (!chosen) {
        chosen = findNearestClickableByDistance(x, y);
      }

      // 4) Fallback to the original target (if any)
      if (!chosen && evt.target instanceof Element) {
        chosen = { el: evt.target, strategy: "target" };
      }

      // Prefer a nearby small clickable over a large container
      const smallPref = findSmallClickableCandidate(x, y);
      if (smallPref) {
        chosen = smallPref;
      }

      // 6) Final fallback: always send an event using the nearest element
      if (!chosen) {
        let fallbackEl = null;
        if (evt.target && evt.target instanceof Element) {
          fallbackEl = evt.target;
        } else if (evt.target && evt.target.parentElement) {
          fallbackEl = evt.target.parentElement;
        } else {
          fallbackEl = document.body;
        }
        chosen = { el: fallbackEl, strategy: "rawTarget" };
      }

      const el = chosen.el;
      const rect = el.getBoundingClientRect();
      const selectorPath = buildSelectorPath(el);
      const descriptor = getElementDescriptor(el);

      highlightElement(el);

      // Only enlarge after MISCLICK_THRESHOLD near misses on a nearby small clickable
      let enlargedThisClick = false;
      const smallPref2 = findSmallClickableCandidate(x, y);
      if (smallPref2 && smallPref2.el instanceof Element) {
        const target = smallPref2.el;
        const r2 = target.getBoundingClientRect();
        const inside = pointInRect(x, y, r2);
        const sel2 = buildSelectorPath(target);
        if (!inside) {
          const c = incrementMisclick(sel2);
          console.log("[Tracker] Misclick count for", sel2, c);
          if (c >= MISCLICK_THRESHOLD && isSmallClickable(target)) {
            ensureExclusiveEnlarge(target, sel2);
            enlargedThisClick = true;
            resetMisclick(sel2);
          }
        } else {
          // Successful click resets counter
          resetMisclick(sel2);
        }
      }
      sendEventWithAck({
        type: "TRACK_EVENT",
        eventName: "element_clicked",
        eventValue: 1,
        metadata: {
          url: window.location.href,
          pageTitle: document.title,
          strategy: chosen.strategy,
          selectorPath,
          element: descriptor,
          boundingRect: {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          click: { x: Math.round(x), y: Math.round(y) },
          viewport: { w: window.innerWidth, h: window.innerHeight }
        }
      });
      console.log("[Tracker] Sent TRACK_EVENT: element_clicked", {
        selectorPath,
        descriptor
      });
    } catch (e) {
      console.warn("[Tracker] Error during click handler:", e);
    }
  },
  true
);

/**
 * A helper function to track an element.
 * @param {string} selector - The CSS selector for the element to track.
 * @param {string} eventName - The name for the event in Statsig.
 * @param {object} defaultMetadata - Optional metadata to include with the event.
 */
function trackElement(selector, eventName, defaultMetadata = {}) {
  // Use a MutationObserver to handle dynamically loaded elements
  const observer = new MutationObserver((mutations, obs) => {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`Found element to track: ${selector}`);
      element.addEventListener("click", () => {
        console.log(`'${eventName}' event triggered for selector: ${selector}`);
        chrome.runtime.sendMessage({
          type: "TRACK_EVENT",
          eventName: eventName,
          eventValue: 1, // Or any other value you want to assign
          metadata: {
            ...defaultMetadata,
            url: window.location.href,
            pageTitle: document.title,
            selector: selector
          }
        });
      });
      // Once we've found and attached the listener, we don't need to observe anymore
      obs.disconnect();
    }
  });

  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// --- EXAMPLE USAGE ---
// Replace these examples with the actual selectors and event names for the website you want to track.

// Example targeted tracking (optional): uncomment and customize as needed
// trackElement("#signup-button", "signup_button_clicked");
// trackElement(".add-to-cart-btn", "add_to_cart_clicked", { itemCategory: "electronics" });
// trackElement('footer a[href="/contact"]', "contact_us_link_clicked");
