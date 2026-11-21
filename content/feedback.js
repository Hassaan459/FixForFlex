// FixForFlex: course feedback form (/Student/FeedBackQuestions).
// Adds one line above the questions: "Answer all with: Strongly Agree · Agree · …".
// It only ticks the radio buttons, as a starting point. You change the ones you feel differently
// about and press FLEX's own Submit yourself. Nothing is ever submitted from here.
(() => {
  const OPTIONS = ["Strongly Agree", "Agree", "Uncertain", "Dissatisfied", "Strongly Disagree"];
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();

  const questions = () => [...document.querySelectorAll(".m-list-timeline__item")]
    .filter((q) => q.querySelector('input[type="radio"]'));

  // Ticks `answer` in every question. Returns how many questions it could answer.
  function fill(answer) {
    let n = 0;
    for (const q of questions()) {
      const pick = [...q.querySelectorAll(".m-list-timeline__time")]
        .find((s) => norm(s.textContent) === norm(answer));
      const radio = pick && pick.querySelector('input[type="radio"]');
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
    const list = qs[0].closest(".m-list-timeline") || qs[0].parentElement;

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
      b.type = "button";
      b.className = "ff-fill-btn";
      b.textContent = opt;
      b.addEventListener("click", () => {
        const n = fill(opt);
        bar.querySelectorAll(".ff-fill-btn").forEach((x) => x.classList.toggle("is-on", x === b));
        note.textContent = n
          ? `${n} questions set to ${opt}. Change any you feel differently about, then submit.`
          : "Couldn't find the answer options on this form.";
      });
      bar.appendChild(b);
    }
    bar.appendChild(note);
    list.parentNode.insertBefore(bar, list);
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
