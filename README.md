## Chameleon — a dynamic accessibility sidekick

Chameleon adapts web interfaces to each user’s unique needs. It detects signs of limited motor control (like repeated near‑misses when clicking small targets) and dynamically enlarges or highlights interactive elements to make them easier to use. It can also generate alt‑text for user‑generated images and capture interaction telemetry to learn and improve experiences over time.

### Demo

Watch the [demo](https://www.youtube.com/watch?v=mZF4A8rwYWM) on YouTube:

[![Watch the video](https://img.youtube.com/vi/mZF4A8rwYWM/hqdefault.jpg)](https://www.youtube.com/watch?v=mZF4A8rwYWM)

### Inspiration

Chloe has taught young children for over three years and saw ADHD and dyslexia increasingly impact learning. Ajit cares for his grandmother and saw how aging impaired fine motor skills and vision, making everyday technology difficult. As the world relies more on technology, it often lacks empathy for people with disabilities. We combined our observations to build a service that bridges the gap between standard web experiences and the needs of people with disabilities.

### What it does

- **ADHD**: reduces animations, highlights key elements, hides distracting UI
- **Dyslexia**: improves readability with OpenDyslexic, adjusted spacing, clearer links
- **Low vision**: increases global zoom and contrast, generates alt‑text for images
- **Limited motor control**: enlarges buttons, adds spacing, enables dwell click, hands‑free mode concepts using head movement and voice

Current repository features include:

- **Misclick detection and adaptive enlargement**: detects repeated near‑misses on small click targets and persistently enlarges them for easier interaction.
- **On‑hover image descriptions**: after hovering an image for a few seconds, requests concise alt‑text via the Gemini API and shows it as a tooltip (if enabled).
- **Instrumentation without code changes**: logs interactions to Statsig from a content script injected into any site.

### What’s next for Chameleon

We plan to collect first‑hand user feedback to refine features, expand to more disabilities, and deepen the hands‑free experience.

---

## Repository overview

- `dynamic-display-extension/`: Chrome extension (MV3) for interaction tracking, misclick‑aware UI adaptation, and optional on‑hover image descriptions via Gemini.
- `src/app/`: Next.js app for the landing site and basic flows.
- `scripts/`: helper scripts to generate extension config and produce distributable zips.

Key files in the extension:

- `manifest.json`: MV3 manifest with service worker and content script injected on `<all_urls>` at `document_start`.
- `background.js`: initializes Statsig, receives events, and optionally calls Gemini for image descriptions.
- `contentScript.js`: instruments clicks, near‑misses, and image hovers; performs adaptive enlargement of small targets.
- `config.example.js` → `config.js`: runtime keys consumed by the background service worker (do not commit `config.js`).

Events emitted to Statsig (examples): `extension_alive`, `extension_heartbeat`, `content_script_loaded`, `element_clicked`, `image_hovered`.

---

## Getting started

### Prerequisites

- Node.js 18+
- Google Chrome or Chromium‑based browser
- (Optional) Google Gemini API key for image descriptions
- Statsig client key

### Install dependencies (hub site)

```bash
npm install
```

### Run the landing site

```bash
npm run dev
# Visit http://localhost:3000
```

### Configure the extension

You can provide keys via a generated `dynamic-display-extension/config.js` or by manually copying the example.

Option A: generate using inline env (no .env file):

```bash
# One-shot: pass keys inline for this command only
STATSIG_CLIENT_KEY=your-statsig-client-key \
GEMINI_API_KEY=your-gemini-key \
GEMINI_MODEL=models/gemini-2.0-flash-exp \
npm run ext:make-config
```

Option B: generate from an extension-specific `.env` (preferred if you want persistence):

```bash
printf "STATSIG_CLIENT_KEY=your-statsig-client-key\n" > dynamic-display-extension/.env
printf "GEMINI_API_KEY=your-gemini-key\n" >> dynamic-display-extension/.env  # optional
printf "GEMINI_MODEL=models/gemini-2.0-flash-exp\n" >> dynamic-display-extension/.env  # optional
npm run ext:make-config
```

Option C: copy and edit the example:

```bash
cp dynamic-display-extension/config.example.js dynamic-display-extension/config.js
# Edit dynamic-display-extension/config.js with your keys
```

Notes

- `STATSIG_CLIENT_KEY` is required to send telemetry.
- `GEMINI_API_KEY` enables on‑hover image descriptions. Omit or leave empty to disable.
- `GEMINI_MODEL` defaults to `models/gemini-2.0-flash-exp` if not set.
- The Statsig browser bundle `statsig-js-client.min.js` is already included in `dynamic-display-extension/`.
  The config generator reads environment variables from either inline values, `dynamic-display-extension/.env` (preferred), or a repo‑root `.env` if present — a root `.env` is not required.

### Load the extension in Chrome

1. Open `chrome://extensions` and enable Developer Mode.
2. Click “Load unpacked” and select the `dynamic-display-extension/` folder.
3. Open the extension’s Service Worker console and the target website to verify logs.

You should see logs like “Statsig initialized…”, “extension_alive”, and, upon interaction, “element_clicked” / “image_hovered”.

### Package the extension

- Public zip (excludes keys) written to `public/downloads/bridgeui-extension.zip`:

```bash
npm run ext:zip
```

- Private zip (includes your `config.js`) written to `dist/bridgeui-extension-with-keys.zip`:

```bash
npm run ext:zip-private
```

Security note: never commit `dynamic-display-extension/config.js`. The public zip excludes it by default.

---

## Acknowledgments

- Statsig for powerful analytics tooling
- Google Gemini for image understanding
- Next.js and Tailwind CSS for a productive web stack
