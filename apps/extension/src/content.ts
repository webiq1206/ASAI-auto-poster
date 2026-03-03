import { fillField, clickButton, getFormState, selectDropdownOption } from "./lib/form-filler";
import { uploadPhotos } from "./lib/photo-uploader";
import { waitForElement } from "./lib/selectors";
import type { TimingConfig } from "./lib/timing";

declare global {
  interface Window {
    __qcAutoPoster: typeof api;
  }
}

const api = {
  fillField: (selector: string, value: string, timing?: TimingConfig) =>
    fillField(selector, value, timing),

  uploadPhotos: (selector: string, photoUrls: string[], delayMs?: number) =>
    uploadPhotos(selector, photoUrls, delayMs),

  clickButton: (selector: string) => clickButton(selector),

  getFormState: () => getFormState(),

  waitForElement: (selector: string, timeoutMs?: number) =>
    waitForElement(selector, timeoutMs).then(() => true),

  selectDropdownOption: (triggerSelector: string, optionText: string) =>
    selectDropdownOption(triggerSelector, optionText),
};

window.__qcAutoPoster = api;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const { action, args } = message as { action: keyof typeof api; args: unknown[] };

  if (action in api) {
    const fn = api[action] as (...a: unknown[]) => Promise<unknown> | unknown;
    Promise.resolve(fn(...args))
      .then((result) => sendResponse({ success: true, result }))
      .catch((err: Error) => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async response
  }

  sendResponse({ success: false, error: `Unknown action: ${action}` });
});

console.log("[QC Auto Poster] Content script loaded");
