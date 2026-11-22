// Marks Watcher: FLEX sign-in page.
// 1. Makes "Remember me" work: FLEX's own version looks for an #username field that doesn't exist,
//    so it never saved anything. Here, ticking it saves your roll number in the extension's storage
//    and fills it in (with the box ticked) next time. Unticking it forgets the roll number.
//    Ticking it also keeps you signed in: background.js stops FLEX's session from timing out
//    until you press Logout.
//    Your password is never stored here; Chrome's own password manager can offer to save it.
// 2. Adds the light/dark switch, since the sign-in page has no top bar for theme.js to put it in.
// Nothing here renames, moves or replaces the fields, the Sign In button or the Cloudflare box,
// so background.js auto-login keeps working.
(() => {
  // Logout on any FLEX page: stop keeping the session going (background.js) until the next
  // sign-in with Remember me ticked, so FixForFlex never signs you back in after you signed out.
  document.addEventListener("click", (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[href*="/Login/logout" i]');
    if (a) { try { chrome.storage.local.set({ mwKeepSignedIn: false }); } catch (_) {} }
  }, true);

  const form = document.getElementById("frmlogin");
  if (!form) return; // not the sign-in page

  const user = form.querySelector('input[name="username"]');
  const pass = form.querySelector('input[name="password"]');
  const remember = form.querySelector("#remember");
  const signIn = document.getElementById("m_login_signin_submit");
  const KEY = "mwRememberRoll";

  // Lets Chrome's password manager recognise the form.
  if (user) user.setAttribute("autocomplete", "username");
  if (pass) pass.setAttribute("autocomplete", "current-password");

  const store = {
    get: (cb) => { try { chrome.storage.local.get(KEY, (st) => cb(st && st[KEY])); } catch (_) { cb(null); } },
    set: (v) => { try { chrome.storage.local.set({ [KEY]: v }); } catch (_) {} },
    clear: () => { try { chrome.storage.local.remove(KEY); } catch (_) {} },
  };

  const fill = (roll) => {
    if (!user || !roll || user.value) return; // never overwrite what's already typed (or filled by auto-login)
    user.value = roll;
    user.dispatchEvent(new Event("input", { bubbles: true }));
    user.dispatchEvent(new Event("change", { bubbles: true }));
  };

  if (user && remember) {
    store.get((roll) => {
      if (!roll) return;
      remember.checked = true;
      fill(roll);
      if (pass && !pass.value && document.hasFocus()) pass.focus();
      // FLEX sets up its roll-number mask on page load; fill again if that cleared the field.
      window.addEventListener("load", () => setTimeout(() => fill(roll), 50), { once: true });
    });

    const save = () => {
      const roll = (user.value || "").trim();
      if (remember.checked && roll) store.set(roll);
      else if (!remember.checked) store.clear();
      // Remember me also keeps you signed in: background.js keeps the FLEX session from timing out.
      try { chrome.storage.local.set({ mwKeepSignedIn: remember.checked }); } catch (_) {}
    };
    remember.addEventListener("change", () => { if (!remember.checked) store.clear(); });
    // Capture phase, so this runs before FLEX's own click handler. Pressing Enter also "clicks" Sign In.
    if (signIn) signIn.addEventListener("click", save, true);
    form.addEventListener("submit", save, true);
  }

  // ---------- Light/dark switch (same storage and look as the one on the other pages) ----------
  const root = document.documentElement;
  const aside = document.querySelector(".m-login__aside");
  if (!aside || document.querySelector(".mw-mode-btn")) return;
  const MODE = "mwMode";
  const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const btn = document.createElement("button");
  btn.type = "button"; // never submits the form
  btn.className = "mw-mode-btn mw-login-mode";
  const paint = () => {
    const dark = root.classList.contains("mw-dark");
    btn.innerHTML = dark ? `${SUN}<span>Light</span>` : `${MOON}<span>Dark</span>`;
    btn.title = dark ? "Switch to light mode" : "Switch to dark mode";
  };
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const mode = root.classList.contains("mw-dark") ? "light" : "dark";
    root.classList.toggle("mw-dark", mode === "dark");
    paint();
    try { localStorage.setItem(MODE, mode); } catch (_) {}
    try { chrome.storage.local.set({ [MODE]: mode }); } catch (_) {}
  });
  // theme.js may switch the mode a moment after load (from extension storage); keep the label right.
  new MutationObserver(paint).observe(root, { attributes: true, attributeFilter: ["class"] });
  paint();
  aside.prepend(btn);
})();
