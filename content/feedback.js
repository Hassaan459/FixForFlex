// FixForFlex: course feedback form (/Student/FeedBackQuestions).
// Adds one line above the questions: "Answer all with: Strongly Agree · Agree · …".
// It only ticks radio buttons, as a starting point. You change the ones you feel differently
// about and press FLEX's own Submit yourself. Nothing is ever submitted from here.
//
// FLEX's real form hasn't been seen yet (feedback isn't open), so this doesn't rely on its class
// names: every group of radio buttons sharing a name is one question, and each option is matched
// by the text next to it (its <label>, the text beside it, or its value).
(() => {
  const OPTIONS = ["Strongly Agree", "Agree", "Uncertain", "Dissatisfied", "Strongly Disagree"];
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();

  // The visible text of one radio button's option.
  function optionText(r) {
    if (r.id) {
      const l = document.querySelector(`label[for="${CSS.escape(r.id)}"]`);
      if (l && norm(l.textContent)) return l.textContent;
    }
    const wrap = r.closest("label");
    if (wrap && norm(wrap.textContent)) return wrap.textContent;
    let n = r.nextSibling; // text right after the radio
    while (n && n.nodeType === 3 && !norm(n.textContent)) n = n.nextSibling;
    if (n && (n.nodeType === 3 || !n.querySelector?.('input[type="radio"]')) && norm(n.textContent)) return n.textContent;
    const p = r.parentElement; // a cell or span holding just this radio and its text
    if (p && p.querySelectorAll('input[type="radio"]').length === 1 && norm(p.textContent)) return p.textContent;
    const td = r.closest("td, th"); // a table with the answers as column headings
    const table = td && td.closest("table");
    if (table) {
      const head = table.querySelector("thead tr") || table.querySelector("tr");
      const th = head && head.children[td.cellIndex];
      if (th && th !== td && norm(th.textContent)) return th.textContent;
    }
    return r.value;
  }

  // Questions: radio groups (by name) that offer at least two of the five answers.
  function questions() {
    const groups = new Map();
    for (const r of document.querySelectorAll('input[type="radio"]')) {
      if (!r.name || r.disabled) continue;
      if (!groups.has(r.name)) groups.set(r.name, []);
      groups.get(r.name).push(r);
    }
    const known = new Set(OPTIONS.map(norm));
    return [...groups.values()].filter((g) => g.filter((r) => known.has(norm(optionText(r)))).length >= 2);
  }

  // Ticks `answer` in every question. Returns how many questions it answered.
  function fill(answer) {
    let n = 0;
    for (const group of questions()) {
      const radio = group.find((r) => norm(optionText(r)) === norm(answer));
      if (!radio) continue;
      if (!radio.checked) radio.click(); // a real click, so FLEX's own handlers see it
      radio.checked = true;
      n++;
    }
    return n;
  }

  function addBar() {
    if (document.querySelector(".ff-fill")) return true;
    const qs = questions();
    if (!qs.length) return false;
    const first = qs[0][0];
    const host = first.form || first.closest(".m-portlet__body") || first.parentElement;

    const bar = document.createElement("div");
    bar.className = "ff-fill";
    const label = document.createElement("span");
    label.className = "ff-fill-label";
    label.textContent = "Answer all with";
    bar.appendChild(label);
    const note = document.createElement("span");
    note.className = "ff-fill-note";

    for (const opt of OPTIONS) {
      const b = document.createElement("button");
      b.type = "button"; // never submits the form
      b.className = "ff-fill-btn";
      b.textContent = opt;
      b.addEventListener("click", () => {
        const n = fill(opt);
        bar.querySelectorAll(".ff-fill-btn").forEach((x) => x.classList.toggle("is-on", x === b));
        note.textContent = n
          ? `${n} questions set to ${opt}. Change any you feel differently about, then submit.`
          : `No question on this form has "${opt}" as an answer.`;
      });
      bar.appendChild(b);
    }
    bar.appendChild(note);
    host.insertBefore(bar, host.firstChild);
    return true;
  }

  // The form can arrive a moment after load.
  if (!addBar()) {
    const mo = new MutationObserver(() => { if (addBar()) mo.disconnect(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 15000);
  }

  // The toolbar popup can ask for the same thing.
  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg && msg.type === "feedback-status") reply({ questions: questions().length, options: OPTIONS });
    if (msg && msg.type === "feedback-fill") {
      const btn = [...document.querySelectorAll(".ff-fill-btn")].find((b) => b.textContent === msg.answer);
      if (btn) btn.click(); else fill(msg.answer);
      reply({ filled: true });
    }
  });
})();
