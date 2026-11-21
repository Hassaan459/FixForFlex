// FixForFlex: Tentative Study Plan (/Student/TentativeStudyPlan).
// Under each semester heading: its credit hours and an estimated tuition fee
// (credit hours x the per-credit fee set in Settings, Rs 11,000 by default). Non-credit courses
// are left out. It's an estimate of tuition only; other charges on the real challan aren't included.
(() => {
  const nf = new Intl.NumberFormat("en-PK");

  function semesterTable(h) {
    // FLEX puts the heading and its table in the same column; fall back to the next table after it.
    let el = h.nextElementSibling;
    while (el && el.tagName !== "TABLE" && !el.querySelector("table")) el = el.nextElementSibling;
    if (el) return el.tagName === "TABLE" ? el : el.querySelector("table");
    const col = h.closest(".col-md-6, .col-lg-6, [class*='col-']");
    return col ? col.querySelector("table") : null;
  }

  function credits(table) {
    const head = [...table.querySelectorAll("thead th, tr:first-child th")].map((th) => th.textContent.trim().toLowerCase());
    let cr = head.findIndex((t) => /\bcr\b|credit|\bch\b/.test(t));
    let type = head.findIndex((t) => /\btype\b/.test(t));
    if (cr < 0) cr = 2;
    if (type < 0) type = 3;
    let sum = 0;
    for (const row of table.querySelectorAll("tbody tr")) {
      const cells = row.querySelectorAll("td");
      if (cells.length <= cr) continue;
      if (cells[type] && /non[\s-]*credit/i.test(cells[type].textContent)) continue;
      const n = parseFloat(cells[cr].textContent);
      if (Number.isFinite(n)) sum += n;
    }
    return sum;
  }

  function run(rate) {
    document.querySelectorAll(".ff-fee").forEach((e) => e.remove());
    if (!rate) return;
    const heads = [...document.querySelectorAll(".m-section__content h4, h4")]
      .filter((h) => /semester/i.test(h.textContent));
    for (const h of heads) {
      const table = semesterTable(h);
      if (!table) continue;
      const cr = credits(table);
      if (!cr) continue;
      const line = document.createElement("div");
      line.className = "ff-fee";
      line.textContent = `${cr} credit hours · Est. fee Rs ${nf.format(cr * rate)}`;
      line.title = `${cr} credit hours × Rs ${nf.format(rate)} per credit hour. Tuition only. Change the rate in FixForFlex Settings.`;
      h.insertAdjacentElement("afterend", line);
    }
  }

  const load = () => chrome.storage.local.get("feePerCredit", (st) => run(st.feePerCredit === undefined ? 11000 : Number(st.feePerCredit)));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load); else load();
  chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && ch.feePerCredit) load(); });
})();
