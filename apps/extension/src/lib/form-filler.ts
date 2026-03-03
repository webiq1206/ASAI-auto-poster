import { keystrokeDelay, fieldPause, randomDelay, type TimingConfig } from "./timing";
import { querySelector, waitForElement } from "./selectors";

function dispatchKeyEvents(el: Element, char: string): void {
  const opts: KeyboardEventInit = {
    key: char,
    code: `Key${char.toUpperCase()}`,
    bubbles: true,
    cancelable: true,
    composed: true,
  };

  el.dispatchEvent(new KeyboardEvent("keydown", opts));
  el.dispatchEvent(new KeyboardEvent("keypress", opts));
  el.dispatchEvent(new InputEvent("input", { data: char, inputType: "insertText", bubbles: true, cancelable: true, composed: true }));
  el.dispatchEvent(new KeyboardEvent("keyup", opts));
}

function clearField(el: HTMLInputElement | HTMLTextAreaElement): void {
  el.focus();
  el.value = "";
  el.dispatchEvent(new InputEvent("input", { inputType: "deleteContentBackward", bubbles: true, composed: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Types a value into a text input or textarea character by character,
 * dispatching realistic keyboard events with human-like delays.
 */
export async function typeIntoField(
  el: Element,
  value: string,
  timing?: TimingConfig,
): Promise<void> {
  const input = el as HTMLInputElement | HTMLTextAreaElement;

  input.focus();
  input.dispatchEvent(new FocusEvent("focus", { bubbles: true }));

  if (input.value) {
    clearField(input);
    await keystrokeDelay();
  }

  for (const char of value) {
    dispatchKeyEvents(input, char);
    input.value += char;

    const min = timing?.keystrokeMin ?? 40;
    const max = timing?.keystrokeMax ?? 100;
    await randomDelay(min, max);
  }

  input.dispatchEvent(new Event("change", { bubbles: true }));
  input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
}

/**
 * Selects an option from a dropdown/select-style control.
 * Clicks to open, finds the matching option, then clicks to select.
 */
export async function selectDropdownOption(
  triggerSelector: string,
  optionText: string,
): Promise<void> {
  const trigger = await waitForElement(triggerSelector);
  (trigger as HTMLElement).click();
  trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

  await randomDelay(300, 600);

  const options = document.querySelectorAll('[role="option"], [role="listbox"] > *, li');
  let matched: Element | null = null;
  for (const opt of options) {
    if (opt.textContent?.trim().toLowerCase().includes(optionText.toLowerCase())) {
      matched = opt;
      break;
    }
  }

  if (!matched) {
    throw new Error(`Dropdown option "${optionText}" not found`);
  }

  (matched as HTMLElement).click();
  matched.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
}

/**
 * Fills a form field identified by selector. Handles text inputs,
 * textareas, and contenteditable elements.
 */
export async function fillField(
  selector: string,
  value: string,
  timing?: TimingConfig,
): Promise<void> {
  const el = await waitForElement(selector);

  if (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement
  ) {
    await typeIntoField(el, value, timing);
  } else if ((el as HTMLElement).isContentEditable) {
    (el as HTMLElement).focus();
    el.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
    (el as HTMLElement).textContent = "";

    for (const char of value) {
      dispatchKeyEvents(el, char);
      (el as HTMLElement).textContent += char;

      const min = timing?.keystrokeMin ?? 40;
      const max = timing?.keystrokeMax ?? 100;
      await randomDelay(min, max);
    }

    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
  } else {
    throw new Error(`Element "${selector}" is not a fillable field`);
  }

  await fieldPause();
}

export async function clickButton(selector: string): Promise<void> {
  const el = await waitForElement(selector);
  (el as HTMLElement).focus();
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
  el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, composed: true }));
  (el as HTMLElement).click();
}

export function getFormState(): Record<string, string> {
  const state: Record<string, string> = {};
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    "input, textarea, [contenteditable='true']",
  );

  for (const el of inputs) {
    const label =
      el.getAttribute("aria-label") ??
      el.getAttribute("name") ??
      el.getAttribute("placeholder") ??
      el.id;

    if (label) {
      state[label] =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
          ? el.value
          : el.textContent ?? "";
    }
  }

  return state;
}
