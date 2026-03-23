let running = false;
let deletedCount = 0;
let startTime = Date.now();
let processed = new Set();

const sleep = (time) => new Promise(res => setTimeout(res, time));
function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [
    hrs > 0 ? `${hrs}h` : "",
    mins > 0 ? `${mins}m` : "",
    `${secs}s`
  ].filter(Boolean).join(" ");
}
/* =========================
   UI: TOGGLE IFRAME PANEL
========================= */


function togglePopupUI() {
  let existing = document.getElementById("yt-cleaner-frame");

  if (existing) {
    existing.remove();
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
    height: "460px",
    border: "none",
    zIndex: "999999",
    borderRadius: "16px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
  });

  document.body.appendChild(iframe);
}

/* =========================
   PRE-CHECK (NO COMMENTS)
========================= */

function hasMatchingComments(settings) {
  let items = getItems();

  for (let item of items) {
    let text = getText(item);

    if (matchesFilters(text, settings)) {
      let btn = getDeleteButton(item);
      if (btn) return true;
    }
  }

  return false;
}

/* =========================
   UI: CLOSE + ESC
========================= */

window.addEventListener("message", (event) => {
  if (event.data?.type === "close_iframe") {
    document.getElementById("yt-cleaner-frame")?.remove();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("yt-cleaner-frame")?.remove();
  }
});

/* =========================
   MESSAGE HANDLING
========================= */

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.action === "toggle_ui") {
    togglePopupUI();
  }

  if (msg.action === "start") {
    deletedCount = 0;
    processed.clear();
    startTime = Date.now();

    // 🔥 Load more before checking (prevents false "no comments")
    await loadMoreComments();

    if (!hasMatchingComments(msg.settings)) {
      chrome.runtime.sendMessage({ type: "no_comments" });
      return;
    }

    run(msg.settings);
  }

  if (msg.action === "stop") {
    running = false;
  }
});

/* =========================
   CORE LOGIC
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

  let data = {
    count: deletedCount,
    time: formatTime(elapsed)
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

/* =========================
   WORK (SMART DETECTION)
========================= */

async function work(settings) {
  let items = getItems();
  let didWork = false;

  for (let item of items) {
    if (!running) return { didWork: false, newContentLoaded: false };

    try {
      let id = item.innerText.slice(0, 80);
      if (processed.has(id)) continue;

      let text = getText(item);

      if (!matchesFilters(text, settings)) continue;

      let btn = getDeleteButton(item);
      if (!btn) continue;

      btn.click();

      btn.click();

      await sleep(settings.speed || 1000);
      await handleConfirmIfExists();

// ✅ increment AFTER confirm
      deletedCount++;
      processed.add(id);
      updateProgress();

      didWork = true;

      await sleep(settings.speed || 1000);
      await handleConfirmIfExists();

    } catch (err) {
      console.error(err);
      running = false;
      return { didWork: false, newContentLoaded: false };
    }
  }

  // 🔥 Detect new content after scroll
  let prevHeight = document.body.scrollHeight;

  await loadMoreComments();

  let newHeight = document.body.scrollHeight;

  return {
    didWork,
    newContentLoaded: newHeight > prevHeight
  };
}

/* =========================
   MAIN LOOP (BULLETPROOF)
========================= */

async function run(settings) {
  running = true;

  console.log("START:", settings);

  while (running) {
    let result = await work(settings);

    let didWork = result.didWork;
    let newContentLoaded = result.newContentLoaded;

    // 🔥 PERFECT STOP CONDITION
    if (!didWork && !newContentLoaded) {
      running = false;

      chrome.runtime.sendMessage({
        type: "finished",
        count: deletedCount
      });

      console.log("No more comments. Stopping.");
      break;
    }

    await sleep(1000);
  }
}