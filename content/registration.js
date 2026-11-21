// Marks Watcher: FLEX Course Registration. Rewrites only the look of the instructions box
// (FLEX's own wording, one rule per line). Doesn't touch the form, buttons or checkboxes.
(() => {
  const box = document.querySelector("#instructionsCollapse .m-alert__text");
  if (!box || box.querySelector(".mw-reg-rules")) return;

  // Split FLEX's <br>-separated text into lines, keeping inline bits like <b>.
  const lines = [[]];
  [...box.childNodes].forEach((n) => {
    if (n.nodeName === "BR") lines.push([]);
    else lines[lines.length - 1].push(n);
  });

  const list = document.createElement("ul");
  list.className = "mw-reg-rules";
  lines.forEach((nodes) => {
    const li = document.createElement("li");
    nodes.forEach((n) => {
      if (n.nodeType === 1 && n.querySelector && n.querySelector(".fa-circle")) return; // FLEX's bullet icon
      if (n.nodeType === 1 && n.nodeName === "U" && !n.textContent.trim()) return;     // empty e-mail link
      li.appendChild(n.cloneNode(true));
    });
    // A rule FLEX bolded from start to end is just a rule: drop the outer bold.
    const kids = [...li.childNodes].filter((n) => n.nodeType === 1 || n.textContent.trim());
    if (kids.length === 1 && kids[0].nodeName === "B") li.replaceChildren(...kids[0].childNodes);
    li.querySelectorAll("u, a").forEach((el) => { if (!el.textContent.trim()) el.remove(); });
    li.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
    // Tidy spacing and capitalisation; the words stay FLEX's.
    li.normalize();
    const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
    for (let t; (t = walker.nextNode());) t.textContent = t.textContent.replace(/\s+/g, " ").replace(/\s+,/g, ",");
    const first = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
    for (let t; (t = first.nextNode());) {
      const s = t.textContent.replace(/^\s+/, "");
      if (!s) { t.textContent = ""; continue; }
      t.textContent = s.charAt(0).toUpperCase() + s.slice(1);
      break;
    }
    while (li.lastChild && li.lastChild.nodeType === 3 && !li.lastChild.textContent.trim()) li.lastChild.remove();
    const last = li.lastChild;
    if (last && last.nodeType === 3) last.textContent = last.textContent.replace(/\s+at\s*$/, ".").replace(/\s+$/, "");
    if (li.textContent.trim()) list.appendChild(li);
  });
  if (!list.children.length) return;
  box.replaceChildren(list);
  box.classList.add("mw-reg-box");
})();
