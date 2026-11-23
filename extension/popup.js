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
  await showAdd(recording ? null : lastSession);
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

/*
 * Adding a stopped session's graph to a project. A new project's only member and reviewer is its
 * creator, so the extension proposes the graph and accepts it at once, which merges it. An existing
 * project's reviewers accept or reject the proposal themselves.
 */
const addSection = document.getElementById("add");
const addStatus = document.getElementById("addStatus");
const knownSelect = document.getElementById("known");

/** Shows the section for a stopped session, greyed out once the session was added to a project. */
async function showAdd(lastSession) {
  addSection.hidden = !lastSession?.browsingSession;
  if (addSection.hidden) return;
  const added = lastSession.addedTo;
  for (const button of addSection.querySelectorAll("button")) button.disabled = Boolean(added);
  if (added) addStatus.textContent = `Added to ${added}.`;
  else await listKnown();
}

/** Remembers that the stopped session was added to the project `name`. */
async function markAdded(name) {
  const { lastSession } = await chrome.storage.local.get("lastSession");
  await chrome.storage.local.set({ lastSession: { ...lastSession, addedTo: name } });
}

/** Lists the user's projects, from the server. */
async function listKnown() {
  const { status: code, body } = await ask({ type: "call", path: "/projects/mine" });
  const projects = code === 200 ? body.projects : [];
  knownSelect.replaceChildren(
    ...projects.map(({ project, name }) => Object.assign(document.createElement("option"), { value: project, textContent: name })),
  );
  document.getElementById("existing").hidden = projects.length === 0;
}

/** Calls an endpoint; returns its body, or throws the message to show. HTTP refusals are categories. */
async function callOrThrow(path, body) {
  const { status: code, body: answer } = await ask({ type: "call", path, body });
  if (code === 200) return answer;
  const reasons = {
    NOT_FOUND: "The server doesn't have that session or project (it may have restarted).",
    CONFLICT: "Stop the session first.",
    FORBIDDEN: "You aren't allowed to add this session to that project.",
  };
  throw new Error(reasons[answer?.error] ?? failure(code, answer));
}

/** Proposes the stopped session's graph to `project`; returns the proposal. */
async function proposeTo(project) {
  const { lastSession } = await chrome.storage.local.get("lastSession");
  const { graph } = await callOrThrow("/sessions/graph", { browsingSession: lastSession.browsingSession });
  const { proposal } = await callOrThrow("/projects/contributions/submit", { project, other: graph.graph });
  return proposal;
}

/** Runs one add, showing its progress and outcome. */
async function adding(working, task) {
  addStatus.textContent = working;
  try {
    addStatus.textContent = await task();
  } catch (error) {
    addStatus.textContent = error.message;
  }
}

document.getElementById("create").addEventListener("click", () => {
  const input = document.getElementById("newProject");
  const name = input.value.trim();
  if (!name) return;
  adding("Creating project…", async () => {
    const { project } = await callOrThrow("/projects/create", { name });
    input.value = "";
    await listKnown();
    const proposal = await proposeTo(project);
    await callOrThrow("/projects/contributions/accept", { proposal });
    await markAdded(name);
    return `Added to ${name}.`;
  });
});

document.getElementById("propose").addEventListener("click", () => {
  const project = knownSelect.value;
  if (!project) return;
  adding("Proposing…", async () => {
    await proposeTo(project);
    const name = knownSelect.selectedOptions[0].textContent;
    await markAdded(name);
    return `Added to ${name}. A reviewer in the project can now accept it.`;
  });
});

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
