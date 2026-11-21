// Marks Watcher: FLEX's printable fee challan (the tab the Print button opens, for the bank).
// It is a print document, so it keeps FLEX's own layout in plain black on white:
// the extension's theme and dark mode are switched off on this page only.
(() => {
  const root = document.documentElement;
  const off = () => {
    if (root.classList.contains("mw-theme") || root.classList.contains("mw-dark")) root.classList.remove("mw-theme", "mw-dark");
  };
  off();
  // theme.js may add the classes back while the page loads; keep them off.
  new MutationObserver(off).observe(root, { attributes: true, attributeFilter: ["class"] });
})();
