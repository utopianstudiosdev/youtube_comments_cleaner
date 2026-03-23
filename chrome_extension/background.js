const TARGET_URL =
    "https://myactivity.google.com/page?hl=en&utm_medium=web&utm_source=youtube&page=youtube_comments";

// 🔘 Extension icon click → toggle UI
chrome.action.onClicked.addListener(async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // If not on correct page → open it
  if (!tab.url || !tab.url.includes("youtube_comments")) {
    tab = await chrome.tabs.create({ url: TARGET_URL });

    // Wait for page to load before injecting/toggling
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            if (window.togglePopupUI) {
              window.togglePopupUI();
            }
          }
        });
      }
    });

    return;
  }

  // Already on correct page → toggle immediately
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      if (window.togglePopupUI) {
        window.togglePopupUI();
      }
    }
  });
});

// 🔁 Forward START/STOP from iframe → content script
chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.action === "start" || msg.action === "stop") {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, msg);
  }
});

// Forward start/stop from iframe → content script
chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.action === "start" || msg.action === "stop") {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, msg);
  }
});
