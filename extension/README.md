# Browser extension

The browser extension records browsing sessions. To load it: open `chrome://extensions`, turn on Developer mode, click "Load unpacked", and choose this folder.

The 6.1040 Apps platform hosts the web app, not the extension. Testers load the extension unpacked, so its popup has a setting for the server's address: `http://localhost:3000` while developing (the default), or `https://<name>.mit-sdg.dev` once deployed.

## Signing in from the extension

The extension has no sign-in of its own. The user signs in to GrabbitHole in the same browser, and the extension's requests carry that sign-in cookie (`credentials: "include"`).

The server refuses a signed-in request whose `Origin` is not the app's own address. It cannot be told to allow the extension instead: the HTTP policy accepts only `http` and `https` origins, and rejects `chrome-extension://` ones. A request with no `Origin` at all is allowed, as it is for any caller that is not a web page.

So `background.js` adds a `declarativeNetRequest` session rule that removes `Origin` from the extension's own requests to `<server>/api/`. The rule applies only to requests with no tab, so it never changes requests made by web pages, including the GrabbitHole app itself. The sign-in cookie keeps its default `SameSite=Strict`. Extension requests to a site listed in `host_permissions` are treated as same-site, so the cookie is still sent.

`tests/compositions/signing-in-http.test.ts` checks the server's side: a request with the cookie and no `Origin` is answered, and the same request with a `chrome-extension://` `Origin` is refused with 403.

All API calls go through `background.js`. Other parts of the extension send it `{ type: "call", path, body }` with `chrome.runtime.sendMessage`.

## Recording a session

**Start session** in the popup calls `/sessions/start` and keeps the new session in `chrome.storage.local`, along with the URLs recorded so far and the last page visited. Storage is used because Chrome can stop the service worker between page loads. **Stop session** calls `/sessions/stop` and forgets the session.

While a session is recording, `background.js` listens for `chrome.webNavigation.onCommitted` in each tab's top frame and records `http` and `https` pages. Following the notes on Sessioning in `f3/concept-design.md`, only following a link makes a connection, and each tab is a path of its own:

- A link followed in a tab is sent to `/sessions/visit` with the last page visited in that tab as its `sourceUrl`. A link opened in a new tab (`chrome.webNavigation.onCreatedNavigationTarget`) has the page with the link as its `sourceUrl`.
- Any other navigation (typing an address, searching from the address bar, a bookmark, the back and forward buttons) is sent as its own `sourceUrl`, so Sessioning records the page with no connection. Chrome reports which kind each navigation is (`transitionType` and `transitionQualifiers`).
- A page already recorded is sent again only when a link led to it, so the new connection is recorded; Sessioning does not duplicate a connection. Reached any other way, it is not sent, but it becomes the tab's last page, so the next link branches from it. Going back to a page and following a different link from it works this way.
- Reloading a tab's last page does nothing.

The popup lists the session's pages in the order they were first recorded. The first page of a new tab says "new tab", with the page that opened it if a link did. Any other page reached from somewhere other than the page just above it, as after going back or switching tabs, says which numbered page it came from. The extension keeps this list itself, from what it sent. It does not read the session's graph from the server, and it does not show a link that led back to a page already listed. After **Stop session**, the popup keeps listing the last session's pages until a new one starts.

Starting, stopping, recording and tab events run one at a time, so each page load sees the last page the one before it set. If the server refuses a visit because the session is stopped (409), unknown (404, for example after the in-memory server restarts) or someone else's (403), the extension forgets the session and the popup shows **Start session** again.

## Checking that it works

1. Run the app (`bun run dev` and the frontend's dev server) and sign in at `http://localhost:5173` in Chrome. Cookies are kept per host, not per port, so the extension's requests to `http://localhost:3000` carry the same cookie.
2. Load this folder unpacked, open the extension's popup, and click **Check sign-in**.
3. It should say "Signed in as <username>". "Not signed in" means the cookie was not sent; an answer of 403 means `Origin` was not removed.
4. Click **Start session**, open a page, follow a link from it, go back, and follow a different link. The popup should list three pages, the third marked "from #1". Then open a link from it in a new tab, and do a search in a blank new tab: the popup should mark the first "new tab, from #3" and the second "new tab".
5. Click **Stop session**. The popup should say "Session stopped." and show **Start session** again.
