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
  const { status: code, body } = await chrome.runtime.sendMessage({ type: "call", path: "/auth/me" });
  if (code === 200) status.textContent = `Signed in as ${body.username}.`;
  else if (code === 401) status.textContent = "Not signed in. Sign in to GrabbitHole in this browser first.";
  else status.textContent = `Unexpected answer (${code}): ${JSON.stringify(body)}`;
});
