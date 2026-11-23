/**
 * The extension's service worker. Every call to the GrabbitHole API goes through here.
 *
 * The server refuses a signed-in request whose `Origin` is not the app's own address, and it does
 * not accept `chrome-extension://` addresses at all. It does accept a request with no `Origin`,
 * which is what non-browser callers send. So a session rule removes `Origin` from the requests
 * this extension makes to the server's API; it does not touch requests made from web pages.
 */

const DEFAULT_SERVER = "http://localhost:3000";
const ORIGIN_RULE = 1;

/** The server's address, from the side panel's setting. */
async function server() {
  const { server } = await chrome.storage.local.get("server");
  return server ?? DEFAULT_SERVER;
}

/** Removes `Origin` from this extension's own requests (no tab) to the server's API. */
async function stripOrigin() {
  const address = await server();
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ORIGIN_RULE],
    addRules: [
      {
        id: ORIGIN_RULE,
        priority: 1,
        action: { type: "modifyHeaders", requestHeaders: [{ header: "origin", operation: "remove" }] },
        condition: {
          urlFilter: `|${address}/api/`,
          tabIds: [chrome.tabs.TAB_ID_NONE],
          resourceTypes: ["xmlhttprequest"],
        },
      },
    ],
  });
}

/** Calls an API endpoint with the browser's sign-in cookie; returns the parsed JSON body. */
async function call(path, body = {}) {
  await stripOrigin();
  const response = await fetch(`${await server()}/api${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

// Clicking the toolbar button opens the side panel, which stays open while the user browses.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error("Setting up the side panel failed:", error));

chrome.runtime.onInstalled.addListener(stripOrigin);
chrome.runtime.onStartup.addListener(stripOrigin);
chrome.storage.onChanged.addListener((changes) => {
  if ("server" in changes) stripOrigin();
});

/*
 * Recording a browsing session. The service worker can be stopped at any time, so the active
 * session is kept in storage:
 *
 * - `visited`: the URLs recorded so far, in order.
 * - `from`: for each recorded URL, the page it was reached from, if any.
 * - `newTab`: the URLs that were the first page of a tab opened during the session.
 * - `tabs`: for each tab, the last page visited in it.
 * - `opened`: each tab opened during the session, with the page it was opened from (a link opened
 *   in a new tab), or null (a blank new tab, where the user typed an address or a search).
 *
 * Each tab is a path of its own, and only following a link makes a connection. A link followed in
 * a tab connects from the last page visited in that tab; the first page of a tab opened by a link
 * connects from the page with the link. Any other navigation (typing an address, a search from the
 * address bar, the back button) is sent as its own source, so it gets no connection. A page already
 * recorded is sent again only when a link led to it; otherwise it just becomes the tab's last page,
 * so the next link branches from it.
 *
 * When the session stops, its pages are kept as `lastSession` so the side panel can still list them.
 */

/** The active session's state, or null when no session is recording. */
async function recording() {
  const { recording } = await chrome.storage.local.get("recording");
  if (!recording) return null;
  // Sessions started before tabs were tracked have no `newTab`, `tabs` or `opened`.
  return { from: {}, newTab: {}, tabs: {}, opened: {}, ...recording };
}

/** Starts a session; returns the server's answer. */
async function startSession() {
  const answer = await call("/sessions/start");
  if (answer.status === 200) {
    await chrome.storage.local.set({
      recording: { browsingSession: answer.body.browsingSession, visited: [], from: {}, newTab: {}, tabs: {}, opened: {} },
    });
  }
  return answer;
}

/** Forgets the active session, keeping its pages as `lastSession` for the side panel's list. */
async function forget(state) {
  const { visited, from, newTab } = state;
  await chrome.storage.local.set({ lastSession: { visited, from, newTab } });
  await chrome.storage.local.remove("recording");
}

/** Stops the active session; returns the server's answer. The session is forgotten either way. */
async function stopSession() {
  const state = await recording();
  if (!state) return { status: 200, body: {} };
  await forget(state);
  return call("/sessions/stop", { browsingSession: state.browsingSession });
}

/** Notes a tab opened during the session; `sourceTabId` is the tab whose link opened it, if any. */
async function tabOpened(tabId, sourceTabId) {
  const state = await recording();
  if (!state) return;
  // Chrome does not promise which of the two events comes first, so a blank start never replaces a link's.
  if (sourceTabId === undefined && tabId in state.opened) return;
  const from = sourceTabId === undefined ? null : (state.tabs[sourceTabId] ?? null);
  await chrome.storage.local.set({ recording: { ...state, opened: { ...state.opened, [tabId]: from } } });
}

/** Forgets a closed tab. */
async function tabClosed(tabId) {
  const state = await recording();
  if (!state) return;
  const { [tabId]: _tab, ...tabs } = state.tabs;
  const { [tabId]: _opened, ...opened } = state.opened;
  await chrome.storage.local.set({ recording: { ...state, tabs, opened } });
}

/**
 * Whether a navigation followed a link, from what Chrome reports about it. Typing an address,
 * searching from the address bar, a bookmark, a reload, or the back and forward buttons are not.
 */
function followedLink({ transitionType, transitionQualifiers = [] }) {
  return transitionType === "link" && !transitionQualifiers.includes("forward_back");
}

/** Records one navigation in a tab in the active session, if there is one. */
async function recordPage(tabId, url, link) {
  const state = await recording();
  if (!state) return;
  const last = state.tabs[tabId];
  if (url === last) return; // A reload.
  const firstInNewTab = last === undefined && tabId in state.opened;
  const source = link ? (last ?? state.opened[tabId] ?? null) : null;
  const tabs = { ...state.tabs, [tabId]: url };
  const isNew = !state.visited.includes(url);

  // A page already recorded, reached without following a link: nothing to record, but the tab's
  // next link now leads from it.
  if (!isNew && !source) {
    await chrome.storage.local.set({ recording: { ...state, tabs } });
    return;
  }
  // Sessioning adds no connection when sourceUrl is url itself, and never duplicates one.
  const answer = await call("/sessions/visit", {
    browsingSession: state.browsingSession,
    url,
    sourceUrl: source ?? url,
  });
  if (answer.status === 200) {
    await chrome.storage.local.set({
      recording: {
        ...state,
        tabs,
        visited: isNew ? [...state.visited, url] : state.visited,
        from: isNew && source ? { ...state.from, [url]: source } : state.from,
        newTab: isNew && firstInNewTab ? { ...state.newTab, [url]: true } : state.newTab,
      },
    });
  } else if ([403, 404, 409].includes(answer.status)) {
    // The session is someone else's (403), unknown (404, as after the in-memory server restarts),
    // or stopped (409). Over HTTP these arrive as FORBIDDEN, NOT_FOUND and CONFLICT.
    await forget(state);
  }
}

/*
 * Starting, stopping and recording run one at a time, so each page load sees the last page the one
 * before it set, and a visit still in flight cannot write a stopped session back into storage.
 */
let queue = Promise.resolve();
function inTurn(task) {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  const answer = (promise) => promise.then(reply, (error) => reply({ status: 0, body: { error: String(error) } }));
  if (message?.type === "call") answer(call(message.path, message.body));
  else if (message?.type === "start") {
    if (!chrome.webNavigation) reply({ status: 0, body: { error: "Page loads cannot be recorded: the webNavigation permission is missing. Reload the extension." } });
    else answer(inTurn(startSession));
  }
  else if (message?.type === "stop") answer(inTurn(stopSession));
  else return;
  return true; // The reply is sent asynchronously.
});

// Registered after the message listener, so the side panel still gets answers if this permission is missing.
if (chrome.webNavigation) {
  // onCommitted, not onCompleted, because only it says how the navigation happened.
  chrome.webNavigation.onCommitted.addListener((details) => {
    const { tabId, frameId, url } = details;
    if (frameId !== 0 || !/^https?:/.test(url)) return;
    const link = followedLink(details);
    inTurn(() => recordPage(tabId, url, link)).catch((error) => console.error("Recording a visit failed:", error));
  });
  // A link opened in a new tab.
  chrome.webNavigation.onCreatedNavigationTarget.addListener(({ tabId, sourceTabId }) => {
    inTurn(() => tabOpened(tabId, sourceTabId)).catch((error) => console.error("Noting a new tab failed:", error));
  });
} else {
  console.error("The webNavigation permission is missing, so page loads are not recorded. Reload the extension.");
}

// Any tab opened during the session starts blank, unless a link opened it (see above).
chrome.tabs.onCreated.addListener(({ id }) => {
  inTurn(() => tabOpened(id)).catch((error) => console.error("Noting a new tab failed:", error));
});
chrome.tabs.onRemoved.addListener((tabId) => {
  inTurn(() => tabClosed(tabId)).catch((error) => console.error("Forgetting a tab failed:", error));
});
