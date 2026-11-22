// FixForFlex: Tentative Study Plan (/Student/TentativeStudyPlan).
// Under each semester heading: its credit hours and an estimated tuition fee
// (credit hours x the per-credit fee, Rs 11,000 by default, editable in a small bar above the semesters). Non-credit courses
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

  function semesterHeads() {
    return [...document.querySelectorAll(".m-section__content h4, h4")].filter((h) => /semester/i.test(h.textContent));
  }

  // Rate bar above the first semester: "Fee per credit hour Rs [11000]", saved for next time.
  function rateBar(heads, rate) {
    let bar = document.querySelector(".ff-fee-bar");
    if (!bar) {
      if (!heads.length) return;
      bar = document.createElement("label");
      bar.className = "ff-fee-bar";
      bar.innerHTML = `<span>Fee per credit hour</span><span class="ff-fee-rs">Rs</span><input type="number" min="0" step="500">`;
      const input = bar.querySelector("input");
      let t;
      input.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => chrome.storage.local.set({ feePerCredit: Math.max(0, Math.round(Number(input.value) || 0)) }), 400);
      });
      const first = heads[0];
      const anchor = first.closest(".row") || first;
      anchor.insertAdjacentElement("beforebegin", bar);
    }
    const input = bar.querySelector("input");
    if (document.activeElement !== input) input.value = rate;
  }

  function run(rate) {
    document.querySelectorAll(".ff-fee").forEach((e) => e.remove());
    const heads = semesterHeads();
    rateBar(heads, rate);
    if (!rate) return;
    for (const h of heads) {
      const table = semesterTable(h);
      if (!table) continue;
      const cr = credits(table);
      if (!cr) continue;
      const line = document.createElement("div");
      line.className = "ff-fee";
      line.textContent = `${cr} credit hours · Est. fee Rs ${nf.format(cr * rate)}`;
      line.title = `${cr} credit hours × Rs ${nf.format(rate)} per credit hour. Tuition only. Change the rate above the semesters.`;
      h.insertAdjacentElement("afterend", line);
    }
  }

  const load = () => chrome.storage.local.get("feePerCredit", (st) => run(st.feePerCredit === undefined ? 11000 : Number(st.feePerCredit)));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load); else load();
  chrome.storage.onChanged.addListener((ch, area) => { if (area === "local" && ch.feePerCredit) load(); });
})();
