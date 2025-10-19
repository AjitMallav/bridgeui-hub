# Chrome Extension: Website Interaction Tracker for Statsig

This Chrome extension tracks user interactions on a specified website and logs analytics events to Statsig. It operates without needing any modifications to the target website's source code.

## 🚀 Setup Instructions

### Step 1: Get the Statsig SDK

This extension requires the Statsig JavaScript SDK to function.

1.  Download the minified SDK file from the official CDN: [https://cdn.jsdelivr.net/npm/statsig-js/build/statsig.min.js](https://cdn.jsdelivr.net/npm/statsig-js/build/statsig.min.js)
2.  Save this file as `statsig.min.js` in the same root directory as the other extension files.

### Step 2: Configure Secrets (no hardcoded keys)

Do NOT hardcode API keys. The background script reads a generated `config.js` that is ignored by git.

- Copy `config.example.js` to `config.js` and fill in your keys:

```
cp config.example.js config.js
```

Or generate `config.js` from a `.env` at repo root or `dynamic-display-extension/.env`:

```
npm run ext:make-config
```

Keys used:

- `STATSIG_CLIENT_KEY` (required)
- `GEMINI_API_KEY` (optional; enables image descriptions)
- `GEMINI_MODEL` (optional; defaults to `models/gemini-2.0-flash-exp`)

### Step 3: Configure Tracking

1.  **`manifest.json`**:

    - Adjust `content_scripts.matches` to the sites you want to track.

2.  **`contentScript.js`**:
    - **This is the most important step.** This file determines what to track.
    - Delete the example `trackElement(...)` calls.
    - For each element you want to track, add a new `trackElement()` call with the correct CSS selector and a descriptive event name. Use your browser's DevTools (Right-click -> Inspect) on the target website to find the best selectors.

### Step 4: Load the Extension in Chrome

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable "Developer mode" using the toggle in the top-right corner.
3.  Click the "Load unpacked" button.
4.  Select the folder containing your extension's files (`manifest.json`, etc.).

### Step 5: Verify It's Working

1.  Navigate to the website you configured in `manifest.json`.
2.  Open the DevTools (**F12** or **Cmd+Option+I**).
3.  Go back to the `chrome://extensions` page and find your extension. Click the "Service Worker" link to open its console.
4.  You should see a "Statsig initialized for user: ..." message.
5.  Go back to the website and click on one of the elements you are tracking.
6.  Check the Service Worker console again. You should see a "Logged Statsig event: ..." message.
7.  Finally, check your Statsig project's "Metrics Log Stream" or "Events" page to see the events arriving in real-time.
