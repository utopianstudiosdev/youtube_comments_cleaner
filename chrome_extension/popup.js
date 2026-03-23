// 🔄 Load saved data on popup open
async function loadState() {
  let res = await chrome.storage.local.get(["progress", "keywords"]);

  // restore progress
if (res.progress) {
  document.getElementById("progress").innerText =
    `Deleted: ${res.progress.count}`;

  // 🔥 hide if still "starting..."
  if (res.progress.time && res.progress.time !== "starting...") {
    document.getElementById("timeEstimate").innerText =
      `Speed: ${res.progress.time}`;
    document.getElementById("timeEstimate").style.display = "block";
  } else {
    document.getElementById("timeEstimate").style.display = "none";
  }
}

  // 🔥 restore last used keywords
  if (res.keywords) {
    document.getElementById("keyword").value = res.keywords.join(", ");
  }
}

document.addEventListener("DOMContentLoaded", loadState);

// 🚀 START
document.getElementById("start").onclick = async () => {
  document.getElementById("progress").innerText = "Running...";
  document.getElementById("progress").classList.add("glow");

  let keywordInput = document.getElementById("keyword")?.value || "";

  let keywords = keywordInput
    .split(",")
    .map(k => k.trim().toLowerCase())
    .filter(k => k.length > 0);

  let settings = {
    keywords,
    speed: parseInt(document.getElementById("speed").value) || 1000
  };

  console.log("Sending settings:", settings);

  // 🔥 SAVE keywords for next time
  chrome.storage.local.set({ keywords });

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url.includes("myactivity.google.com")) {
    alert("Open YouTube comment history page first.");
    return;
  }

  // reset progress
  chrome.storage.local.set({
    progress: { count: 0, time: "starting..." }
  });

  chrome.tabs.sendMessage(tab.id, {
    action: "start",
    settings
  });
};

// 🛑 STOP
document.getElementById("stop").onclick = async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, { action: "stop" });

  document.getElementById("progress").innerText = "Stopped";
};

// 🔄 LIVE UPDATES
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "progress") {
    document.getElementById("progress").innerText =
      `Deleted: ${msg.count}`;

    if (msg.time && msg.time !== "starting...") {
  document.getElementById("timeEstimate").innerText =
    `Speed: ${msg.time}`;
  document.getElementById("timeEstimate").style.display = "block";
}
  }
});