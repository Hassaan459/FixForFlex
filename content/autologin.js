// FixForFlex: background sign-in. Runs on the FLEX sign-in page in every frame, but does
// nothing unless background.js is in the middle of signing in again and this page is the one
// it opened (the hidden offscreen frame, or its fallback window). Then it fills in the saved
// roll number and password, waits for the Cloudflare check and clicks Sign In.
(() => {
  if (!document.getElementById("frmlogin")) return;
  let reply;
  try {
    chrome.runtime.sendMessage({ type: "autologin-ready" }, async (creds) => {
      if (chrome.runtime.lastError || !creds || !creds.roll) return;
      const result = await fillAndSubmit(creds.roll, creds.pass);
      try { chrome.runtime.sendMessage({ type: "autologin-result", result }); } catch (_) {}
    });
  } catch (_) {}

  async function fillAndSubmit(roll, pass) {
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
    btn.click();
    return "submitted";
  }
})();
