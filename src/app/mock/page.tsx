"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    FaceMesh?: any;
    Camera?: any;
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

type Post = {
  user: string;
  location?: string;
  time: string;
  image: string;
  likes: number;
  caption: string;
};

export default function MockPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Status
  const [tracking, setTracking] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [status, setStatus] = useState("Loading models…");
  const [showClickPopup, setShowClickPopup] = useState(false);

  // Focus state
  const focusablesRef = useRef<HTMLElement[]>([]);
  const [focusIndex, setFocusIndex] = useState(0);

  // Movement smoothing / gating
  const yawHistory = useRef<number[]>([]);
  const lastMoveRef = useRef<number>(0);
  // Blink detection state
  const eyeClosedRef = useRef(false);
  const blinkTimesRef = useRef<number[]>([]);
  const lastBlinkActionRef = useRef<number>(0);

  // --- Tunables ---
  const MOVE_COOLDOWN_MS = 650; // min time between focus moves
  const AVG_WINDOW = 8; // samples for running avg of yaw
  const YAW_THRESHOLD = 0.18; // how far to tilt before moving
  const BLINK_CLOSE_THRESHOLD = 0.19; // eye openness ratio to consider closed
  const BLINK_OPEN_THRESHOLD = 0.23; // hysteresis open threshold
  const BLINK_DOUBLE_WINDOW_MS = 300; // time window for double blink
  const BLINK_ACTION_COOLDOWN_MS = 1200; // cooldown after triggering click

  // -------- Mock content --------
  const stories = Array.from({ length: 12 }).map((_, i) => ({
    user: i === 0 ? "Your Story" : `user_${i}`,
    image: `https://picsum.photos/seed/story${i}/80/80`
  }));

  const posts: Post[] = [
    {
      user: "tartinebakery",
      location: "San Francisco, California",
      time: "2h",
      image:
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1400&auto=format&fit=crop",
      likes: 2451,
      caption: "Fresh out of the oven 🥧"
    },
    {
      user: "alexandra",
      location: "New York, NY",
      time: "4h",
      image:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400&auto=format&fit=crop",
      likes: 879,
      caption: "Golden hour stroll ☀️"
    },
    {
      user: "priya",
      location: "Tokyo",
      time: "5h",
      image:
        "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1400&auto=format&fit=crop",
      likes: 120,
      caption: "Ramen night 🍜"
    },
    {
      user: "zoe",
      location: "Studio",
      time: "1d",
      image:
        "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1400&auto=format&fit=crop",
      likes: 1543,
      caption: "Mixing all weekend 🎶"
    }
  ];

  // ---------------- Focus helpers ----------------
  const collectFocusables = () => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(
        // Include all buttons and links, including dashboard
        'button, a[href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => {
      const rect = el.getBoundingClientRect();
      return el.offsetParent !== null && rect.width > 0 && rect.height > 0;
    });

    // Sort in reading order
    els.sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > 8) return ra.top - rb.top;
      return ra.left - rb.left;
    });

    focusablesRef.current = els;
  };

  const highlightElement = (idx: number) => {
    focusablesRef.current.forEach((el, i) => {
      // ensure only one highlight at a time
      el.classList.toggle("hf-focus-on", i === idx);
      if (i !== idx) el.style.outline = "none";
    });
    const el = focusablesRef.current[idx];
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const moveFocus = (dir: "next" | "prev") => {
    const now = Date.now();
    if (now - lastMoveRef.current < MOVE_COOLDOWN_MS) return;
    lastMoveRef.current = now;

    if (!focusablesRef.current.length) return;
    setFocusIndex(prev => {
      const next =
        dir === "next"
          ? (prev + 1) % focusablesRef.current.length
          : (prev - 1 + focusablesRef.current.length) %
            focusablesRef.current.length;
      highlightElement(next);
      return next;
    });
  };

  const activateElement = () => {
    const el = focusablesRef.current[focusIndex];
    if (!el) return;

    // Links: prefer Next router for internal routes (e.g., /dashboard)
    if (el.tagName === "A") {
      const hrefAttr = (el as HTMLAnchorElement).getAttribute("href") || "";
      if (hrefAttr.startsWith("/")) {
        router.push(hrefAttr);
      } else {
        // external or absolute links
        window.location.href = (el as HTMLAnchorElement).href;
      }
      setShowClickPopup(true);
      setTimeout(() => setShowClickPopup(false), 900);
      return;
    }

    // Buttons or other focusables
    (el as HTMLButtonElement)?.click?.();
    setShowClickPopup(true);
    setTimeout(() => setShowClickPopup(false), 900);
  };

  // ------------- Load Mediapipe FaceMesh + Camera -------------
  useEffect(() => {
    const faceMeshScript = document.createElement("script");
    faceMeshScript.src =
      "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
    const cameraScript = document.createElement("script");
    cameraScript.src =
      "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";
    document.body.appendChild(faceMeshScript);
    document.body.appendChild(cameraScript);
    faceMeshScript.onload = () => setStatus("Loaded FaceMesh…");
    cameraScript.onload = () => setStatus("Loaded Camera…");
  }, []);

  // ---------------- Start head-tilt tracking ----------------
  useEffect(() => {
    const waitFor = async (cond: () => boolean, timeout = 8000) => {
      const start = Date.now();
      while (!cond()) {
        if (Date.now() - start > timeout) return false;
        await new Promise(r => setTimeout(r, 150));
      }
      return true;
    };

    (async () => {
      const ready = await waitFor(() => !!window.FaceMesh && !!window.Camera);
      if (!ready) {
        setStatus("Failed to load MediaPipe");
        return;
      }

      collectFocusables();
      highlightElement(0);

      const faceMesh = new window.FaceMesh({
        locateFile: (f: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
      });

      faceMesh.onResults((results: any) => {
        if (!results.multiFaceLandmarks?.length) return;
        const lm = results.multiFaceLandmarks[0];

        // yaw: nose vs mid-eye center scaled by eye width
        const L = lm[33];
        const R = lm[263];
        const N = lm[1];
        const dx = R.x - L.x || 1e-6;
        const yaw = (N.x - (L.x + R.x) / 2) / dx;

        // running average
        yawHistory.current.push(yaw);
        if (yawHistory.current.length > AVG_WINDOW) yawHistory.current.shift();
        const avgYaw =
          yawHistory.current.reduce((a, b) => a + b, 0) /
          yawHistory.current.length;

        // --- Blink detection (double blink to click) ---
        // Use eye aspect ratio proxy: vertical distance / horizontal distance
        const dist = (a: any, b: any) => {
          const dx = (a?.x ?? 0) - (b?.x ?? 0);
          const dy = (a?.y ?? 0) - (b?.y ?? 0);
          return Math.hypot(dx, dy);
        };
        // Left eye landmarks (MediaPipe indices)
        const leftH = dist(lm[33], lm[133]); // outer to inner corner
        const leftV = dist(lm[159], lm[145]); // upper to lower lid
        // Right eye landmarks
        const rightH = dist(lm[263], lm[362]); // inner to outer corner
        const rightV = dist(lm[386], lm[374]); // upper to lower lid
        const valid = leftH > 0 && rightH > 0;
        if (valid) {
          const leftOpen = leftV / leftH;
          const rightOpen = rightV / rightH;
          const eyeOpen = (leftOpen + rightOpen) / 2;

          if (!eyeClosedRef.current && eyeOpen < BLINK_CLOSE_THRESHOLD) {
            // Eye transitioned to closed
            eyeClosedRef.current = true;
          } else if (eyeClosedRef.current && eyeOpen > BLINK_OPEN_THRESHOLD) {
            // Eye reopened -> count one blink
            eyeClosedRef.current = false;
            const now = Date.now();
            blinkTimesRef.current.push(now);
            if (blinkTimesRef.current.length > 2) blinkTimesRef.current.shift();

            if (blinkTimesRef.current.length === 2) {
              const [t1, t2] = blinkTimesRef.current;
              if (
                t2 - t1 <= BLINK_DOUBLE_WINDOW_MS &&
                now - lastBlinkActionRef.current > BLINK_ACTION_COOLDOWN_MS
              ) {
                // Double blink detected -> activate current element
                lastBlinkActionRef.current = now;
                activateElement();
                // reset to avoid triple-triggering
                blinkTimesRef.current = [];
              }
            }
          }
        }

        if (avgYaw > YAW_THRESHOLD) moveFocus("next");
        else if (avgYaw < -YAW_THRESHOLD) moveFocus("prev");
      });

      const video = videoRef.current!;
      const camera = new window.Camera(video, {
        onFrame: async () => {
          await faceMesh.send({ image: video });
        },
        width: 640,
        height: 480
      });

      try {
        await camera.start();
        setTracking(true);
        setStatus("Tracking active");
      } catch {
        setStatus("Camera permission denied");
      }
    })();
  }, []);

  // ---------------- Speech recognition ----------------
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setStatus("SpeechRecognition not supported");
      return;
    }

    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;

    rec.onresult = (e: any) => {
      const text = e.results[e.results.length - 1][0].transcript
        .trim()
        .toLowerCase();

      // direct intents to dashboard regardless of focus
      if (
        /\b(open|go to|navigate to)\s+dashboard\b/.test(text) ||
        /^dashboard$/.test(text)
      ) {
        router.push("/dashboard");
        return;
      }

      // gaze actions
      if (/next\b/.test(text)) moveFocus("next");
      if (/(prev|back|previous)\b/.test(text)) moveFocus("prev");
      if (/(click|select|ok|enter)\b/.test(text)) activateElement();
    };

    rec.onstart = () => {
      setVoiceActive(true);
      setStatus("Listening…");
    };
    rec.onend = () => {
      setVoiceActive(false);
      // auto-restart to keep listening
      setTimeout(() => {
        try {
          rec.start();
        } catch {}
      }, 800);
    };

    try {
      rec.start();
    } catch {}
    return () => {
      try {
        rec.stop();
      } catch {}
    };
  }, [router]);

  // ---------------- Keep focusables fresh ----------------
  useEffect(() => {
    collectFocusables();
    const obs = new MutationObserver(() => collectFocusables());
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
    const onResize = () => collectFocusables();
    window.addEventListener("resize", onResize);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fff0f4] via-white to-[#eef4ff] relative overflow-x-hidden">
      {/* Click confirmation */}
      {showClickPopup && (
        <div className="fixed top-8 right-8 z-50 rounded-xl bg-purple-600 px-4 py-2 text-white font-semibold shadow-lg animate-fadeInOut">
          ✅ Clicked!
        </div>
      )}

      {/* Page shell mimicking Instagram */}
      <div className="mx-auto flex max-w-[1400px] gap-3 px-3 py-4 lg:gap-6 lg:px-6 lg:py-6">
        {/* LEFT SIDEBAR */}
        <aside className="sticky top-4 h-[calc(100vh-2rem)] w-44 shrink-0 rounded-2xl border border-slate-200 bg-white p-2 lg:w-56 lg:p-3">
          <div className="mb-4 px-2 text-xl font-semibold lg:text-2xl">
            Instagram
          </div>
          <nav className="space-y-1">
            {[
              ["Home", "🏠"],
              ["Explore", "🔎"],
              ["Messages", "✉️"],
              ["Notifications", "🔔"],
              ["Create", "➕"]
            ].map(([label, icon]) => (
              <button
                key={label}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-slate-100 lg:gap-3 lg:px-3 lg:py-2"
              >
                <span className="text-base lg:text-lg">{icon}</span>
                <span className="text-sm font-medium text-slate-900 lg:text-[15px]">
                  {label}
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-2 pt-6">
            <button className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-slate-100 lg:gap-3 lg:px-3 lg:py-2">
              <span className="text-base lg:text-lg">👤</span>
              <span className="text-sm font-medium text-slate-900 lg:text-[15px]">
                Profile
              </span>
            </button>
            {/* Back to dashboard (kept focusable so voice “click” works) */}
            <a
              href="/dashboard"
              className="mt-1 block w-full rounded-xl border border-slate-200 px-2 py-1.5 text-center text-xs font-semibold text-slate-900 hover:bg-slate-50 lg:px-3 lg:py-2 lg:text-sm"
            >
              Dashboard
            </a>
          </div>
        </aside>

        {/* CENTER FEED */}
        <section className="flex-1 space-y-6 max-w-[600px]">
          {/* Stories strip */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex gap-4 overflow-x-auto">
              {stories.map((s, i) => (
                <button key={i} className="min-w-[72px]">
                  <div className="mx-auto h-16 w-16 overflow-hidden rounded-full ring-2 ring-pink-400 ring-offset-2 ring-offset-white">
                    <img
                      src={s.image}
                      alt={s.user}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mt-1 truncate text-center text-xs text-slate-700">
                    {s.user}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Posts */}
          {posts.map((p, i) => (
            <article
              key={i}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Header */}
              <div className="flex items-center gap-3 p-3">
                <img
                  src={`https://picsum.photos/seed/avatar${i}/44/44`}
                  className="h-10 w-10 rounded-full object-cover"
                  alt={p.user}
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">
                    {p.user}
                  </div>
                  <div className="text-xs text-slate-500">
                    {p.location ?? "—"} • {p.time}
                  </div>
                </div>
                <button
                  aria-label="More options"
                  className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                >
                  ⋯
                </button>
              </div>

              {/* Image */}
              <img
                src={p.image}
                alt={p.caption}
                className="max-h-[560px] w-full object-cover"
              />

              {/* Actions */}
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Like"
                    className="rounded-lg px-3 py-1.5 font-semibold hover:bg-slate-100"
                  >
                    ❤ Like
                  </button>
                  <button
                    aria-label="Comment"
                    className="rounded-lg px-3 py-1.5 font-semibold hover:bg-slate-100"
                  >
                    💬 Comment
                  </button>
                  <button
                    aria-label="Share"
                    className="rounded-lg px-3 py-1.5 font-semibold hover:bg-slate-100"
                  >
                    ↗ Share
                  </button>
                </div>
                <button
                  aria-label="Save"
                  className="rounded-lg px-3 py-1.5 font-semibold hover:bg-slate-100"
                >
                  🔖 Save
                </button>
              </div>

              {/* Meta */}
              <div className="px-3 pb-4 text-sm">
                <div className="font-semibold text-slate-900">
                  {p.likes.toLocaleString()} likes
                </div>
                <div className="mt-1">
                  <span className="mr-1 font-semibold text-slate-900">
                    {p.user}
                  </span>
                  <span className="text-slate-800">{p.caption}</span>
                </div>
                <button className="mt-1 text-xs font-medium text-slate-500 hover:underline">
                  View all comments
                </button>
              </div>
            </article>
          ))}
        </section>

        {/* RIGHT RAIL */}
        <aside className="hidden w-64 shrink-0 xl:block xl:w-80">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <img
                  src="https://picsum.photos/seed/you/56/56"
                  className="h-14 w-14 rounded-full object-cover"
                  alt="You"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-900">
                    azevdo_drdr
                  </div>
                  <div className="text-xs text-slate-500">Azevedo</div>
                </div>
                <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white">
                  Switch
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">
                  Suggestions For You
                </div>
                <button className="rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  See All
                </button>
              </div>

              <div className="space-y-3">
                {[
                  "alex_anyways18",
                  "chantoutflowergirl",
                  "gwangurl77",
                  "mishka_songs",
                  "pierre_thecomet"
                ].map((u, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <img
                      src={`https://picsum.photos/seed/sug${i}/44/44`}
                      className="h-10 w-10 rounded-full object-cover"
                      alt={u}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-900">
                        {u}
                      </div>
                      <div className="text-xs text-slate-500">
                        Suggested for you
                      </div>
                    </div>
                    <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white">
                      Follow
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-[11px] leading-5 text-slate-400">
                About • Help • Press • API • Jobs • Privacy • Terms
                <br />
                Locations • Top Accounts • Hashtags • Language
                <div className="mt-2">
                  © {new Date().getFullYear()} INSTAGRAM FROM META (mock)
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Diagnostics */}
      <div className="mx-auto max-w-[1400px] px-3 pb-6 text-sm text-slate-600 lg:px-6">
        Status: <b>{status}</b> • Tracking: {tracking ? "✅" : "❌"} • Mic:{" "}
        {voiceActive ? "🎤" : "—"}
      </div>

      {/* Hidden video (for MediaPipe) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-0 w-0 opacity-0"
        aria-hidden
      />

      <style jsx global>{`
        /* one-at-a-time strong highlight */
        .hf-focus-on {
          position: relative;
          outline: 3px solid #7c3aed !important;
          outline-offset: 2px !important;
          border-radius: 12px !important;
          box-shadow: 0 0 0 6px rgba(124, 58, 237, 0.25),
            0 12px 28px rgba(55, 48, 163, 0.22) !important;
          transition: outline 80ms ease, box-shadow 80ms ease;
          z-index: 1;
        }

        @keyframes fadeInOut {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          20% {
            opacity: 1;
            transform: translateY(0);
          }
          80% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-10px);
          }
        }
        .animate-fadeInOut {
          animation: fadeInOut 900ms ease-in-out forwards;
        }

        /* belt-and-suspenders: never allow horizontal scroll */
        html,
        body,
        main {
          max-width: 100vw;
          overflow-x: hidden;
        }
      `}</style>
    </main>
  );
}
