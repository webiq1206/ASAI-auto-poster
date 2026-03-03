export interface SelectorStrategy {
  type: "aria-label" | "role" | "xpath" | "css";
  value: string;
  role?: string;
}

function findByAriaLabel(label: string): Element | null {
  return document.querySelector(`[aria-label="${CSS.escape(label)}"]`);
}

function findByRoleAndText(role: string, text: string): Element | null {
  const elements = document.querySelectorAll(`[role="${role}"]`);
  for (const el of elements) {
    if (el.textContent?.trim().includes(text)) return el;
  }
  return null;
}

function findByXPath(xpath: string): Element | null {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  );
  return result.singleNodeValue as Element | null;
}

/**
 * Resolves a selector using priority: aria-label > role+text > XPath > CSS.
 * Returns the first match found across strategies.
 */
export function resolveSelector(
  strategies: SelectorStrategy[],
): Element | null {
  const priority: SelectorStrategy["type"][] = [
    "aria-label",
    "role",
    "xpath",
    "css",
  ];

  for (const type of priority) {
    for (const strategy of strategies) {
      if (strategy.type !== type) continue;

      let element: Element | null = null;
      switch (strategy.type) {
        case "aria-label":
          element = findByAriaLabel(strategy.value);
          break;
        case "role":
          element = findByRoleAndText(strategy.role ?? "button", strategy.value);
          break;
        case "xpath":
          element = findByXPath(strategy.value);
          break;
        case "css":
          element = document.querySelector(strategy.value);
          break;
      }

      if (element) return element;
    }
  }

  return null;
}

export function querySelector(selector: string): Element | null {
  // Try aria-label first
  const byAria = findByAriaLabel(selector);
  if (byAria) return byAria;

  // Try role+text for common interactive elements
  for (const role of ["button", "textbox", "combobox", "listbox", "option"]) {
    const byRole = findByRoleAndText(role, selector);
    if (byRole) return byRole;
  }

  // Try XPath if it looks like one
  if (selector.startsWith("/") || selector.startsWith("(")) {
    const byXPath = findByXPath(selector);
    if (byXPath) return byXPath;
  }

  // Fall back to CSS selector
  return document.querySelector(selector);
}

export function waitForElement(
  selector: string,
  timeoutMs = 10000,
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const existing = querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const startTime = Date.now();

    const observer = new MutationObserver(() => {
      const el = querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      } else if (Date.now() - startTime >= timeoutMs) {
        observer.disconnect();
        reject(new Error(`Element "${selector}" not found within ${timeoutMs}ms`));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    setTimeout(() => {
      observer.disconnect();
      const el = querySelector(selector);
      if (el) {
        resolve(el);
      } else {
        reject(new Error(`Element "${selector}" not found within ${timeoutMs}ms`));
      }
    }, timeoutMs);
  });
}
