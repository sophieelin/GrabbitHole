# Browser extension

This folder is a placeholder for the browser extension that records browsing sessions (Sophie's part). It holds only a minimal Manifest V3 file so the folder loads in Chrome: open `chrome://extensions`, turn on Developer mode, click "Load unpacked", and choose this folder.

The 6.1040 Apps platform hosts the web app, not the extension. Testers load the extension unpacked, so it needs a setting for the server's address (localhost while developing, `https://<name>.mit-sdg.dev` once deployed) instead of a hard-coded one.

## Signing in from the extension: what we know

The server keeps the sign-in session in an `HttpOnly` cookie and refuses requests to signed-in endpoints from any address other than its own. We checked this on the scaffold: a request to `/api/auth/me` with `Origin: chrome-extension://...` and a valid session cookie is answered with 403 `FORBIDDEN`.

The HTTP package documents a setting for this (see "CORS and request-origin protection" in `node_modules/@mit-sdg/sync-engine-http/README.md`). In `src/host/http.ts`, the policy can list extra origins that may call the API with the cookie:

```ts
browser: {
  origins: ["chrome-extension://<the extension's id>"],
  credentials: true,
},
```

and the extension then calls the API with `credentials: "include"`. Two things to know before relying on it:

- Origins are matched exactly, so the extension needs a fixed id. An unpacked extension's id changes between machines unless `manifest.json` has a `key`.
- With `credentials: true`, the session cookie becomes `SameSite=None`. The origin allowlist still protects the endpoints, but this is a weaker setting than the default, so it is worth a line in the design notes.

This has not been tried in a real browser yet. Try it against the deployed app early, since Alpha depends on it.
