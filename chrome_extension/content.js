let running = false;
let deletedCount = 0;
let startTime = Date.now();
let processed = new Set();

const sleep = (time) => new Promise(res => setTimeout(res, time));

/* =========================
   UI: TOGGLE IFRAME PANEL
========================= */

function togglePopupUI() {
  let existing = document.getElementById("yt-cleaner-frame");

  if (existing) {
    existing.remove(); // CLOSE
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.id = "yt-cleaner-frame";
  iframe.src = chrome.runtime.getURL("popup.html");

  Object.assign(iframe.style, {
    position: "fixed",
    top: "80px",
    right: "20px",
    width: "340px",
    height: "430px",
    border: "none",
    zIndex: "999999",
    borderRadius: "16px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
  });

  document.body.appendChild(iframe);
}

/* =========================
   UI: CLOSE FROM IFRAME
========================= */

window.addEventListener("message", (event) => {
  if (event.data?.type === "close_iframe") {
    let frame = document.getElementById("yt-cleaner-frame");
    if (frame) frame.remove();
  }
});

/* =========================
   UI: ESC TO CLOSE
========================= */

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    let frame = document.getElementById("yt-cleaner-frame");
    if (frame) frame.remove();
  }
});

/* =========================
   MESSAGE HANDLING
========================= */

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "toggle_ui") {
    togglePopupUI();
  }

  if (msg.action === "start") {
    deletedCount = 0;
    processed.clear();
    startTime = Date.now();
    run(msg.settings);
  }

  if (msg.action === "stop") {
    running = false;
  }
});

/* =========================
   CORE LOGIC (UNCHANGED)
========================= */

// Get items
function getItems() {
  return [...document.querySelectorAll('c-wiz[jsrenderer="lyr9jd"]')];
}

// Extract text
function getText(item) {
  let el = item.querySelector(".QTGV3c");
  return el ? el.innerText.toLowerCase() : "";
}

// Delete button
function getDeleteButton(item) {
  return item.querySelector(
      ".VfPpkd-Bz112c-LgbsSe.yHy1rc.eT1oJ.mN1ivc"
  );
}

// Filter
function matchesFilters(text, settings) {
  if (!settings || !Array.isArray(settings.keywords)) return true;

  let keywords = settings.keywords;
  if (keywords.length === 0) return true;

  return keywords.some(phrase => {
    if (!phrase || typeof phrase !== "string") return false;

    phrase = phrase.toLowerCase().trim();
    if (!phrase) return false;

    return text.includes(phrase);
  });
}

// Confirm popup
async function handleConfirmIfExists() {
  if (!running) return;

  await sleep(500);

  let confirmBtn = [...document.querySelectorAll("button")]
      .find(el =>
          el.innerText.toLowerCase().includes("delete") &&
          el.offsetParent !== null
      );

  if (confirmBtn) {
    confirmBtn.click();
    await sleep(500);
  }
}

// Progress
function updateProgress() {
  let elapsed = (Date.now() - startTime) / 1000;
  let rate = deletedCount / elapsed || 1;

  let data = {
    count: deletedCount,
    time: `${(1 / rate).toFixed(1)} sec/item`
  };

  chrome.storage.local.set({ progress: data });

  chrome.runtime.sendMessage({
    type: "progress",
    ...data
  });
}

// Load more
async function loadMoreComments() {
  for (let i = 0; i < 2; i++) {
    if (!running) return;

    let loadMore = document.querySelector('button[jsname="T8gEfd"]');

    if (loadMore) {
      loadMore.click();
      await sleep(1000);
    } else {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1000);
    }
  }
}

// Core worker
async function work(settings) {
  let items = getItems();

  console.log("Keywords:", settings?.keywords);

  for (let item of items) {
    if (!running) return;

    try {
      let id = item.innerText.slice(0, 80);
      if (processed.has(id)) continue;

      let text = getText(item);

      if (!matchesFilters(text, settings)) continue;

      let btn = getDeleteButton(item);
      if (!btn) continue;

      btn.click();

      deletedCount++;
      processed.add(id);
      updateProgress();

      await sleep(settings.speed || 1000);
      await handleConfirmIfExists();

    } catch (err) {
      console.error(err);
      running = false;
      return;
    }
  }

  await loadMoreComments();
}

// Main loop
async function run(settings) {
  running = true;

  console.log("START:", settings);

  while (running) {
    await work(settings);
    await sleep(1000);
  }
}