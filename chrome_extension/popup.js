async function loadState() {
  try {
    let res = await chrome.storage.local.get(["progress", "keywords"]);

    const progressEl = document.getElementById("progressValue");
    const timeEl = document.getElementById("timeTaken");
    const statusEl = document.getElementById("statusText");
    const keywordEl = document.getElementById("keyword");

    if (res.progress && progressEl) {
      progressEl.textContent = res.progress.count ?? 0;

      if (timeEl && res.progress.time) {
        timeEl.textContent = "Time: " + res.progress.time;
        triggerTimeAnimation(timeEl);
      }
      triggerCountAnimation(progressEl);
    }

    if (keywordEl && res.keywords) {
      keywordEl.value = res.keywords.join(", ");
    }

    if (statusEl) statusEl.textContent = "";
  } catch (err) {
    // If the popup can't load state, keep the UI usable.
    console.error("popup loadState failed:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadState);

function triggerCountAnimation(el) {
  if (!el) return;
  el.classList.remove("count-anim");
  void el.offsetWidth;
  el.classList.add("count-anim");
}

function triggerTimeAnimation(el) {
  if (!el) return;
  el.classList.remove("time-anim");
  void el.offsetWidth;
  el.classList.add("time-anim");
}

function triggerStatusAnimation(el) {
  if (!el) return;
  el.classList.remove("status-anim");
  void el.offsetWidth;
  el.classList.add("status-anim");
}

// START
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const closeBtn = document.getElementById("closeBtn");

if (startBtn) {
  startBtn.onclick = async () => {
    const progressEl = document.getElementById("progressValue");
    const timeEl = document.getElementById("timeTaken");
    const statusEl = document.getElementById("statusText");

    if (!progressEl || !timeEl || !statusEl) return;

    // 🔥 RESET HERE
    progressEl.textContent = "0";
    triggerCountAnimation(progressEl);
    timeEl.textContent = "Time: 0s";
    triggerTimeAnimation(timeEl);

    statusEl.textContent = "Running...";
    statusEl.className = "status-text status-running";
    triggerStatusAnimation(statusEl);

    const keywordInput = document.getElementById("keyword");
    const speedSelect = document.getElementById("speed");
    if (!keywordInput || !speedSelect) return;

    const keywords = keywordInput.value
        .split(",")
        .map(k => k.trim().toLowerCase())
        .filter(Boolean);

    const settings = {
      keywords,
      speed: parseInt(speedSelect.value) || 1000
    };

    chrome.storage.local.set({ keywords });
    chrome.runtime.sendMessage({ action: "start", settings });
  };
}

// STOP
if (stopBtn) {
  stopBtn.onclick = () => {
    if (!closeBtn) return;
  chrome.runtime.sendMessage({ action: "stop" });

  const statusEl = document.getElementById("statusText");
  if (!statusEl) return;
  statusEl.textContent = "Stopped";
  statusEl.className = "status-text status-error";
  triggerStatusAnimation(statusEl);
  };
}

// CLOSE
if (closeBtn) {
  closeBtn.onclick = () => {
    window.parent.postMessage({ type: "close_iframe" }, "*");
  };
}

// LISTENER
chrome.runtime.onMessage.addListener((msg) => {
  const progressEl = document.getElementById("progressValue");
  const timeEl = document.getElementById("timeTaken");
  const statusEl = document.getElementById("statusText");

  if (msg.type === "no_comments") {
    statusEl.textContent = "No comments found";
    statusEl.className = "status-text status-error";
    triggerStatusAnimation(statusEl);
    return;
  }

  if (msg.type === "finished") {
    statusEl.textContent = `Finished ✅ (${msg.count})`;
    statusEl.className = "status-text status-success";
    triggerStatusAnimation(statusEl);
    return;
  }

  if (msg.type === "progress") {
    if (progressEl) {
      progressEl.textContent = msg.count;
      triggerCountAnimation(progressEl);
    }

    if (timeEl) {
      timeEl.textContent = "Time: " + msg.time;
      triggerTimeAnimation(timeEl);
    }
  }
});