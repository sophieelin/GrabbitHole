/**
 * What a member can do with a source's own address, from the graph's menu or the source panel:
 * open the page it came from, or copy its address. Both use the complete stored URL, never the
 * shortened name the graph shows.
 */

/**
 * The address to link to, or null when it is not a web page. Only `http` and `https` addresses
 * are opened, so a stored `javascript:` or `data:` address can never run in GrabbitHole.
 */
export function webAddress(url: string): string | null {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Opens the source's page in a new tab, leaving GrabbitHole where it is. The new page gets no
 * handle back to this one (`noopener`) and is not told where the visit came from (`noreferrer`).
 * Returns false when the address is not a web page.
 */
export function openSource(url: string): boolean {
  const address = webAddress(url);
  if (address === null) return false;
  window.open(address, "_blank", "noopener,noreferrer");
  return true;
}

/** Copies the source's complete address to the clipboard. Resolves to whether it was copied. */
export async function copySourceUrl(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // The clipboard API is missing outside a secure context (such as http on a LAN address) and
    // can be refused; the older way still works in those cases.
    return copyTheOldWay(url);
  }
}

function copyTheOldWay(text: string): boolean {
  const box = document.createElement("textarea");
  box.value = text;
  box.setAttribute("readonly", "");
  box.style.position = "fixed";
  box.style.opacity = "0";
  document.body.append(box);
  const focused = document.activeElement as HTMLElement | null;
  box.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  box.remove();
  focused?.focus();
  return copied;
}
