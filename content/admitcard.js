// Marks Watcher: FLEX "Print Admit Card" page. Keeps FLEX's button and what it does;
// adds a printer icon on the button.
(() => {
  const btn = document.getElementById("btnPrintAdmitCard");
  if (!btn) return;
  document.documentElement.classList.add("mw-admit");
  if (!btn.querySelector("svg")) {
    btn.insertAdjacentHTML("afterbegin",
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="1"/><path d="M6 14h12v7H6z"/></svg>');
  }
})();
