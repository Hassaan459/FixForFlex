// FixForFlex: light/dark for the popup and Settings only. It has its own setting (uiMode), separate
// from FLEX's light/dark switch; unset, it follows the system.
(() => {
  const root = document.documentElement;
  const sys = () => matchMedia("(prefers-color-scheme: dark)").matches;
  const apply = (m) => root.classList.toggle("dark", m === "dark" || (!m && sys()));
  try { apply(localStorage.getItem("uiMode")); } catch (_) {}
  chrome.storage.local.get("uiMode", (st) => apply(st.uiMode));
  chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && ch.uiMode) apply(ch.uiMode.newValue); });
})();
