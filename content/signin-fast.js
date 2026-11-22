// FixForFlex: opening FLEX's sign-in address (a bookmark, the bare site address) while Remember me
// is on. Runs at document_start in the top frame, before the sign-in form is drawn:
// - covers the page with "Signing you in…" so the form never flashes up;
// - asks background.js whether the FLEX session is still alive, and if it is, goes straight to
//   the home page;
// - otherwise leaves content/autologin.js to sign in with the Remember me sign-in underneath.
// If nothing has happened after a while (say the Cloudflare check wants a click), the cover is
// removed so you can see the form. Nothing happens when Remember me is off.
(() => {
  if (window.top !== window) return;
  let cover;
  const uncover = () => { if (cover) { cover.remove(); cover = null; } };
  try {
    chrome.runtime.sendMessage({ type: "remember-check" }, (res) => {
      if (chrome.runtime.lastError || !res || !res.on) return;
      if (res.signedIn && res.url) { location.replace(res.url); return; }
      // Not signed in: if this page turns out to have no sign-in form, there's nothing to cover.
      const check = () => { if (!document.getElementById("frmlogin")) uncover(); };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", check, { once: true });
      else check();
      setTimeout(uncover, 25000);
    });
  } catch (_) { return; }

  cover = document.createElement("div");
  cover.className = "mw-signing";
  cover.setAttribute("role", "status");
  cover.innerHTML = '<div class="mw-signing-box"><span class="mw-signing-spin"></span><span>Signing you in…</span></div>';
  (document.body || document.documentElement).appendChild(cover);
  // Give up on the cover after a few seconds if background.js never answers.
  setTimeout(() => { if (cover && document.readyState === "complete" && !document.getElementById("frmlogin")) uncover(); }, 4000);
})();
