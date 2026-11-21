// Marks Watcher: tidies FLEX's home page (Student Profile). Keeps FLEX's boxes and order;
// only makes each "Label: value" line readable and drops lines FLEX leaves empty.
(() => {
  const isHome = () => [...document.querySelectorAll(".m-portlet__head-text")]
    .some((h) => /University Information/i.test(h.textContent));
  if (!isHome()) return;
  document.documentElement.classList.add("mw-home");

  document.querySelectorAll(".m-portlet__body p").forEach((p) => {
    const label = p.querySelector(":scope > .m--font-boldest");
    if (!label) return;
    label.textContent = label.textContent.replace(/:\s*$/, "").trim();
    label.classList.add("mw-home-label");
    const rest = [...p.childNodes].filter((n) => n !== label);
    const text = rest.map((n) => n.textContent).join("").trim();
    if (!text) { p.classList.add("mw-home-empty"); return; }
    const val = document.createElement("span");
    val.className = "mw-home-value";
    rest.forEach((n) => val.appendChild(n));
    p.appendChild(val);
    p.classList.add("mw-home-field");
  });
  // "Permanent:" / "Current:" headings in Contact Information
  document.querySelectorAll(".m-portlet__body h5 strong").forEach((s) => {
    s.textContent = s.textContent.replace(/:\s*$/, "");
  });
})();
