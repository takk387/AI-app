# Plan: Preview-Aware AI Capture (Automated Only)

Enable the AI to see the live preview (normal and fullscreen) by capturing an in-iframe screenshot and lightweight diagnostics, then attaching them to AI messages. No manual upload path; if screenshot fails, send diagnostics automatically.

## Objectives
- Capture a screenshot from Sandpack iframe using `html2canvas` injected via CDN.
- Work in normal and fullscreen (`FullAppPreview`) without code duplication.
- Attach the image (and diagnostics if capture fails) to AI messages in Chat and Full-App routes.
- Keep payloads small and respect privacy.

## Approach
1. Inject `html2canvas` in Sandpack via `externalResources`.
2. Add sandbox script (`/capture.js`) that renders `#root`, scales, and posts `{ dataUrl, diagnostics }` to parent via `postMessage`.
3. Expose `capturePreview()` from `PowerfulPreview` via `onMountCaptureApi` and return results via `onScreenshot(dataUrl, diagnostics)`.
4. Add “Capture” buttons in `FullAppPreview` for normal + fullscreen; disable while capturing; show success indicator.
5. Wire `onScreenshot` in `AIBuilder` to set `uploadedImage` and optional `previewDiagnostics`; auto-attach to next AI message.
6. Update `/api/chat` to accept `hasImage`/`image` and build image+text Anthropic messages (match `/api/ai-builder/full-app`).
7. No manual upload UI. If image fails, include diagnostics text automatically.

## Steps
- PowerfulPreview
  - Add `onMountCaptureApi` and `onScreenshot` props.
  - Inject CDN `html2canvas` in `externalResources`.
  - Create virtual file `/capture.js` and include via `/public/index.html`.
  - Bridge parent ↔ iframe: listen for `sandpack-captured` and expose `capturePreview()`.
- FullAppPreview
  - Add “Capture” buttons in normal mode (top-right overlay) and fullscreen (near Exit + in code header).
  - Call `capturePreview()`; handle busy/disabled states.
- AIBuilder
  - On `onScreenshot`, set `uploadedImage` and `previewDiagnostics`.
  - Auto-attach to outgoing AI messages; show brief "📸 Preview captured" toast.
- API Routes
  - `/api/chat`: accept `hasImage`/`image`; build Anthropic message with image block + text.
  - `/api/ai-builder/full-app`: optionally accept `previewDiagnostics`.

## Checklist
- [ ] `PowerfulPreview`: Add `onMountCaptureApi` and `onScreenshot` props
- [ ] `PowerfulPreview`: Inject CDN `html2canvas` in `externalResources`
- [ ] `PowerfulPreview`: Add sandbox `/capture.js` (render, scale, diagnostics, postMessage)
- [ ] `PowerfulPreview`: Parent `postMessage` listener; expose `capturePreview()` API
- [ ] `FullAppPreview`: Add “Capture” buttons (normal + fullscreen); disable while capturing
- [ ] `AIBuilder`: Wire `onScreenshot` → `uploadedImage`; auto-attach to next message
- [ ] `AIBuilder`: Include `previewDiagnostics` when image fails (no manual prompt)
- [ ] `/api/chat`: Accept image payloads; build Anthropic image+text messages
- [ ] `/api/ai-builder/full-app`: Optionally accept `previewDiagnostics`
- [ ] Limits: JPEG scaling (max width), quality clamp, debounce capture
- [ ] Privacy: Mask sensitive inputs within iframe before capture
- [ ] UX: Success toast “📸 Preview captured” (no manual fallback UI)

## Edge Cases & Fallbacks
- CORS/tainted canvas: In-iframe capture avoids most issues; if it still fails, send diagnostics (viewport, DOM title, recent console/error lines) automatically.
- Large images: Scale to max width (e.g., 1200px), JPEG ~0.8 quality, cap size ~400 KB.
- Throttling: Debounce captures; short cooldown between requests.
- Reliability: Key `SandpackProvider` by `appDataJson` hash if sticky state occurs.

## Validation
- Normal: Click “Capture” in preview; confirm toast and image attached to next AI message.
- Fullscreen: Capture from both preview and code tabs; confirm identical behavior.
- Fallback: Force a capture error (load cross-origin image) and confirm diagnostics are sent without manual prompts.
