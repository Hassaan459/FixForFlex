// Marks Watcher: applies the theme and light/dark mode as early as possible (no flash of the old look).
(() => {
  const root = document.documentElement;
  root.classList.add("mw-theme");

  const KEY = "mwMode"; // "light" | "dark"; unset = follow the system setting
  const systemDark = () => window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (_) {}
  const apply = (mode) => root.classList.toggle("mw-dark", mode === "dark" || (!mode && systemDark()));
  apply(saved);

  try {
    chrome.storage.local.get(["themeEnabled", KEY], (st) => {
      if (st.themeEnabled === false) root.classList.remove("mw-theme");
      if (st[KEY] && st[KEY] !== saved) { saved = st[KEY]; apply(saved); try { localStorage.setItem(KEY, saved); } catch (_) {} }
    });
  } catch (_) {}

  const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  function addButton() {
    if (document.querySelector(".mw-mode-btn")) return;
    // Sits just left of "Hello Mr, <name>" in FLEX's top bar.
    const profile = document.querySelector(".m-topbar__user-profile");
    const anchor = profile && profile.querySelector(":scope > a");
    if (!profile && !document.querySelector(".m-header")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mw-mode-btn";
    const paint = () => {
      const dark = root.classList.contains("mw-dark");
      btn.innerHTML = dark ? `${SUN}<span>Light</span>` : `${MOON}<span>Dark</span>`;
      btn.title = dark ? "Switch to light mode" : "Switch to dark mode";
    };
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      saved = root.classList.contains("mw-dark") ? "light" : "dark";
      apply(saved);
      paint();
      try { localStorage.setItem(KEY, saved); } catch (_) {}
      try { chrome.storage.local.set({ [KEY]: saved }); } catch (_) {}
    });
    paint();
    btn.addEventListener("mousedown", (e) => e.stopPropagation());
    if (profile && anchor) {
      profile.style.display = "inline-flex";
      profile.style.alignItems = "center";
      profile.insertBefore(btn, anchor);
    } else {
      document.querySelector(".m-header").appendChild(btn);
    }
  }
  // FLEX's semester dropdown submits a form (POST), so pressing reload afterwards asks
  // "Resubmit the form?". Swap the history entry for a plain link to the same page and semester,
  // so reload just reloads.
  function noResubmit() {
    try {
      const url = new URL(location.href);
      const sem = document.getElementById("SemId");
      if (sem && sem.value && !url.searchParams.has("semid")) url.searchParams.set("semid", sem.value);
      history.replaceState(history.state, "", url.href);
    } catch (_) {}
  }

  const ready = () => { addButton(); noResubmit(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
