const serverInput = document.getElementById("server");
const status = document.getElementById("status");

const { server } = await chrome.storage.local.get("server");
serverInput.value = server ?? "http://localhost:3000";

serverInput.addEventListener("change", async () => {
  // Keep only the origin, so "http://localhost:3000/" and "http://localhost:3000" are the same setting.
  const address = new URL(serverInput.value).origin;
  serverInput.value = address;
  await chrome.storage.local.set({ server: address });
});

document.getElementById("check").addEventListener("click", async () => {
  status.textContent = "Checking…";
  const { status: code, body } = await ask({ type: "call", path: "/auth/me" });
  if (code === 200) status.textContent = `Signed in as ${body.username}.`;
  else if (code === 401) status.textContent = "Not signed in. Sign in to GrabbitHole in this browser first.";
  else status.textContent = `Unexpected answer (${code}): ${JSON.stringify(body)}`;
});

const startButton = document.getElementById("start");
const stopButton = document.getElementById("stop");
const sessionStatus = document.getElementById("session");

const pageList = document.getElementById("pages");

/** A URL without its scheme or a trailing slash, which is easier to read in a narrow popup. */
function shortUrl(url) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Lists a session's pages in the order they were recorded. A page reached from somewhere other
 * than the page just above it, as after going back, says which numbered page it came from. The
 * first page of a new tab says so, and which page opened it, if a link did.
 */
function listPages({ visited, from = {}, newTab = {} }) {
  pageList.replaceChildren(
    ...visited.map((url, index) => {
      const item = document.createElement("li");
      item.textContent = shortUrl(url);
      item.title = url;
      const source = from[url];
      const sourceNumber = source && `#${visited.indexOf(source) + 1}`;
      let text = null;
      if (newTab[url]) text = source ? `new tab, from ${sourceNumber}` : "new tab";
      else if (source && source !== visited[index - 1]) text = `from ${sourceNumber}`;
      if (text) {
        const note = document.createElement("span");
        note.className = "from";
        note.textContent = text;
        item.append(note);
      }
      return item;
    }),
  );
}

/** Shows Start or Stop, depending on whether a session is recording, and the session's pages. */
async function showSession() {
  const { recording, lastSession } = await chrome.storage.local.get(["recording", "lastSession"]);
  startButton.hidden = Boolean(recording);
  stopButton.hidden = !recording;
  if (recording) {
    const pages = recording.visited.length;
    sessionStatus.textContent = `Recording. ${pages} ${pages === 1 ? "page" : "pages"} so far.`;
    listPages(recording);
  } else if (lastSession) {
    if (!sessionStatus.textContent || sessionStatus.textContent.startsWith("Recording")) {
      sessionStatus.textContent = "Last session:";
    }
    listPages(lastSession);
  } else {
    pageList.replaceChildren();
  }
}

/**
 * Sends a message to the service worker and returns its answer. If the worker gave no answer
 * (an old copy that does not know the message, or one that failed to load), it says so.
 */
async function ask(message) {
  try {
    const answer = await chrome.runtime.sendMessage(message);
    return answer ?? { status: 0, body: { error: "No answer from background.js. Reload the extension." } };
  } catch (error) {
    return { status: 0, body: { error: String(error) } };
  }
}

/** The message to show for a failed start or stop. */
function failure(code, body) {
  if (code === 401) return "Not signed in. Sign in to GrabbitHole in this browser first.";
  if (code === 0) return body.error;
  return `Unexpected answer (${code}): ${JSON.stringify(body)}`;
}

startButton.addEventListener("click", async () => {
  sessionStatus.textContent = "Starting…";
  const { status: code, body } = await ask({ type: "start" });
  if (code !== 200) sessionStatus.textContent = failure(code, body);
  await showSession();
});

stopButton.addEventListener("click", async () => {
  sessionStatus.textContent = "Stopping…";
  const { status: code, body } = await ask({ type: "stop" });
  // 404 and 409: the server no longer has the session, or it had already stopped. Either way it is over.
  sessionStatus.textContent = [200, 404, 409].includes(code) ? "Session stopped." : failure(code, body);
  await showSession();
});

chrome.storage.onChanged.addListener((changes) => {
  if ("recording" in changes || "lastSession" in changes) showSession();
});

await showSession();
