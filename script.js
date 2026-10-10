// =====================================================================
//  SMART HOME AUTOMATION  -  script.js
//  Firebase modular SDK v10.14.1 (Authentication + Realtime Database)
// =====================================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getDatabase, ref, onValue, set, update
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// ========== FIREBASE CONFIGURATION ==========
// Replace these placeholders with your own Firebase project values.
// Firebase Console -> Project settings -> General -> Your apps -> SDK setup and configuration

const firebaseConfig = {
  apiKey: "AIzaSyCC6Vpb2AgKs3eEVDy_JOSuvwDUHj4myeU",
  authDomain: "smart-home-automation-ea633.firebaseapp.com",
  databaseURL: "https://smart-home-automation-ea633-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "smart-home-automation-ea633",
  storageBucket: "smart-home-automation-ea633.firebasestorage.app",
  messagingSenderId: "836521526461",
  appId: "1:836521526461:web:138388765b657d8dffa3d4"
};

// ========== DATABASE PATHS (must match the ESP8266 exactly) ==========
const PATH = {
  temperature: "Temperature",
  humidity: "Humidity",
  light: "Light",
  fan: "Fan",
  heartbeat: "Heartbeat" // OPTIONAL: only used if you add a heartbeat to the ESP8266 (see README)
};

const WRITE_TIMEOUT_MS = 10000;   // wait this long for Firebase to confirm a write
const HEARTBEAT_MAX_AGE_MS = 60000; // ESP8266 counts as "Online" if its heartbeat is newer than this

// ---------------------------------------------------------------------
//  DOM helpers
// ---------------------------------------------------------------------
const $ = (id) => document.getElementById(id);

const el = {
  configBanner: $("configBanner"),
  loginView: $("loginView"), dashView: $("dashView"),
  loginForm: $("loginForm"), email: $("email"), password: $("password"),
  togglePassword: $("togglePassword"), togglePasswordIcon: $("togglePasswordIcon"),
  loginError: $("loginError"), loginBtn: $("loginBtn"),
  userEmail: $("userEmail"), logoutBtn: $("logoutBtn"),
  headerDot: $("headerDot"), headerConnText: $("headerConnText"),
  dbBanner: $("dbBanner"),
  tempValue: $("tempValue"), tempUnit: $("tempUnit"), tempMeta: $("tempMeta"),
  humValue: $("humValue"), humUnit: $("humUnit"), humMeta: $("humMeta"),
  lightCard: $("lightCard"), lightToggle: $("lightToggle"), lightStatus: $("lightStatus"),
  fanCard: $("fanCard"), fanToggle: $("fanToggle"), fanStatus: $("fanStatus"),
  allOffBtn: $("allOffBtn"),
  fbDot: $("fbDot"), fbText: $("fbText"),
  espDot: $("espDot"), espText: $("espText"), espHint: $("espHint"),
  dhtDot: $("dhtDot"), dhtText: $("dhtText"),
  toast: $("toast")
};

let toastTimer;
function showToast(message, isError = false) {
  el.toast.textContent = message;
  el.toast.classList.toggle("error", isError);
  el.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.toast.hidden = true; }, isError ? 6000 : 3000);
}

// ---------------------------------------------------------------------
//  Firebase initialisation (only once, only if configured)
// ---------------------------------------------------------------------
const isConfigured = !Object.values(firebaseConfig).some((v) => String(v).startsWith("PASTE_"));
let app, auth, db;

if (isConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
} else {
  el.configBanner.hidden = false;
}

// ---------------------------------------------------------------------
//  App state
// ---------------------------------------------------------------------
const state = {
  firebaseConnected: false,
  temperature: null, humidity: null,
  light: null, fan: null,           // null = no value received yet
  heartbeat: null,                  // ms timestamp from the ESP8266, or null
  serverOffset: 0,
  tempReceivedAt: null, humReceivedAt: null,
  dbError: null
};
const pending = { light: false, fan: false, all: false };
let unsubscribers = [];
let statusTimer = null;

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const fmtTime = (d) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// ---------------------------------------------------------------------
//  Rendering
// ---------------------------------------------------------------------
function setDot(dotEl, textEl, cls, text) {
  dotEl.className = "dot" + (cls ? " " + cls : "");
  textEl.textContent = text;
}

function renderSensors() {
  const t = isNum(state.temperature);
  el.tempValue.textContent = t ? String(Math.round(state.temperature * 10) / 10) : "--";
  el.tempValue.parentElement.classList.toggle("empty", !t);
  el.tempUnit.hidden = !t;
  el.tempMeta.textContent = t ? `Page received this value at ${fmtTime(state.tempReceivedAt)}`
                              : (state.dbError ? "Unavailable" : "Waiting for data");

  const h = isNum(state.humidity);
  el.humValue.textContent = h ? String(Math.round(state.humidity * 10) / 10) : "--";
  el.humValue.parentElement.classList.toggle("empty", !h);
  el.humUnit.hidden = !h;
  el.humMeta.textContent = h ? `Page received this value at ${fmtTime(state.humReceivedAt)}`
                             : (state.dbError ? "Unavailable" : "Waiting for data");
}

function renderDevice(key, card, toggle, statusEl) {
  const value = state[key];
  const known = typeof value === "boolean";
  const busy = pending[key] || pending.all;

  toggle.checked = known && value;               // always mirrors the database
  toggle.disabled = !known || busy || !state.firebaseConnected;
  card.classList.toggle("on", known && value);
  card.classList.toggle("pending", busy);
  statusEl.textContent = busy ? "Updating…" : known ? (value ? "ON" : "OFF") : "--";
}

function renderDevices() {
  renderDevice("light", el.lightCard, el.lightToggle, el.lightStatus);
  renderDevice("fan", el.fanCard, el.fanToggle, el.fanStatus);
  el.allOffBtn.disabled = pending.all || pending.light || pending.fan || !state.firebaseConnected;
  el.allOffBtn.querySelector(".btn-label").textContent = pending.all ? "Turning off…" : "ALL OFF";
}

function espOnline() {
  if (!isNum(state.heartbeat)) return null;                       // unknown
  const age = Date.now() + state.serverOffset - state.heartbeat;
  return age <= HEARTBEAT_MAX_AGE_MS;
}

function renderStatus() {
  // Firebase
  if (state.firebaseConnected) {
    setDot(el.fbDot, el.fbText, "ok", "Connected");
    setDot(el.headerDot, el.headerConnText, "ok", "Connected");
  } else {
    setDot(el.fbDot, el.fbText, "bad", "Disconnected");
    setDot(el.headerDot, el.headerConnText, "bad", "Disconnected");
  }

  // ESP8266 (only trusted if a heartbeat exists)
  const online = espOnline();
  if (online === null) {
    setDot(el.espDot, el.espText, "", "Unknown");
    el.espHint.hidden = false;
  } else if (online) {
    setDot(el.espDot, el.espText, "ok", "Online");
    el.espHint.hidden = true;
  } else {
    setDot(el.espDot, el.espText, "bad", "Offline");
    el.espHint.hidden = true;
  }

  // DHT11: a valid number for both paths, and the board not known to be offline
  const hasReading = isNum(state.temperature) && isNum(state.humidity);
  if (hasReading && online !== false) setDot(el.dhtDot, el.dhtText, "ok", "Reading available");
  else setDot(el.dhtDot, el.dhtText, "", "Unavailable");

  // Database error banner
  el.dbBanner.hidden = !state.dbError;
  if (state.dbError) el.dbBanner.textContent = state.dbError;
}

function renderAll() {
  renderSensors();
  renderDevices();
  renderStatus();
}

// ---------------------------------------------------------------------
//  Real-time listeners
// ---------------------------------------------------------------------
function describeDbError(err) {
  const code = String(err && (err.code || err.message) || "");
  if (/permission/i.test(code)) {
    return "Permission denied by the database rules. Check that you are signed in and that your rules allow this user (see README).";
  }
  return "Database error: " + (err && err.message ? err.message : "unknown error");
}

function listen(path, onData) {
  const unsub = onValue(
    ref(db, path),
    (snap) => { state.dbError = null; onData(snap.val()); renderAll(); },
    (err) => { state.dbError = describeDbError(err); renderAll(); }
  );
  unsubscribers.push(unsub);
}

function startListeners() {
  stopListeners();

  // Firebase connection state + clock offset (used for heartbeat age)
  unsubscribers.push(onValue(ref(db, ".info/connected"), (snap) => {
    state.firebaseConnected = snap.val() === true;
    renderAll();
  }));
  unsubscribers.push(onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
    state.serverOffset = isNum(snap.val()) ? snap.val() : 0;
  }));

  listen(PATH.temperature, (v) => {
    state.temperature = isNum(v) ? v : null;
    state.tempReceivedAt = isNum(v) ? new Date() : null;
  });
  listen(PATH.humidity, (v) => {
    state.humidity = isNum(v) ? v : null;
    state.humReceivedAt = isNum(v) ? new Date() : null;
  });
  listen(PATH.light, (v) => { state.light = typeof v === "boolean" ? v : null; });
  listen(PATH.fan, (v) => { state.fan = typeof v === "boolean" ? v : null; });
  listen(PATH.heartbeat, (v) => { state.heartbeat = isNum(v) ? v : null; });

  // Re-evaluate heartbeat age even when no new data arrives
  statusTimer = setInterval(renderStatus, 5000);
  renderAll();
}

function stopListeners() {
  unsubscribers.forEach((fn) => { try { fn(); } catch (_) {} });
  unsubscribers = [];
  clearInterval(statusTimer);
  Object.assign(state, {
    firebaseConnected: false, temperature: null, humidity: null,
    light: null, fan: null, heartbeat: null,
    tempReceivedAt: null, humReceivedAt: null, dbError: null
  });
  Object.assign(pending, { light: false, fan: false, all: false });
}

// ---------------------------------------------------------------------
//  Device control
// ---------------------------------------------------------------------
function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), WRITE_TIMEOUT_MS))
  ]);
}

function writeErrorMessage(err, label) {
  const msg = String(err && (err.code || err.message) || "");
  if (/permission/i.test(msg)) return `Could not change ${label}: permission denied by database rules.`;
  if (/timeout/i.test(msg)) return `No confirmation from Firebase for ${label}. Check your connection and try again.`;
  return `Could not change ${label}: ${err && err.message ? err.message : "unknown error"}`;
}

async function setDevice(key, label, toggle) {
  const desired = toggle.checked;
  toggle.checked = state[key] === true;             // UI only changes when the database confirms

  if (pending[key] || pending.all) return;          // prevent duplicate writes
  if (typeof state[key] !== "boolean") return;
  if (state[key] === desired) return;               // nothing to change

  pending[key] = true;
  renderDevices();
  try {
    await withTimeout(set(ref(db, PATH[key]), desired));
    showToast(`${label} turned ${desired ? "ON" : "OFF"}`);
  } catch (err) {
    showToast(writeErrorMessage(err, label), true);
  } finally {
    pending[key] = false;
    renderDevices();
  }
}

async function allOff() {
  if (pending.all || pending.light || pending.fan) return;
  if (state.light === false && state.fan === false) {
    showToast("Light and Fan are already off");
    return;
  }
  pending.all = true;
  renderDevices();
  try {
    // One atomic multi-path update: both change together or neither does.
    await withTimeout(update(ref(db), { [PATH.light]: false, [PATH.fan]: false }));
    showToast("Light and Fan turned OFF");
  } catch (err) {
    showToast(writeErrorMessage(err, "Light and Fan"), true);
  } finally {
    pending.all = false;
    renderDevices();
  }
}

el.lightToggle.addEventListener("change", () => setDevice("light", "Light", el.lightToggle));
el.fanToggle.addEventListener("change", () => setDevice("fan", "Fan", el.fanToggle));
el.allOffBtn.addEventListener("click", allOff);

// ---------------------------------------------------------------------
//  Authentication
// ---------------------------------------------------------------------
function loginErrorMessage(err) {
  switch (err && err.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/user-disabled":
      return "This account has been disabled in Firebase.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Cannot reach Firebase. Check your internet connection.";
    case "auth/operation-not-allowed":
      return "Email/Password sign-in is not enabled in Firebase Authentication.";
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return "The Firebase API key in script.js is not valid.";
    default:
      return "Login failed" + (err && err.code ? ` (${err.code})` : "") + ".";
  }
}

function setLoginLoading(loading) {
  el.loginBtn.disabled = loading;
  el.loginBtn.querySelector(".spinner").hidden = !loading;
  el.loginBtn.querySelector(".btn-label").textContent = loading ? "Logging in…" : "Log in";
}

el.togglePassword.addEventListener("click", () => {
  const show = el.password.type === "password";
  el.password.type = show ? "text" : "password";
  el.togglePassword.setAttribute("aria-pressed", String(show));
  el.togglePassword.setAttribute("aria-label", show ? "Hide password" : "Show password");
  el.togglePasswordIcon.setAttribute("href", show ? "#i-eye-off" : "#i-eye");
});

el.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  el.loginError.hidden = true;

  if (!isConfigured) {
    el.loginError.textContent = "Firebase is not configured. Edit firebaseConfig in script.js.";
    el.loginError.hidden = false;
    return;
  }
  const emailValue = el.email.value.trim();
  const passwordValue = el.password.value;
  if (!emailValue || !passwordValue) {
    el.loginError.textContent = "Enter your email and password.";
    el.loginError.hidden = false;
    return;
  }

  setLoginLoading(true);
  try {
    await setPersistence(auth, browserLocalPersistence); // keep session across reloads
    await signInWithEmailAndPassword(auth, emailValue, passwordValue);
    el.password.value = "";
    // onAuthStateChanged below switches to the dashboard
  } catch (err) {
    el.loginError.textContent = loginErrorMessage(err);
    el.loginError.hidden = false;
  } finally {
    setLoginLoading(false);
  }
});

el.logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (err) {
    showToast("Could not log out: " + (err && err.message ? err.message : "unknown error"), true);
  }
});

// Single source of truth for which screen is visible.
// The dashboard stays hidden until Firebase confirms a signed-in user.
if (isConfigured) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      el.userEmail.textContent = user.email || "Signed in";
      el.loginView.hidden = true;
      el.dashView.hidden = false;
      startListeners();
    } else {
      stopListeners();
      el.dashView.hidden = true;
      el.loginView.hidden = false;
      renderAll();
    }
  });
} else {
  el.loginView.hidden = false; // show login so the setup banner makes sense
}
