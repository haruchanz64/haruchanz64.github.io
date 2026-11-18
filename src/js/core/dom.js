/**
 * Run `callback` once the DOM is ready (or immediately if already parsed).
 * Returns a Promise resolving with `callback`'s return value.
 * @template T
 * @param {() => T | Promise<T>} callback
 * @returns {Promise<T | undefined>}
 */
export function onDomReady(callback) {
  if (typeof document === "undefined") {
    return Promise.resolve(undefined);
  }
  if (document.readyState === "loading") {
    return new Promise((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(callback()), {
        once: true,
      });
    });
  }
  return Promise.resolve(callback());
}

/**
 * Return true when maintenance mode is enabled on the document root (`data-maintenance="true"`).
 * @param {Document | null} [doc]
 * @returns {boolean}
 */
export function isMaintenanceMode(doc = typeof document !== "undefined" ? document : null) {
  return doc?.documentElement?.dataset?.maintenance === "true";
}

/**
 * Toggle disabled, `aria-busy`, and `.btn-text` / `.btn-spinner` visibility on a button.
 * @param {HTMLElement | null | undefined} button
 * @param {boolean} isLoading
 */
export function setButtonLoading(button, isLoading) {
  if (!button) return;
  const btnText = button.querySelector?.(".btn-text");
  const spinner = button.querySelector?.(".btn-spinner");

  button.disabled = isLoading;
  button.setAttribute?.("aria-busy", String(isLoading));
  if (btnText) btnText.style.display = isLoading ? "none" : "inline";
  if (spinner) spinner.style.display = isLoading ? "inline" : "none";
}

/**
 * Attach close-button, backdrop-click, and Escape-key handlers to a modal overlay.
 * @param {{
 *   modal: HTMLElement,
 *   closeButton?: Element | null,
 *   isOpen: () => boolean,
 *   onClose: () => void,
 *   attachEscape?: boolean,
 * }} options
 */
export function bindModalDismiss({
  modal,
  closeButton = null,
  isOpen,
  onClose,
  attachEscape = true,
}) {
  closeButton?.addEventListener("click", onClose);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      onClose();
    }
  });
  if (attachEscape) {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) {
        onClose();
      }
    });
  }
}
