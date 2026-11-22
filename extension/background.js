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

/** The server's address, from the popup's setting. */
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

chrome.runtime.onInstalled.addListener(stripOrigin);
chrome.runtime.onStartup.addListener(stripOrigin);
chrome.storage.onChanged.addListener((changes) => {
  if ("server" in changes) stripOrigin();
});

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message?.type === "call") {
    call(message.path, message.body).then(reply, (error) => reply({ status: 0, body: { error: String(error) } }));
    return true; // The reply is sent asynchronously.
  }
});
