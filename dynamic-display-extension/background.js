// This script requires the Statsig JS SDK. You must download 'statsig.min.js'
// and place it in the same directory as this file.
try {
  importScripts("statsig-js-client.min.js");
} catch (e) {
  console.error(
    "Statsig SDK not found. Please download a browser build (e.g., statsig-js-client.min.js) and add it to the extension's root directory.",
    e
  );
}

// --- CONFIGURATION ---
// Replace with your actual Statsig Client Key
const STATSIG_CLIENT_KEY = "client-EY065Cuo3EDACcYQrx4imSz6mINhMpnVNcER9jXdKVf";
// Optional: Gemini API key for image descriptions
const GEMINI_API_KEY = "AIzaSyAxJumE7TZ3BI2A5ikz7au7tUWsw6k6c2w"; // set your key here
const GEMINI_MODEL = "models/gemini-2.0-flash-exp"; // or a stable flash model name

/**
 * Retrieves a stable user ID from chrome.storage.local.
 * If one doesn't exist, it creates a new unique ID and saves it.
 * This ensures the same user is tracked across sessions.
 */
async function getOrCreateUser() {
  let { user } = await chrome.storage.local.get("user");
  if (!user || !user.userID) {
    const newUserID = `extension-user-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;
    user = { userID: newUserID };
    await chrome.storage.local.set({ user });
    console.log("Created and saved new user:", user.userID);
  }
  return user;
}

/**
 * Initializes the Statsig SDK as soon as the extension service worker starts.
 */
let statsigClient = null;

(async () => {
  const hasGlobalStatsigClient = typeof StatsigClient !== "undefined";
  const hasNamespaceStatsigClient =
    typeof Statsig !== "undefined" &&
    typeof Statsig.StatsigClient !== "undefined";
  if (!hasGlobalStatsigClient && !hasNamespaceStatsigClient) {
    console.error(
      "Statsig client not found. Ensure statsig-js-client.min.js is loaded."
    );
    return;
  }
  const user = await getOrCreateUser();
  try {
    const ClientCtor = hasGlobalStatsigClient
      ? StatsigClient
      : Statsig.StatsigClient;
    statsigClient = new ClientCtor(STATSIG_CLIENT_KEY, user, {
      loggingEnabled: "always"
    });
    await statsigClient.initializeAsync();
    console.log("Statsig initialized for user:", user.userID);
    // Emit a placeholder event so you can verify logging immediately
    try {
      const manifest = chrome.runtime.getManifest
        ? chrome.runtime.getManifest()
        : null;
      const version =
        manifest && manifest.version ? manifest.version : "unknown";
      statsigClient.logEvent("extension_alive", null, {
        version,
        userID: user.userID
      });
      await statsigClient.flush();
      console.log("Sent Statsig event: extension_alive", {
        version,
        userID: user.userID
      });
    } catch (_e) {}

    // Optional: heartbeat while the worker is alive (MV3 workers are ephemeral)
    try {
      setInterval(() => {
        try {
          statsigClient.logEvent("extension_heartbeat", Date.now());
          statsigClient.flush();
          console.log("Sent Statsig event: extension_heartbeat");
        } catch (_ee) {}
      }, 60000);
    } catch (_e) {}
  } catch (e) {
    console.error("Statsig initialization failed:", e);
  }
})();

/**
 * Listens for messages from the content script to log tracking events.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const t0 = Date.now();
  console.log("[BG] Received message", { message, sender });
  if (message.type === "TRACK_EVENT") {
    if (statsigClient) {
      (async () => {
        try {
          console.log("[BG] Logging event ->", message.eventName);
          statsigClient.logEvent(
            message.eventName,
            message.eventValue,
            message.metadata
          );
          await statsigClient.flush();
          const dt = Date.now() - t0;
          console.log(
            "[BG] Logged + flushed Statsig event:",
            message.eventName,
            "in",
            dt,
            "ms with metadata:",
            message.metadata
          );
          try {
            sendResponse({ ok: true });
          } catch (_se) {}
        } catch (err) {
          console.error("[BG] Failed to log/flush event", err);
          try {
            sendResponse({
              ok: false,
              error: String((err && err.message) || err)
            });
          } catch (_se) {}
        }
      })();
    } else {
      console.warn("[BG] Statsig is not initialized. Cannot log event.");
      try {
        sendResponse({ ok: false, error: "uninitialized" });
      } catch (_se) {}
    }
  }
  if (message.type === "DESCRIBE_IMAGE") {
    (async () => {
      try {
        if (!GEMINI_API_KEY) {
          console.warn("[BG] Gemini API key missing");
          try {
            sendResponse({ ok: false, error: "no_api_key" });
          } catch {}
          return;
        }
        const prompt = `Describe this image concisely (1–3 sentences) for a screen reader. Include:
        - Main subject and key details (pose/position)
        - Colors/textures and notable objects
        - Scene context (indoor/outdoor)
        - Visible text in the image, if any
        Avoid speculation or sensitive attributes.`;

        const body = {
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: message.mimeType || "image/jpeg",
                    data: message.base64
                  }
                }
              ]
            }
          ]
        };
        const url = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
          GEMINI_API_KEY
        )}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Gemini HTTP ${res.status}: ${txt}`);
        }
        const json = await res.json();
        let text = "";
        try {
          const parts = json.candidates?.[0]?.content?.parts || [];
          text = parts
            .map(p => p.text || "")
            .join("\n")
            .trim();
        } catch (_) {
          text = "";
        }
        if (!text) {
          // Some responses use promptFeedback/safety or alternate fields
          text = json.candidates?.[0]?.safetyRatings
            ? "(response blocked by safety)"
            : "";
        }
        if (text) {
          let cleaned = text
            .replace(/^\s*#+\s*description\s*:?/i, "")
            .replace(/^\s*(here\'s|here is)\s+a\s+description[^:]*:\s*/i, "")
            .replace(/^\s*description\s*:*/i, "")
            .replace(/^\s*(for a screen reader\s*:?)\s*/i, "")
            .trim();
          // If an initial clause up to a colon looks like a preface, drop it by index
          const colonIdx = cleaned.indexOf(":");
          const head =
            colonIdx > -1 ? cleaned.slice(0, colonIdx + 1).toLowerCase() : "";
          if (
            colonIdx > -1 &&
            head.length < 160 &&
            /(description|screen reader|summary|here\s+is)/.test(head)
          ) {
            cleaned = cleaned.slice(colonIdx + 1).trim();
          }
          cleaned = cleaned.replace(/^[-*>\s"'`]+/, "");
          text = cleaned || text;
        }
        console.log("[BG] Gemini description:", text.slice(0, 200));
        try {
          sendResponse({ ok: true, description: text, usedPrompt: prompt });
        } catch {}
      } catch (e) {
        console.error("[BG] Gemini call failed", e);
        try {
          sendResponse({ ok: false, error: String((e && e.message) || e) });
        } catch {}
      }
    })();
    return true;
  }
  // Return true to indicate you wish to send a response asynchronously
  return true;
});
