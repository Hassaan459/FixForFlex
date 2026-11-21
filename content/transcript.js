// Marks Watcher: makes the FLEX Transcript page easier to read, inside FLEX's own semester sections.
//  - Replaces the cramped "Cr. Att:51  Cr. Ernd:35  CGPA:2.71  SGPA:0" line with labelled figures:
//    this semester's credits, SGPA, CGPA (with the change from last semester) and total credits earned.
//    FLEX's Cr. Att/Ernd are running totals, so a semester's credits are added up from its table
//    (non-credit courses left out).
//  - Grades that aren't out yet ("I") become a small "Pending" picker: choose the grade you expect and
//    the semester's SGPA and CGPA are worked out as a what-if. Picks are remembered in this browser.
//  - Under a pending semester: the SGPA needed this semester to reach a target CGPA you type in.
//  - Retake what-if: any past grade is a quiet picker. Choose the grade you'd hope to get on a retake
//    and the latest CGPA shows what it would become (a retake replaces the old grade in the CGPA).
//  - Standing: a small "Dean's List" (SGPA 3.5+) or "Probation" (CGPA below 2.00) tag under a semester.
//  The rest of the restyling is pure CSS in transcript.css.
(() => {
  "use strict";
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const num = (s) => { const n = parseFloat(s); return Number.isFinite(n) ? n : null; };
  const POINTS = { "A+": 4, A: 4, "A-": 3.67, "B+": 3.33, B: 3, "B-": 2.67, "C+": 2.33, C: 2, "C-": 1.67, "D+": 1.33, D: 1, F: 0 };
  const TARGETS = [2, 2.5, 3, 3.5, 3.75];
  const TARGET_KEY = "mwTargetCgpa";
  const KEY = "mwWhatIf";
  let picks = {};
  try { picks = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (_) { picks = {}; }
  const savePicks = () => { try { localStorage.setItem(KEY, JSON.stringify(picks)); } catch (_) {} };
  const RETAKE_KEY = "mwRetakes";
  let retakes = {};
  try { retakes = JSON.parse(localStorage.getItem(RETAKE_KEY) || "{}") || {}; } catch (_) { retakes = {}; }
  const saveRetakes = () => { try { localStorage.setItem(RETAKE_KEY, JSON.stringify(retakes)); } catch (_) {} };
  const DEANS_LIST = 3.5, PROBATION = 2.0;

  const f2 = (n) => (n === null || !Number.isFinite(n) ? "–" : n.toFixed(2));
  const fig = (label, value, cls = "", extra = "") =>
    `<span class="mw-ts-fig ${cls}"><small>${label}</small><b>${value}</b>${extra}</span>`;

  function col(table, re, fallback) {
    const i = [...table.querySelectorAll("thead th")].findIndex((th) => re.test(txt(th)));
    return i < 0 ? fallback : i;
  }

  function readStats(box) {
    const out = {};
    box.querySelectorAll("span").forEach((s) => {
      const m = txt(s).match(/^(Cr\.?\s*Att|Cr\.?\s*Ernd|CGPA|SGPA)\s*:\s*([\d.]+)/i);
      if (m) out[m[1].replace(/[\s.]/g, "").toLowerCase()] = m[2];
    });
    return out; // { cratt, crernd, cgpa, sgpa }
  }

  // ---- Read every semester once ----
  const sems = [];
  document.querySelectorAll(".m-section__content > .row > .col-md-6").forEach((el) => {
    if (el.dataset.mwDone) return;
    const table = el.querySelector("table");
    const box = el.querySelector(".pull-right");
    if (!table || !box) return;
    el.dataset.mwDone = "1";
    const c = { cr: col(table, /crd|credit/i, 3), gr: col(table, /grade/i, 4), pt: col(table, /point/i, 5), ty: col(table, /type/i, 6) };
    const rows = [];
    table.querySelectorAll("tbody tr").forEach((tr) => {
      const td = tr.children;
      if (!td[c.gr]) return;
      rows.push({
        code: txt(td[0]).toUpperCase(),
        credits: num(txt(td[c.cr])) || 0,
        counts: !/non\s*credit/i.test(txt(td[c.ty])),
        grade: txt(td[c.gr]).toUpperCase(),
        gradeTd: td[c.gr], pointTd: td[c.pt],
      });
    });
    sems.push({ el, box, rows, stats: readStats(box), name: txt(el.querySelector("h5")) });
  });
  if (!sems.length) return;

  // Effective grade of a row: the real one, or the what-if pick for a pending one.
  const gradeOf = (r) => (r.grade === "I" ? picks[r.code] || null : r.grade);

  // Cumulative quality points up to and including semester i. A repeated course counts only its
  // latest graded attempt, as in the CGPA.
  function cumulative(i, usePicks) {
    const latest = new Map();
    for (let k = 0; k <= i; k++) {
      sems[k].rows.forEach((r) => {
        const g = usePicks ? gradeOf(r) : r.grade === "I" ? null : r.grade;
        if (!r.counts || !g || !(g in POINTS)) return;
        latest.set(r.code, { credits: r.credits, qp: POINTS[g] * r.credits });
      });
    }
    // A retake what-if replaces the course's latest grade.
    if (usePicks) latest.forEach((v, code) => { if (retakes[code] in POINTS) v.qp = POINTS[retakes[code]] * v.credits; });
    let credits = 0, qp = 0;
    latest.forEach((v) => { credits += v.credits; qp += v.qp; });
    return { credits, qp, gpa: credits ? qp / credits : null };
  }

  function semesterGpa(s, usePicks) {
    let credits = 0, qp = 0;
    s.rows.forEach((r) => {
      const g = usePicks ? gradeOf(r) : r.grade === "I" ? null : r.grade;
      if (!r.counts || !g || !(g in POINTS)) return;
      credits += r.credits; qp += POINTS[g] * r.credits;
    });
    return { credits, gpa: credits ? qp / credits : null };
  }

  function delta(now, before) {
    if (now === null || before === null) return "";
    const d = Math.round((now - before) * 100) / 100;
    if (!d) return `<em class="mw-ts-delta">±0.00</em>`;
    return `<em class="mw-ts-delta ${d > 0 ? "mw-up" : "mw-down"}">${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(2)}</em>`;
  }

  // FLEX's own CGPA for semester i (falls back to our sum if missing).
  const flexCgpa = (i) => { const n = num(sems[i].stats.cgpa); return n === null ? cumulative(i, false).gpa : n; };

  const last = sems.length - 1;
  const anyRetake = () => Object.keys(retakes).length > 0;

  function renderFigures(i) {
    const s = sems[i];
    const credits = s.rows.reduce((a, r) => a + (r.counts ? r.credits : 0), 0);
    const pending = s.rows.filter((r) => r.grade === "I");
    const prevCgpa = i > 0 ? flexCgpa(i - 1) : null;
    let sgpaHtml, cgpaHtml;

    const retakeHere = i === last && anyRetake();
    if (!pending.length) {
      sgpaHtml = fig("SGPA", f2(num(s.stats.sgpa)));
      if (retakeHere) {
        const cg = cumulative(i, true).gpa;
        cgpaHtml = fig("What-if CGPA", f2(cg), "mw-ts-whatif", delta(cg, flexCgpa(i)));
      } else cgpaHtml = fig("CGPA", f2(flexCgpa(i)), "", delta(flexCgpa(i), prevCgpa));
    } else {
      const picked = pending.some((r) => picks[r.code] && r.counts);
      const graded = s.rows.length - pending.length;
      if (picked || retakeHere) {
        sgpaHtml = picked ? fig("What-if SGPA", f2(semesterGpa(s, true).gpa), "mw-ts-whatif")
          : graded ? fig("SGPA so far", f2(semesterGpa(s, false).gpa)) : fig("SGPA", "Pending", "mw-ts-pending");
        const cg = cumulative(i, true).gpa;
        cgpaHtml = fig("What-if CGPA", f2(cg), "mw-ts-whatif", delta(cg, prevCgpa));
      } else {
        sgpaHtml = graded ? fig("SGPA so far", f2(semesterGpa(s, false).gpa)) : fig("SGPA", "Pending", "mw-ts-pending");
        cgpaHtml = fig("CGPA", f2(flexCgpa(i)));
      }
    }
    s.box.innerHTML = `<span class="mw-ts-figs">${fig("Credits", credits)}${sgpaHtml}${cgpaHtml}${s.stats.crernd ? fig("Total earned", s.stats.crernd) : ""}</span>`;
    s.box.title = `FLEX: Cr. Att ${s.stats.cratt ?? "?"} · Cr. Ernd ${s.stats.crernd ?? "?"} · CGPA ${s.stats.cgpa ?? "?"} · SGPA ${s.stats.sgpa ?? "?"}`;
  }

  // "To reach a [3.00] CGPA you need a 3.58 SGPA this semester." Uses real grades only.
  function renderTarget(i, line) {
    const s = sems[i];
    const before = cumulative(i - 1 >= 0 ? i - 1 : -1, false);
    // Credits still to be graded this semester (pending, credit-bearing, not a repeat of nothing).
    const S = s.rows.reduce((a, r) => a + (r.grade === "I" && r.counts ? r.credits : 0), 0);
    const doneThis = semesterGpa(s, false);
    const P = before.credits + doneThis.credits, Q = before.qp + doneThis.credits * (doneThis.gpa || 0);
    if (!S) { line.remove(); return; }
    const cur = P ? Q / P : 0;
    let saved = null;
    try { saved = localStorage.getItem(TARGET_KEY); } catch (_) {}
    const start = saved || (TARGETS.find((t) => t > cur + 0.005) ?? 4).toFixed(2);

    // A small text box you type the CGPA into; the sentence after it updates as you type.
    line.innerHTML = `To reach a CGPA of <input type="text" inputmode="decimal" maxlength="4" class="mw-ts-target" aria-label="Target CGPA" placeholder="3.00"> <span class="mw-ts-target-tail"></span>`;
    const input = line.querySelector("input");
    const tailEl = line.querySelector(".mw-ts-target-tail");
    input.value = start;
    const update = () => {
      const raw = input.value.trim();
      const T = parseFloat(raw);
      input.classList.toggle("mw-bad", !!raw && !(T > 0 && T <= 4));
      if (!raw) { tailEl.textContent = "(type the CGPA you want)"; return; }
      if (!(T > 0 && T <= 4)) { tailEl.textContent = "(type a CGPA between 0 and 4)"; return; }
      try { localStorage.setItem(TARGET_KEY, raw); } catch (_) {}
      const need = (T * (P + S) - Q) / S;
      if (need > 4.0001) {
        const best = (Q + 4 * S) / (P + S);
        tailEl.innerHTML = `you'd need more than a 4.00 SGPA, so not this semester. Straight A's would take you to <b>${best.toFixed(2)}</b>.`;
      } else if (need <= 0) tailEl.textContent = "you're already there, whatever you get.";
      else tailEl.innerHTML = `you need an SGPA of <b>${need.toFixed(2)}</b> this semester.`;
    };
    input.addEventListener("input", update);
    update();
  }

  // ---- Build ----
  sems.forEach((s, i) => {
    const pending = s.rows.filter((r) => r.grade === "I");
    pending.forEach((r) => {
      const sel = document.createElement("select");
      sel.className = "mw-ts-pick";
      sel.title = "Grade not out yet. Pick the grade you expect to see a what-if SGPA and CGPA.";
      sel.setAttribute("aria-label", `Expected grade for ${r.code}`);
      sel.innerHTML = `<option value="">Pending</option>` + Object.keys(POINTS).map((g) => `<option${picks[r.code] === g ? " selected" : ""}>${g}</option>`).join("");
      r.gradeTd.textContent = "";
      r.gradeTd.classList.add("mw-ts-i");
      r.gradeTd.appendChild(sel);
      const paintPoints = () => {
        const g = picks[r.code];
        if (!r.pointTd) return;
        r.pointTd.textContent = g ? POINTS[g].toFixed(2).replace(/\.?0+$/, "") : "–";
        r.pointTd.classList.toggle("mw-ts-dash", !g);
        r.pointTd.classList.toggle("mw-ts-whatif-pt", !!g);
        sel.classList.toggle("mw-picked", !!g);
      };
      paintPoints();
      sel.addEventListener("change", () => {
        if (sel.value) picks[r.code] = sel.value; else delete picks[r.code];
        savePicks();
        paintPoints();
        renderFigures(i);
      });
    });
    s.rows.forEach((r) => {
      if (r.grade === "F") r.gradeTd.classList.add("mw-ts-f");
      if (!(r.grade in POINTS) || !r.counts) return;
      // Only the latest attempt of a course can be retaken.
      if (sems.slice(i + 1).some((t) => t.rows.some((x) => x.code === r.code))) return;
      const actualPt = r.pointTd ? r.pointTd.textContent : "";
      const sel = document.createElement("select");
      sel.className = "mw-ts-retake";
      sel.title = "Try a retake grade to see what your CGPA would become";
      sel.setAttribute("aria-label", `Retake what-if for ${r.code}`);
      sel.innerHTML = `<option value="">${r.grade}</option>` +
        Object.keys(POINTS).filter((g) => g !== r.grade).map((g) => `<option value="${g}"${retakes[r.code] === g ? " selected" : ""}>${r.grade} → ${g}</option>`).join("");
      r.gradeTd.textContent = "";
      r.gradeTd.appendChild(sel);
      const paint = () => {
        const g = retakes[r.code];
        sel.classList.toggle("mw-picked", !!g);
        if (r.pointTd) {
          r.pointTd.textContent = g ? POINTS[g].toFixed(2).replace(/\.?0+$/, "") : actualPt;
          r.pointTd.classList.toggle("mw-ts-whatif-pt", !!g);
        }
      };
      paint();
      sel.addEventListener("change", () => {
        if (sel.value) retakes[r.code] = sel.value; else delete retakes[r.code];
        saveRetakes();
        paint();
        renderFigures(last);
      });
    });

    renderFigures(i);

    // Standing tag for a finished semester.
    if (!pending.length) {
      const sg = num(s.stats.sgpa), cg = flexCgpa(i);
      const tags = [];
      if (sg !== null && sg >= DEANS_LIST) tags.push(`<span class="mw-ts-tag mw-ts-tag-good" title="SGPA ${sg.toFixed(2)} (3.50 or more)">Dean's List</span>`);
      if (cg !== null && cg > 0 && cg < PROBATION) tags.push(`<span class="mw-ts-tag mw-ts-tag-bad" title="CGPA ${cg.toFixed(2)} is below 2.00">Probation</span>`);
      const h5 = s.el.querySelector("h5");
      if (tags.length && h5) {
        const wrap = document.createElement("div");
        wrap.className = "mw-ts-notes";
        wrap.innerHTML = tags.join(" ");
        h5.insertAdjacentElement("afterend", wrap);
      }
    }

    if (pending.length) {
      const h5 = s.el.querySelector("h5");
      const wrap = document.createElement("div");
      wrap.className = "mw-ts-notes";
      const note = document.createElement("div");
      note.className = "mw-ts-note";
      note.textContent = pending.length === s.rows.length ? "Grades not out yet" : `${pending.length} of ${s.rows.length} grades not out yet`;
      const target = document.createElement("div");
      target.className = "mw-ts-target-line";
      wrap.append(note, target);
      if (h5) h5.insertAdjacentElement("afterend", wrap);
      renderTarget(i, target);
    }
  });
})();
