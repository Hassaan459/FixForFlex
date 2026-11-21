// FixForFlex: light/dark for the popup and Settings, from the same setting the FLEX pages use.
(() => {
  const root = document.documentElement;
  const sys = () => matchMedia("(prefers-color-scheme: dark)").matches;
  const apply = (m) => root.classList.toggle("dark", m === "dark" || (!m && sys()));
  try { apply(localStorage.getItem("mwMode")); } catch (_) {}
  chrome.storage.local.get("mwMode", (st) => apply(st.mwMode));
  chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && ch.mwMode) apply(ch.mwMode.newValue); });
})();
