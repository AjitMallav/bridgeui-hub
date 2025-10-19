'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    FaceMesh?: any;
    Camera?: any;
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

interface Article {
  title: string;
  author: string;
  date: string;
  excerpt: string;
  content: string;
}

export default function MockPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [tracking, setTracking] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [status, setStatus] = useState('Loading models...');
  const [focusIndex, setFocusIndex] = useState(0);
  const [showClickPopup, setShowClickPopup] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const focusablesRef = useRef<HTMLElement[]>([]);
  const yawHistory = useRef<number[]>([]);
  const lastMoveRef = useRef<number>(0);

  const articles: Article[] = [
    {
      title: 'AI Revolutionizes Accessibility in 2025',
      author: 'Sarah Lin',
      date: 'Oct 18, 2025',
      excerpt:
        'From gesture-controlled interfaces to brain-computer links, assistive technology is redefining inclusion...',
      content:
        'As accessibility continues to evolve, AI-driven tools like voice navigation and facial tracking are changing the way users interact with digital systems...',
    },
    {
      title: 'NASA Discovers Organic Compounds on Europa',
      author: 'James Porter',
      date: 'Oct 17, 2025',
      excerpt:
        'The new data from Europa Clipper suggest potential conditions for microbial life beneath the icy crust...',
      content:
        'In a landmark discovery, NASA scientists confirmed that Europa’s surface hides organic molecules essential to life. The Clipper mission’s findings...',
    },
    {
      title: 'Neural Implants Enter Clinical Trials in the US',
      author: 'Priya Shah',
      date: 'Oct 16, 2025',
      excerpt:
        'Brain-computer interfaces are being tested for use in restoring motion and sensory control...',
      content:
        'Several biotech firms have begun clinical testing of neural implants designed to help patients with motor disabilities regain mobility...',
    },
    {
      title: 'Breakthrough in Quantum Battery Technology',
      author: 'Daniel Ruiz',
      date: 'Oct 15, 2025',
      excerpt:
        'Scientists unveil a quantum-based energy storage system that charges in seconds...',
      content:
        'Researchers from MIT and ETH Zurich have demonstrated a prototype quantum battery that charges 200 times faster than conventional cells...',
    },
    {
      title: 'Global Push for AI Ethics Legislation',
      author: 'Elena Garcia',
      date: 'Oct 13, 2025',
      excerpt:
        'As nations race to regulate artificial intelligence, global collaboration is emerging as key...',
      content:
        'Following years of fragmented policy, countries are uniting to define global AI ethics standards...',
    },
  ];

  // Collect focusable elements (only meaningful UI)
  const collectFocusables = () => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, a[href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter(
      (el) =>
        el.offsetParent !== null &&
        el.getBoundingClientRect().width > 0 &&
        !el.classList.contains('ignore-handsfree')
    );
    focusablesRef.current = els;
  };

  const highlightElement = (idx: number) => {
    focusablesRef.current.forEach((el, i) => {
      el.style.outline = i === idx ? '3px solid #7c3aed' : 'none';
      el.style.transition = 'outline 0.25s ease';
    });
    const el = focusablesRef.current[idx];
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const moveFocus = (dir: 'next' | 'prev') => {
    const now = Date.now();
    if (now - lastMoveRef.current < 600) return;
    lastMoveRef.current = now;

    if (!focusablesRef.current.length) return;
    setFocusIndex((prev) => {
      const next =
        dir === 'next'
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
    if (el.tagName === 'A' && (el as HTMLAnchorElement).href.includes('/dashboard'))
      return;

    el.click();
    setShowClickPopup(true);
    setTimeout(() => setShowClickPopup(false), 1000);
  };

  // Load Mediapipe
  useEffect(() => {
    const faceMeshScript = document.createElement('script');
    faceMeshScript.src =
      'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
    const cameraScript = document.createElement('script');
    cameraScript.src =
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js';
    document.body.appendChild(faceMeshScript);
    document.body.appendChild(cameraScript);
    faceMeshScript.onload = () => setStatus('Loaded FaceMesh...');
    cameraScript.onload = () => setStatus('Loaded Camera...');
  }, []);

  // Start tracking
  useEffect(() => {
    const waitFor = async (cond: () => boolean, timeout = 6000) => {
      const start = Date.now();
      while (!cond()) {
        if (Date.now() - start > timeout) return false;
        await new Promise((r) => setTimeout(r, 200));
      }
      return true;
    };

    (async () => {
      const ready = await waitFor(() => !!window.FaceMesh && !!window.Camera);
      if (!ready) {
        setStatus('Failed to load MediaPipe');
        return;
      }

      collectFocusables();

      const faceMesh = new window.FaceMesh({
        locateFile: (f: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      faceMesh.onResults((results: any) => {
        if (!results.multiFaceLandmarks?.length) return;
        const landmarks = results.multiFaceLandmarks[0];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const nose = landmarks[1];
        const dx = rightEye.x - leftEye.x;
        const yaw = (nose.x - (leftEye.x + rightEye.x) / 2) / dx;

        yawHistory.current.push(yaw);
        if (yawHistory.current.length > 8) yawHistory.current.shift();
        const avgYaw =
          yawHistory.current.reduce((a, b) => a + b, 0) /
          yawHistory.current.length;

        const THRESHOLD = 0.18;
        if (avgYaw > THRESHOLD) moveFocus('next');
        else if (avgYaw < -THRESHOLD) moveFocus('prev');
      });

      const video = videoRef.current!;
      const camera = new window.Camera(video, {
        onFrame: async () => {
          await faceMesh.send({ image: video });
        },
        width: 640,
        height: 480,
      });
      camera.start();
      setTracking(true);
      setStatus('Tracking active');
    })();
  }, []);

  // Voice commands
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setStatus('SpeechRecognition not supported');
      return;
    }

    const rec = new SR();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = false;

    rec.onresult = (e: any) => {
      const text = e.results[e.results.length - 1][0].transcript
        .trim()
        .toLowerCase();
      if (/next/.test(text)) moveFocus('next');
      if (/prev|back/.test(text)) moveFocus('prev');
      if (/click|select|ok|enter/.test(text)) activateElement();
    };

    rec.onstart = () => {
      setVoiceActive(true);
      setStatus('Listening...');
    };
    rec.onend = () => {
      setVoiceActive(false);
      setTimeout(() => rec.start(), 800);
    };
    rec.start();
    return () => rec.stop();
  }, []);

  // Render
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative">
      {showClickPopup && (
        <div className="fixed top-8 right-8 z-50 rounded-xl bg-indigo-600 px-4 py-2 text-white font-semibold shadow-lg animate-fadeInOut">
          ✅ Clicked!
        </div>
      )}

      <header className="border-b border-slate-300 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <h1 className="text-xl font-bold text-indigo-700">BridgeUI News</h1>
          <nav className="flex gap-6 text-slate-700">
            <button>Home</button>
            <button>World</button>
            <button>Tech</button>
            <button>Science</button>
            <button>Opinion</button>
            <a
              href="/dashboard"
              className="ignore-handsfree rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-50"
            >
              Dashboard
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-6 grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {articles.map((a, i) => (
            <article
              key={i}
              className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm hover:shadow-md transition"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {a.title}
              </h2>
              <p className="text-sm text-slate-500">
                {a.author} • {a.date}
              </p>
              <p className="mt-2 text-slate-800">{a.excerpt}</p>
              <button
                className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-white font-semibold"
                onClick={() =>
                  setExpandedIndex(expandedIndex === i ? null : i)
                }
              >
                {expandedIndex === i ? 'Hide' : 'Read More'}
              </button>
              {expandedIndex === i && (
                <p className="mt-3 text-slate-700">{a.content}</p>
              )}
            </article>
          ))}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl border border-slate-300 bg-white p-4">
            <h3 className="text-slate-900 font-semibold mb-2">
              Trending Topics
            </h3>
            <ul className="space-y-1 text-slate-700">
              <li>🌍 Climate Innovation</li>
              <li>🧠 Brain-Computer Interfaces</li>
              <li>🚀 Space Exploration</li>
              <li>⚖️ AI Regulation</li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-300 bg-white p-4">
            <h3 className="text-slate-900 font-semibold mb-2">About Us</h3>
            <p className="text-slate-700 text-sm">
              BridgeUI News explores the intersection of accessibility, ethics,
              and emerging technology.
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-8 flex justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-64 h-48 rounded-xl border border-slate-300 shadow-sm"
        />
      </div>

      <style jsx global>{`
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
          animation: fadeInOut 1s ease-in-out forwards;
        }
      `}</style>
    </main>
  );
}