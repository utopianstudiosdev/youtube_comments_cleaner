async function loadState() {
  let res = await chrome.storage.local.get(["progress", "keywords"]);

  const progressEl = document.getElementById("progressValue");
  const timeEl = document.getElementById("timeTaken");
  const statusEl = document.getElementById("statusText");
  const keywordEl = document.getElementById("keyword");

  if (res.progress && progressEl) {
    progressEl.textContent = res.progress.count ?? 0;

    if (timeEl && res.progress.time) {
      timeEl.textContent = "Time: " + res.progress.time;
    }
  }

  if (keywordEl && res.keywords) {
    keywordEl.value = res.keywords.join(", ");
  }

  if (statusEl) statusEl.textContent = "";
}

document.addEventListener("DOMContentLoaded", loadState);

// START
document.getElementById("start").onclick = async () => {
  const progressEl = document.getElementById("progressValue");
  const timeEl = document.getElementById("timeTaken");
  const statusEl = document.getElementById("statusText");

  // 🔥 RESET HERE
  progressEl.textContent = "0";
  timeEl.textContent = "Time: 0s";

  statusEl.textContent = "Running...";
  statusEl.className = "status-text status-running";

  const keywords = document.getElementById("keyword").value
      .split(",")
      .map(k => k.trim().toLowerCase())
      .filter(Boolean);

  const settings = {
    keywords,
    speed: parseInt(document.getElementById("speed").value) || 1000
  };

  chrome.storage.local.set({ keywords });
  chrome.runtime.sendMessage({ action: "start", settings });
};

// STOP
document.getElementById("stop").onclick = () => {
  chrome.runtime.sendMessage({ action: "stop" });

  const statusEl = document.getElementById("statusText");
  statusEl.textContent = "Stopped";
  statusEl.className = "status-text status-error";
};

// CLOSE
document.getElementById("closeBtn").onclick = () => {
  window.parent.postMessage({ type: "close_iframe" }, "*");
};

// LISTENER
chrome.runtime.onMessage.addListener((msg) => {
  const progressEl = document.getElementById("progressValue");
  const timeEl = document.getElementById("timeTaken");
  const statusEl = document.getElementById("statusText");

  if (msg.type === "no_comments") {
    statusEl.textContent = "No comments found";
    statusEl.className = "status-text status-error";
    return;
  }

  if (msg.type === "finished") {
    statusEl.textContent = `Finished ✅ (${msg.count})`;
    statusEl.className = "status-text status-success";
    return;
  }

  if (msg.type === "progress") {
    if (progressEl) {
      progressEl.textContent = msg.count;

      progressEl.classList.remove("num");
      void progressEl.offsetWidth;
      progressEl.classList.add("num");
    }

    if (timeEl) {
      timeEl.textContent = "Time: " + msg.time;

      timeEl.style.animation = "none";
      void timeEl.offsetWidth;
      timeEl.style.animation = "fade-in 0.3s ease";
    }
  }
});