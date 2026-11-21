// FixForFlex Settings: background marks checks and the FLEX sign-in they use.
const $ = (id) => document.getElementById(id);
const DEFAULTS = { watchEnabled: false, watchEvery: 30, flexRoll: "", flexPass: "" };

$("version").textContent = "v" + chrome.runtime.getManifest().version;

chrome.storage.local.get(Object.keys(DEFAULTS), (st) => {
  const v = { ...DEFAULTS, ...st };
  $("watchEnabled").checked = !!v.watchEnabled;
  $("watchEvery").value = String(v.watchEvery);
  if (!$("watchEvery").value) $("watchEvery").value = "30";
  $("flexRoll").value = v.flexRoll || "";
  $("flexPass").value = v.flexPass || "";
  syncEvery();
  syncOwner();
});

// Only the developer's own copy (by roll number, hashed) can change the interval.
const OWNER_HASH = "c2f8eeb78c0a0b1a25d9640795f5782d2986cc132eef84574d90688173739706";
async function isOwner(roll) {
  const norm = String(roll || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!norm) return false;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("") === OWNER_HASH;
}
async function syncOwner() {
  const owner = await isOwner($("flexRoll").value);
  $("everyRow").hidden = !owner;
  $("everyNote").hidden = owner;
}
$("flexRoll").addEventListener("input", syncOwner);

// The sign-in is only used by background checks, so it's locked while they're off.
function syncEvery() {
  const on = $("watchEnabled").checked;
  $("watchEvery").disabled = !on;
  for (const id of ["flexRoll", "flexPass", "showPass", "clearLogin"]) $(id).disabled = !on;
  $("loginOff").hidden = on;
}
$("watchEnabled").addEventListener("change", syncEvery);

$("showPass").addEventListener("click", () => {
  const p = $("flexPass");
  p.type = p.type === "password" ? "text" : "password";
  $("showPass").textContent = p.type === "password" ? "Show" : "Hide";
});

let timer;
function said(text) {
  $("saved").textContent = text;
  clearTimeout(timer);
  timer = setTimeout(() => ($("saved").textContent = ""), 2500);
}

$("clearLogin").addEventListener("click", () => {
  $("flexRoll").value = "";
  $("flexPass").value = "";
  chrome.storage.local.remove(["flexRoll", "flexPass"], () => said("Sign-in removed."));
});

$("save").addEventListener("click", () => {
  const roll = $("flexRoll").value.trim().toUpperCase();
  const pass = $("flexPass").value;
  if ($("watchEnabled").checked && ((roll && !pass) || (!roll && pass))) return said("Fill in both roll number and password, or neither.");
  $("flexRoll").value = roll;
  const data = {
    watchEnabled: $("watchEnabled").checked,
    watchEvery: Number($("watchEvery").value) || 30,
  };
  const done = () => said("Saved.");
  if (roll) chrome.storage.local.set({ ...data, flexRoll: roll, flexPass: pass }, done);
  else chrome.storage.local.set(data, () => chrome.storage.local.remove(["flexRoll", "flexPass"], done));
});
