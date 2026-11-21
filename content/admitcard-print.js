// Marks Watcher: FLEX's printable admit card (the tab that opens straight into the print dialog).
// The card is a print document, so it gets FLEX's own layout in plain black on white:
// switch the extension's theme and dark mode off on this page only.
(() => {
  const root = document.documentElement;
  const off = () => root.classList.remove("mw-theme", "mw-dark");
  off();
  // theme.js may add the classes back while the page loads; keep them off.
  new MutationObserver(off).observe(root, { attributes: true, attributeFilter: ["class"] });
})();
