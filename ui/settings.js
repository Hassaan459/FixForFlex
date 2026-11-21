// FixForFlex Settings: background marks checks, FLEX sign-in, fee rate.
const $ = (id) => document.getElementById(id);
const DEFAULTS = { watchEnabled: false, watchEvery: 5, flexRoll: "", flexPass: "", feePerCredit: 11000 };

$("version").textContent = "v" + chrome.runtime.getManifest().version;

chrome.storage.local.get(Object.keys(DEFAULTS), (st) => {
  const v = { ...DEFAULTS, ...st };
  $("watchEnabled").checked = !!v.watchEnabled;
  $("watchEvery").value = String(v.watchEvery);
  if (!$("watchEvery").value) $("watchEvery").value = "5";
  $("flexRoll").value = v.flexRoll || "";
  $("flexPass").value = v.flexPass || "";
  $("feePerCredit").value = v.feePerCredit;
  syncEvery();
});

function syncEvery() { $("watchEvery").disabled = !$("watchEnabled").checked; }
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
  if ((roll && !pass) || (!roll && pass)) return said("Fill in both roll number and password, or neither.");
  const fee = Math.max(0, Math.round(Number($("feePerCredit").value) || 0));
  $("flexRoll").value = roll;
  const data = {
    watchEnabled: $("watchEnabled").checked,
    watchEvery: Number($("watchEvery").value) || 5,
    feePerCredit: fee,
  };
  const done = () => said("Saved.");
  if (roll) chrome.storage.local.set({ ...data, flexRoll: roll, flexPass: pass }, done);
  else chrome.storage.local.set(data, () => chrome.storage.local.remove(["flexRoll", "flexPass"], done));
});
