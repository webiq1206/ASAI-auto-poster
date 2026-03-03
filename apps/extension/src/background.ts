interface ExtensionState {
  activeTabId: number | null;
  isPosting: boolean;
  lastError: string | null;
}

const state: ExtensionState = {
  activeTabId: null,
  isPosting: false,
  lastError: null,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "GET_STATE":
      sendResponse({ success: true, state });
      break;

    case "SET_ACTIVE_TAB":
      state.activeTabId = sender.tab?.id ?? null;
      sendResponse({ success: true });
      break;

    case "SET_POSTING":
      state.isPosting = message.value ?? false;
      sendResponse({ success: true });
      break;

    case "REPORT_ERROR":
      state.lastError = message.error ?? null;
      console.error("[QC Background] Error reported:", state.lastError);
      sendResponse({ success: true });
      break;

    case "FORWARD_TO_TAB": {
      const tabId = message.tabId ?? state.activeTabId;
      if (!tabId) {
        sendResponse({ success: false, error: "No active tab" });
        break;
      }
      chrome.tabs.sendMessage(tabId, message.payload, (response) => {
        sendResponse(response);
      });
      return true; // keep channel open for async tab response
    }

    case "PING":
      sendResponse({ success: true, alive: true });
      break;

    default:
      sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete" && tabId === state.activeTabId) {
    state.isPosting = false;
  }
});

console.log("[QC Auto Poster] Background service worker started");
