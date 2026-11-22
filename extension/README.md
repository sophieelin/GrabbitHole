# Browser extension

The browser extension records browsing sessions. To load it: open `chrome://extensions`, turn on Developer mode, click "Load unpacked", and choose this folder.

The 6.1040 Apps platform hosts the web app, not the extension. Testers load the extension unpacked, so its popup has a setting for the server's address: `http://localhost:3000` while developing (the default), or `https://<name>.mit-sdg.dev` once deployed.

## Signing in from the extension

The extension has no sign-in of its own. The user signs in to GrabbitHole in the same browser, and the extension's requests carry that sign-in cookie (`credentials: "include"`).

The server refuses a signed-in request whose `Origin` is not the app's own address. It cannot be told to allow the extension instead: the HTTP policy accepts only `http` and `https` origins, and rejects `chrome-extension://` ones. A request with no `Origin` at all is allowed, as it is for any caller that is not a web page.

So `background.js` adds a `declarativeNetRequest` session rule that removes `Origin` from the extension's own requests to `<server>/api/`. The rule applies only to requests with no tab, so it never changes requests made by web pages, including the GrabbitHole app itself. The sign-in cookie keeps its default `SameSite=Strict`. Extension requests to a site listed in `host_permissions` are treated as same-site, so the cookie is still sent.

`tests/compositions/signing-in-http.test.ts` checks the server's side: a request with the cookie and no `Origin` is answered, and the same request with a `chrome-extension://` `Origin` is refused with 403.

All API calls go through `background.js`. Other parts of the extension send it `{ type: "call", path, body }` with `chrome.runtime.sendMessage`.

## Checking that it works

1. Run the app (`bun run dev` and the frontend's dev server) and sign in at `http://localhost:5173` in Chrome. Cookies are kept per host, not per port, so the extension's requests to `http://localhost:3000` carry the same cookie.
2. Load this folder unpacked, open the extension's popup, and click **Check sign-in**.
3. It should say "Signed in as <username>". "Not signed in" means the cookie was not sent; an answer of 403 means `Origin` was not removed.
