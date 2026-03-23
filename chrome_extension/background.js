const TARGET_URL =
    "https://www.youtube.com/feed/history/comment_history";

function isCommentPage(url) {
  return (
      url &&
      url.includes("myactivity.google.com") &&
      url.includes("youtube_comments")
  );
}

chrome.action.onClicked.addListener(async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // If not already on final page → open via YouTube link (it redirects)
  if (!isCommentPage(tab.url)) {
    tab = await chrome.tabs.create({ url: TARGET_URL });

    const listener = (tabId, changeInfo, updatedTab) => {
      if (tabId !== tab.id) return;

      // ✅ Wait for FINAL redirected page
      if (
          changeInfo.status === "complete" &&
          isCommentPage(updatedTab.url)
      ) {
        chrome.tabs.onUpdated.removeListener(listener);

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.togglePopupUI?.()
        });
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
    return;
  }

  // Already on correct page
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.togglePopupUI?.()
  });
});

// Forward START/STOP
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.action === "start" || msg.action === "stop") {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) chrome.tabs.sendMessage(tab.id, msg);
  }
});