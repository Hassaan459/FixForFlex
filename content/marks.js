// Marks Watcher: fixes the totals on the FLEX StudentMarks page, inside FLEX's own sections.
//  - Each category's "Total" row gets the real weightage (FLEX truncates it to a whole number)
//    and a weighted class average.
//  - "Grand Total Marks" is always open and filled in, using FLEX's own class stats request.
(() => {
  "use strict";

  const num = (s) => {
    const m = String(s == null ? "" : s).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : NaN;
  };
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");
  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(2) : "");

  function columnMap(table) {
    const headRow = table.querySelector("thead tr");
    const map = {};
    if (!headRow) return map;
    [...headRow.children].forEach((th, i) => {
      const h = txt(th).toLowerCase();
      if (map.weight == null && /weight/.test(h)) map.weight = i;
      else if (map.obtained == null && /obtain/.test(h)) map.obtained = i;
      else if (map.total == null && /^total/.test(h)) map.total = i;
      else if (map.avg == null && /average/.test(h)) map.avg = i;
    });
    return map;
  }

  // Works out one category table and corrects its Total row in place.
  function fixCategory(table) {
    const col = columnMap(table);
    if (col.obtained == null || col.total == null || col.weight == null) return null;
    const r = { weight: 0, earned: 0, classEarned: 0, classWeight: 0, gradedWeight: 0, rawObt: 0, rawOut: 0, rawClass: 0, rawClassOut: 0 };

    table.querySelectorAll("tr.calculationrow").forEach((tr) => {
      const cells = tr.children;
      const w = num(txt(cells[col.weight]));
      let o = num(txt(cells[col.obtained]));
      const t = num(txt(cells[col.total]));
      const a = col.avg != null ? num(txt(cells[col.avg])) : NaN;
      if (Number.isFinite(w)) r.weight += w;
      if (!(Number.isFinite(t) && t > 0)) return;
      // "-" with a class average = assessment held, no marks for you (absent): counts as 0.
      if (!Number.isFinite(o) && Number.isFinite(a)) {
        o = 0;
        const c = cells[col.obtained];
        if (c && !c.querySelector(".mw-absent")) c.innerHTML = '<span class="mw-absent">Absent</span>';
      }
      if (!Number.isFinite(o)) return; // not graded yet
      r.rawObt += o; r.rawOut += t;
      if (Number.isFinite(a)) { r.rawClass += a; r.rawClassOut += t; }
      if (!Number.isFinite(w)) return;
      r.gradedWeight += w;
      r.earned += (o / t) * w;
      if (Number.isFinite(a)) { r.classEarned += (a / t) * w; r.classWeight += w; }
    });

    // Teacher hasn't set weightages yet (all 0): fall back to raw marks.
    r.unweighted = r.weight === 0 && r.rawOut > 0;
    const foot = table.querySelector('tr[class^="totalColumn_"]');
    if (foot && r.unweighted) {
      const set = (sel, v) => { const c = foot.querySelector(sel); if (c) c.textContent = v; };
      set(".totalColweightage", "Not set");
      set(".totalColObtMarks", `${+r.rawObt.toFixed(2)} / ${+r.rawOut.toFixed(2)}`);
      if (r.rawClassOut) set(".totalColAverageMarks", fmt(r.rawClass));
      foot.classList.add("mw-total-row");
    } else if (foot) {
      const set = (sel, v) => { const c = foot.querySelector(sel); if (c) c.textContent = v; };
      set(".totalColweightage", fmt(r.weight));
      set(".totalColObtMarks", fmt(r.earned));
      if (r.classWeight) set(".totalColAverageMarks", fmt((r.classEarned / r.classWeight) * r.gradedWeight));
      foot.classList.add("mw-total-row");
    }
    const coll = table.closest(".collapse");
    const btn = coll && document.querySelector(`[data-target="#${CSS.escape(coll.id)}"]`);
    tidyTable(table, btn ? txt(btn) : "");
    return r;
  }

  const SHORT = [
    [/#\s*$/, "Item"], [/^weight/i, "Weight"], [/^obtain/i, "Obtained"], [/^total marks/i, "Out of"],
    [/^average/i, "Class avg"], [/^standard dev/i, "Std dev"], [/^minimum/i, "Min"], [/^maximum/i, "Max"],
  ];
  // Shorter headers, and hide columns that have no data at all (e.g. an empty Std Dev column).
  function tidyTable(table, catName) {
    const head = table.querySelector("thead tr");
    if (!head) return;
    const col = columnMap(table);
    const singular = (catName || "").replace(/s$/i, "");
    table.querySelectorAll("tr.calculationrow").forEach((tr) => {
      const first = tr.children[0];
      const n = txt(first);
      if (singular && /^\d+$/.test(n)) first.textContent = `${singular} ${n}`;
      if (col.obtained != null && tr.children[col.obtained]) tr.children[col.obtained].classList.add("mw-obt-cell");
    });
    const ths = [...head.children];
    ths.forEach((th) => { const t = txt(th); for (const [re, v] of SHORT) if (re.test(t)) { th.textContent = v; break; } });
    const rows = [...table.querySelectorAll("tr.calculationrow")];
    ths.forEach((th, i) => {
      if (i === 0 || !rows.length) return;
      const empty = rows.every((r) => !txt(r.children[i]));
      if (!empty) return;
      table.querySelectorAll("tr").forEach((r) => r.children[i] && r.children[i].classList.add("mw-hide"));
    });
  }

  // Puts the category total in its header, so it's readable without opening the section.
  function addSummary(table, r) {
    const collapse = table.closest(".collapse");
    const btn = collapse && document.querySelector(`[data-target="#${CSS.escape(collapse.id)}"]`);
    if (!btn || btn.querySelector(".mw-sum")) return;
    const name = txt(btn);
    btn.textContent = "";
    btn.insertAdjacentHTML("beforeend", `<span class="mw-sec-name"></span><span class="mw-sum">${
      r.unweighted
        ? `<b>${+r.rawObt.toFixed(2)}</b><span class="mw-of"> / ${+r.rawOut.toFixed(2)} marks \u00b7 ${((r.rawObt / r.rawOut) * 100).toFixed(0)}%</span>`
        : r.gradedWeight ? `<b>${fmt(r.earned)}</b><span class="mw-of"> / ${fmt(r.gradedWeight)}</span>` : `<span class="mw-of">Not graded yet</span>`
    }</span>`);
    btn.querySelector(".mw-sec-name").textContent = name;
    const frac = r.unweighted ? NaN : (r.gradedWeight ? r.earned / r.gradedWeight : NaN);
    addPct(btn, frac);
  }

  // A plain percentage after the total; low scores get a warning tint.
  function addPct(btn, frac) {
    if (!Number.isFinite(frac)) return;
    const pct = Math.round(frac * 100);
    const sum = btn.querySelector(".mw-sum");
    if (!sum || sum.querySelector(".mw-pct")) return;
    sum.insertAdjacentHTML("beforeend", `<span class="mw-pct${pct < 50 ? " mw-pct-low" : ""}">${pct}%</span>`);
  }

  async function fetchOfficial(courseId) {
    const semSel = document.getElementById("SemId");
    const semId = (semSel && semSel.value) || new URLSearchParams(location.search).get("semid");
    if (!courseId || !semId) return null;
    try {
      const res = await fetch("/Student/GetClassAvg", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
        body: new URLSearchParams({ CourseId: courseId, SemID: semId }),
      });
      const data = await res.json();
      return (Array.isArray(data) ? data[0] : data) || null;
    } catch (_) {
      return null;
    }
  }

  // Smooth open/close for a section body. Sections are shown/hidden with mw-closed, not Bootstrap.
  function slide(el, open) {
    const cur = el._mwAnim ? el.getBoundingClientRect().height : null;
    if (el._mwAnim) { el._mwAnim.oncancel = null; el._mwAnim.onfinish = null; el._mwAnim.cancel(); el._mwAnim = null; }
    if (open) el.classList.remove("mw-closed");
    const full = el.scrollHeight;
    const from = cur != null ? cur : (open ? 0 : full), to = open ? full : 0;
    el.style.overflow = "hidden";
    const anim = el.animate(
      [{ height: from + "px", opacity: open ? 0.4 : 1 }, { height: to + "px", opacity: open ? 1 : 0.4 }],
      { duration: Math.min(480, 320 + full / 6), easing: "cubic-bezier(.4,0,.2,1)" }
    );
    el._mwAnim = anim;
    anim.onfinish = () => { el.style.overflow = ""; el._mwAnim = null; if (!open) el.classList.add("mw-closed"); };
    anim.oncancel = () => { el.style.overflow = ""; };
  }

  // Take a section away from Bootstrap so every section opens on its own, with the same animation.
  function makeToggle(btn, body, onChange) {
    const fresh = btn.cloneNode(true); // drops listeners FLEX or Bootstrap attached
    btn.replaceWith(fresh);
    ["data-toggle", "data-target", "onclick", "aria-controls"].forEach((a) => fresh.removeAttribute(a));
    fresh.type = "button";
    body.removeAttribute("data-parent");
    const isOpen = body.classList.contains("show") && !body.classList.contains("mw-closed");
    body.classList.remove("collapse", "show", "collapsing");
    body.style.height = "";
    body.classList.toggle("mw-closed", !isOpen);
    fresh.classList.toggle("collapsed", !isOpen);
    fresh.setAttribute("aria-expanded", String(isOpen));
    fresh.addEventListener("click", (e) => {
      e.preventDefault(); e.stopImmediatePropagation();
      const nowOpen = fresh.getAttribute("aria-expanded") !== "true";
      fresh.classList.toggle("collapsed", !nowOpen);
      fresh.setAttribute("aria-expanded", String(nowOpen));
      slide(body, nowOpen);
      onChange && onChange(nowOpen);
    }, true);
    return fresh;
  }

  function fixCourse(pane) {
    const tables = [...pane.querySelectorAll("table.sum_table")];
    let weight = 0, earned = 0, classEarned = 0, classWeight = 0, gradedWeight = 0;
    let rawObt = 0, rawOut = 0, rawClass = 0, rawClassOut = 0;
    let grandTable = null;

    tables.forEach((table) => {
      const collapse = table.closest(".collapse");
      if (collapse && /Grand_Total/i.test(collapse.id)) { grandTable = table; return; }
      const r = fixCategory(table);
      if (!r) return;
      addSummary(table, r);
      weight += r.weight; earned += r.earned; gradedWeight += r.gradedWeight;
      classEarned += r.classEarned; classWeight += r.classWeight;
      rawObt += r.rawObt; rawOut += r.rawOut; rawClass += r.rawClass; rawClassOut += r.rawClassOut;
    });
    const raw = weight === 0 && rawOut > 0; // no weightages anywhere in this course yet
    if (!grandTable) return;

    // Grand total: its own collapsible box (open by default, remembers your choice),
    // detached from the accordion so opening Quiz etc. doesn't close it.
    const collapse = grandTable.closest(".collapse");
    // Take it out of Bootstrap's hands entirely (no "collapse" class, no data attributes), so FLEX's
    // scripts can't animate or fight over it. We show/hide it ourselves with mw-closed.
    let open = true;
    try { open = localStorage.getItem("mwGrandOpen") !== "0"; } catch (_) {}
    collapse.classList.add("show");
    collapse.classList.toggle("mw-closed", !open);
    let btn = pane.querySelector(`[data-target="#${CSS.escape(collapse.id)}"]`);
    if (btn) {
      btn = makeToggle(btn, collapse, (o) => { try { localStorage.setItem("mwGrandOpen", o ? "1" : "0"); } catch (_) {} });
      const sum = raw
        ? `<b>${+rawObt.toFixed(2)}</b><span class="mw-of"> / ${+rawOut.toFixed(2)} marks</span>`
        : gradedWeight ? `<b>${fmt(earned)}</b><span class="mw-of"> / ${fmt(gradedWeight)}</span>` : `<span class="mw-of">No marks yet</span>`;
      btn.innerHTML = `<span class="mw-sec-name">Grand total</span><span class="mw-sum">${sum}</span>`;
      if (!raw && gradedWeight) addPct(btn, earned / gradedWeight);
      btn.closest(".card")?.classList.add("mw-grand");
    }

    const classAvg = classWeight ? (classEarned / classWeight) * gradedWeight : NaN;
    const pct = gradedWeight ? (earned / gradedWeight) * 100 : NaN;
    grandTable.classList.add("mw-hide");
    const stats = document.createElement("div");
    stats.className = "mw-stats" + (raw ? " mw-stats-raw" : "");
    const n2 = (v) => +v.toFixed(2);
    stats.innerHTML = raw ? `
      <div class="mw-stat mw-stat-main"><div class="mw-k">Your marks</div>
        <div class="mw-v">${n2(rawObt)}<span class="mw-of"> / ${n2(rawOut)}</span></div>
        <div class="mw-n">${((rawObt / rawOut) * 100).toFixed(1)}%</div></div>
      <div class="mw-stat"><div class="mw-k">Class average</div><div class="mw-v">${rawClassOut ? n2(rawClass) : "–"}</div>
        <div class="mw-n ${Math.abs(rawObt - rawClass) < 1 ? "" : rawObt >= rawClass ? "mw-up" : "mw-down"}">${rawClassOut ? (rawObt >= rawClass ? `You're ${n2(rawObt - rawClass)} above` : `You're ${n2(rawClass - rawObt)} below`) : "&nbsp;"}</div></div>
      <div class="mw-stat mw-note"><div class="mw-k">Weightage not set yet</div>
        <div class="mw-n">Your teacher hasn't entered weightages for this course, so these are raw marks added up. The weighted total will appear once they do.</div></div>` : `
      <div class="mw-stat mw-stat-main"><div class="mw-k">Your total</div>
        <div class="mw-v">${gradedWeight ? fmt(earned) : "–"}<span class="mw-of"> / ${fmt(gradedWeight)}</span></div>
        <div class="mw-n">${Number.isFinite(pct) ? pct.toFixed(1) + "% so far" : "No marks yet"}</div></div>
      <div class="mw-stat mw-avg"><div class="mw-k">Class average</div><div class="mw-v mw-c-avg">${fmt(classAvg) || "–"}</div><div class="mw-n">&nbsp;</div></div>
      <div class="mw-stat mw-minmax"><div class="mw-k">Class min / max</div><div class="mw-v"><span class="mw-c-min">–</span> / <span class="mw-c-max">–</span></div><div class="mw-n">&nbsp;</div></div>
      <div class="mw-stat"><div class="mw-k">Total weightage</div><div class="mw-v">${fmt(weight)}</div><div class="mw-n">${fmt(gradedWeight)} graded</div></div>`;
    grandTable.parentElement.insertBefore(stats, grandTable);
    const diffEl = stats.querySelector(".mw-avg .mw-n");
    const showDiff = (avg) => {
      if (raw || !Number.isFinite(avg) || !gradedWeight) return;
      const d = earned - avg;
      // Within about one mark of the average is "level": no colour. Red/green only for a real gap.
      diffEl.className = "mw-n " + (Math.abs(d) < 1 ? "" : d >= 0 ? "mw-up" : "mw-down");
      diffEl.textContent = d >= 0 ? `You're ${d.toFixed(2)} above` : `You're ${Math.abs(d).toFixed(2)} below`;
    };
    showDiff(classAvg);
    const grandCard = btn && btn.closest(".card");
    const title = pane.querySelector("#accordion > h5, h5");
    if (grandCard && title && title.parentElement === grandCard.parentElement) title.after(grandCard);
    const tbody = stats;

    const foot = pane.querySelector('tr[class^="totalColumn_"]');
    const courseId = foot ? foot.className.match(/totalColumn_(\d+)/)?.[1] : null;
    if (raw) return;
    fetchOfficial(courseId).then((d) => {
      if (d) ["CLASS_AVG", "CLASS_MIN", "CLASS_MAX", "CLASS_STD"].forEach((k) => {
        const v = parseFloat(d[k]); d[k] = Number.isFinite(v) ? v : NaN; // server sometimes sends strings or null
      });
      const mm = tbody.querySelector(".mw-minmax");
      if (!d || !(Number.isFinite(d.CLASS_MIN) || Number.isFinite(d.CLASS_MAX))) { if (mm) { mm.classList.add("mw-dim"); mm.querySelector(".mw-n").textContent = "Not published by FLEX yet"; } }
      if (!d) return;
      const set = (sel, v) => { if (Number.isFinite(v)) tbody.querySelector(sel).textContent = v.toFixed(2); };
      set(".mw-c-avg", d.CLASS_AVG);
      showDiff(d.CLASS_AVG);
      set(".mw-c-min", d.CLASS_MIN);
      set(".mw-c-max", d.CLASS_MAX);

    });
  }

  function run() {
    if (document.documentElement.dataset.mwMarks) return;
    document.documentElement.dataset.mwMarks = "1";
    // One broken course must not stop the rest, so each step is guarded.
    document.querySelectorAll("div.tab-pane[id]").forEach((pane) => {
      try { fixCourse(pane); } catch (e) { console.warn("[Marks Watcher]", pane.id, e); }
    });
    // FLEX gives every course the same id="accordion", which made CL2001 close sections behind you.
    // We run all section toggles ourselves: independent, and animated.
    document.querySelectorAll("div.tab-pane[id] .card-header [data-target]").forEach((btn) => {
      try {
        const body = document.getElementById(btn.getAttribute("data-target").replace(/^#/, ""));
        if (body) makeToggle(btn, body);
      } catch (e) { console.warn("[Marks Watcher] toggle", e); }
    });

    // Semester picker: move FLEX's form from its own floating row above the panel into the top header,
    // centred above the marks panel. The form itself is untouched, so changing semester still works.
    try {
      const sem = document.getElementById("SemId");
      const form = sem && sem.closest("form");
      const header = document.querySelector(".m-header");
      const panel = document.querySelector(".m-portlet");
      if (form && header && panel && !header.contains(form)) {
        form.classList.add("mw-sem-form");
        form.querySelectorAll("br").forEach((x) => x.remove());
        const box = document.createElement("div");
        box.className = "mw-sem-box";
        box.appendChild(form);
        header.appendChild(box);
        // Keep it centred over the marks panel (the panel moves when the sidebar collapses or the window resizes).
        const place = () => {
          const h = header.getBoundingClientRect(), p = panel.getBoundingClientRect();
          box.style.left = (p.left + p.width / 2 - h.left) + "px";
        };
        place();
        window.addEventListener("resize", place);
        if (window.ResizeObserver) new ResizeObserver(place).observe(panel);
        // Follow the panel frame by frame while the sidebar animates, so the picker glides instead of jumping.
        let until = 0, ticking = false;
        const follow = (ms = 450) => {
          until = Math.max(until, performance.now() + ms);
          if (ticking) return;
          ticking = true;
          const step = () => { place(); if (performance.now() < until) requestAnimationFrame(step); else ticking = false; };
          requestAnimationFrame(step);
        };
        document.addEventListener("transitionstart", () => follow(), true);
        document.addEventListener("transitionend", place, true);
        new MutationObserver(() => follow()).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      }
    } catch (e) { console.warn("[Marks Watcher] semester", e); }

    // Every course starts the same way: Grand total open, the other sections closed.
    const resetPane = (pane) => {
      if (!pane) return;
      pane.querySelectorAll(".card").forEach((card) => {
        const btn = card.querySelector(".card-header .btn-link");
        const body = card.querySelector(".card-header + div");
        if (!btn || !body) return;
        const open = card.classList.contains("mw-grand");
        if (body._mwAnim) { body._mwAnim.onfinish = null; body._mwAnim.cancel(); body._mwAnim = null; }
        body.style.overflow = "";
        body.classList.toggle("mw-closed", !open);
        btn.classList.toggle("collapsed", !open);
        btn.setAttribute("aria-expanded", String(open));
      });
    };
    document.querySelectorAll("div.tab-pane[id]").forEach(resetPane);
    document.addEventListener("click", (e) => {
      const link = e.target.closest('a[data-toggle="tab"], .m-tabs__link, .nav-tabs .nav-link');
      if (!link) return;
      const id = (link.getAttribute("href") || "").split("#")[1];
      if (id) resetPane(document.getElementById(id));
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
