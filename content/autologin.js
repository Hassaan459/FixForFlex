// FixForFlex: signing in for you. Runs on the FLEX sign-in page in every frame. If background.js
// is in the middle of signing in again and this page is the one it opened (the hidden offscreen
// frame, or its fallback window), it fills in the roll number and password, waits for the
// Cloudflare check and clicks Sign In. Otherwise, on a normal tab, it does the same with the
// sign-in kept by Remember me, if there is one.
(() => {
  if (!document.getElementById("frmlogin")) return;
  try {
    chrome.runtime.sendMessage({ type: "autologin-ready" }, async (creds) => {
      if (chrome.runtime.lastError || !creds || !creds.roll) return rememberMe();
      const result = await fillAndSubmit(creds.roll, creds.pass);
      try { chrome.runtime.sendMessage({ type: "autologin-result", result }); } catch (_) {}
    });
  } catch (_) {}

  // Not a background sign-in: if you signed in last time with Remember me ticked (and haven't
  // pressed Logout since), sign in with that here, so FLEX's sign-in page just goes past.
  function rememberMe() {
    if (window.top !== window) return;
    try {
      chrome.runtime.sendMessage({ type: "remember-signin" }, (creds) => {
        if (chrome.runtime.lastError || !creds || !creds.roll) return;
        fillAndSubmit(creds.roll, creds.pass, true);
      });
    } catch (_) {}
  }

  async function fillAndSubmit(roll, pass, keepRemember = false) {
    const set = (el, value) => {
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const user = document.querySelector('input[name="username"]');
    const pw = document.querySelector('input[name="password"]');
    const btn = document.getElementById("m_login_signin_submit");
    if (!user || !pw || !btn) return "form-not-found";
    // FLEX sets up its roll-number mask on page load, which can clear the field: wait for it.
    if (document.readyState !== "complete") await new Promise((r) => window.addEventListener("load", r, { once: true }));
    await new Promise((r) => setTimeout(r, 300));
    set(user, roll);
    set(pw, pass);

    const token = () => document.querySelector('[name="cf-turnstile-response"]');
    for (let i = 0; i < 30; i++) {
      const t = token();
      if (!t || t.value) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    const t = token();
    if (t && !t.value) return "check-not-passed";
    if (user.value !== roll) set(user, roll);
    // Signing in for Remember me: keep the box ticked, or login.js would take it as "forget me".
    const remember = document.getElementById("remember");
    if (keepRemember && remember && !remember.checked) remember.checked = true;
    btn.click();
    return "submitted";
  }
})();
