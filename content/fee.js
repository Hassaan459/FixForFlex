// Marks Watcher: tidies FLEX's Fee Challan (Student/Challan) and Fee Details (ConsolidatedFeeReport) pages.
// Keeps FLEX's layout, tables, buttons and modals; only adds classes for fee.css and formats amounts.
// The printable challan form (opened by the Print button) is handled by fee-print.js.
(() => {
  "use strict";
  const root = document.documentElement;

  const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const commas = (n) => n.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  function headText() {
    return [...document.querySelectorAll(".m-portlet__head-text")].map(txt).join(" ");
  }

  function challan() {
    root.classList.add("mw-fee", "mw-fee-challan");
    const layout = document.querySelector(".m-portlet__body .m-section__content > table");
    if (layout) layout.classList.add("mw-fee-layout");
    const inner = layout && layout.querySelector("td > table");
    if (inner) {
      inner.classList.add("mw-fee-list");
      inner.removeAttribute("style");
      const cols = inner.querySelectorAll("thead th").length;
      inner.querySelectorAll("tbody tr").forEach((tr) => {
        const cells = [...tr.children];
        // Amount: "194500 Rs." -> "194,500 Rs."
        const amt = cells[1];
        if (amt && /^\d{4,}\s*Rs\.?$/i.test(txt(amt))) amt.textContent = txt(amt).replace(/^\d+/, commas);
        // Status as a quiet word in colour
        const st = cells[4];
        if (st) {
          const v = txt(st).toLowerCase();
          st.classList.add("mw-fee-status", v === "paid" ? "mw-fee-paid" : "mw-fee-unpaid");
        }
        // FLEX leaves the KuickPay cell out on paid rows; an empty cell keeps the rules lined up
        for (let i = cells.length; i < cols; i++) tr.appendChild(document.createElement("td"));
      });
    }
    const info = layout && [...layout.querySelectorAll(":scope > tbody > tr > td")].find((td) => /paid using/i.test(txt(td)));
    if (info) {
      info.classList.add("mw-fee-howto");
      info.removeAttribute("style");
      // "1. Via bank account..." and "2. Print the challan..." are the two methods; the rest are steps and notes
      info.querySelectorAll(":scope > p").forEach((p) => { if (/^\d\.\s/.test(txt(p))) p.classList.add("mw-fee-method"); });
    }
  }

  function details() {
    root.classList.add("mw-fee", "mw-fee-details");
    const title = document.querySelector(".m-header .m-subheader__title");
    if (title && txt(title) === "FeeDetails") title.textContent = "Fee Details";

    // FLEX fills the semester rows and the expanded breakdown after the page loads, so watch for them.
    const box = document.getElementById("sample_StdFeeDetail");
    if (!box) return;
    const fmt = () => {
      box.querySelectorAll('[id^="rowStdDetailHeader_"] p').forEach((p) => {
        const t = txt(p);
        if (/^\(?\d{4,}\)?$/.test(t)) p.textContent = t.replace(/\d+/, commas);
        p.classList.toggle("mw-fee-zero", t === "0");
      });
    };
    fmt();
    new MutationObserver(fmt).observe(box, { childList: true, subtree: true });
  }

  function run() {
    const head = headText();
    if (/Student Challan/i.test(head)) challan();
    else if (/Collection Detail/i.test(head) || document.getElementById("sample_CollectionDetail")) details();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
