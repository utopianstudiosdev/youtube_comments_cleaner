const TARGET_URL =
    "https://www.youtube.com/feed/history/comment_history";

chrome.action.onClicked.addListener(async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.includes("youtube")) {
    tab = await chrome.tabs.create({ url: TARGET_URL });

    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === tab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.togglePopupUI?.()
        });
      }
    });

    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.togglePopupUI?.()
  });
});

// ✅ SINGLE listener
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.action === "start" || msg.action === "stop") {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) chrome.tabs.sendMessage(tab.id, msg);
  }
});