import { onDomReady, setButtonLoading } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { detectSpam, recordSubmissionTime } from "./spam-detector.js";

const REQUEST_TIMEOUT_MS = 15000;
const TOAST_AUTO_HIDE_MS = 6000;

const pageLoadedAt = Date.now();
let firstInteractionAt = null;
let hasInteracted = false;
let toastTimer = null;

function showToast(toast, message, type) {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  toast.textContent = message;
  toast.className = type ? `form-toast ${type}` : "form-toast";

  if (type === "success") {
    toastTimer = setTimeout(() => {
      toast.textContent = "";
      toast.className = "form-toast";
      toastTimer = null;
    }, TOAST_AUTO_HIDE_MS);
  }
}

const CUSTOM_SUBJECT_VALUE = "__custom__";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate contact form field values and return localized message keys for invalid fields.
 * @param {{
 *   name: string,
 *   email: string,
 *   selectedSubject: string,
 *   customSubject: string,
 *   message: string,
 * }} fields
 * @returns {Array<{ field: "name" | "email" | "subjectSelect" | "subjectCustom" | "message", messageKey: string }>}
 */
export function validateContactFields({ name, email, selectedSubject, customSubject, message }) {
  const errors = [];

  if (!name.trim()) {
    errors.push({ field: "name", messageKey: "contact.toast.enterName" });
  }
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
    errors.push({ field: "email", messageKey: "contact.toast.invalidEmail" });
  }
  if (!selectedSubject) {
    errors.push({ field: "subjectSelect", messageKey: "contact.toast.selectSubject" });
  } else if (selectedSubject === CUSTOM_SUBJECT_VALUE && !customSubject.trim()) {
    errors.push({ field: "subjectCustom", messageKey: "contact.toast.enterCustomSubject" });
  }
  if (!message.trim()) {
    errors.push({ field: "message", messageKey: "contact.toast.enterMessage" });
  }

  return errors;
}

function getErrorEl(fieldEl) {
  const errorId = fieldEl?.getAttribute?.("aria-describedby");
  return errorId ? document.getElementById(errorId) : null;
}

function setFieldError(fieldEl, message) {
  if (!fieldEl) return;
  fieldEl.setAttribute("aria-invalid", "true");
  fieldEl.closest?.(".form-field")?.classList.add("is-invalid");
  const errorEl = getErrorEl(fieldEl);
  if (errorEl) {
    errorEl.textContent = message;
  }
}

function clearFieldError(fieldEl) {
  if (!fieldEl) return;
  fieldEl.removeAttribute("aria-invalid");
  const wrapper = fieldEl.closest?.(".form-field");
  if (wrapper && !wrapper.querySelector?.('[aria-invalid="true"]')) {
    wrapper.classList.remove("is-invalid");
  }
  const errorEl = getErrorEl(fieldEl);
  if (errorEl) {
    errorEl.textContent = "";
  }
}

function clearAllFieldErrors(form) {
  if (!form) return;
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
    el.removeAttribute("aria-invalid");
  });
  form.querySelectorAll(".form-field.is-invalid").forEach((el) => {
    el.classList.remove("is-invalid");
  });
  form.querySelectorAll(".form-error").forEach((el) => {
    el.textContent = "";
  });
}

function initFormControls() {
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const messageEl = document.getElementById("message");
  const counterEl = document.getElementById("message-char-count");
  if (messageEl && counterEl) {
    const maxLen = messageEl.getAttribute("maxlength") || "1000";
    const update = () => {
      counterEl.textContent = `${messageEl.value.length} / ${maxLen}`;
    };

    messageEl.addEventListener("input", update);
    update();
  }

  const subjectSelect = document.getElementById("subject-select");
  const subjectCustom = document.getElementById("subject-custom");
  if (subjectSelect && subjectCustom) {
    const syncCustomSubjectVisibility = () => {
      const isCustom = subjectSelect.value === CUSTOM_SUBJECT_VALUE;
      subjectCustom.style.display = isCustom ? "block" : "none";
      subjectCustom.required = isCustom;
      clearFieldError(subjectSelect);
      clearFieldError(subjectCustom);
      if (isCustom) {
        subjectCustom.focus();
      } else {
        subjectCustom.value = "";
      }
    };

    subjectSelect.addEventListener("change", syncCustomSubjectVisibility);
    syncCustomSubjectVisibility();
  }

  for (const fieldEl of [nameEl, emailEl, subjectCustom, messageEl]) {
    fieldEl?.addEventListener("input", () => clearFieldError(fieldEl));
  }

  const form = document.getElementById("contact-form");
  if (form) {
    const markInteraction = (event) => {
      if (event.target?.name === "bot-field") return;
      if (!hasInteracted) {
        hasInteracted = true;
        firstInteractionAt = Date.now();
      }
    };
    form.addEventListener("focusin", markInteraction);
    form.addEventListener("input", markInteraction);
  }
}

function resetFormState(form, subjectCustomEl, subjectHiddenEl, messageEl) {
  form.reset();
  clearAllFieldErrors(form);
  firstInteractionAt = null;
  hasInteracted = false;
  if (subjectCustomEl) {
    subjectCustomEl.style.display = "none";
    subjectCustomEl.required = false;
  }
  if (subjectHiddenEl) {
    subjectHiddenEl.value = "";
  }
  const counterEl = document.getElementById("message-char-count");
  if (counterEl) {
    const maxLen = messageEl.getAttribute("maxlength") || "1000";
    counterEl.textContent = `0 / ${maxLen}`;
  }
}

void onDomReady(initFormControls);

/**
 * Handles contact form submission via /api/contact with inline validation, timeout, and accessible toast feedback.
 * @param {SubmitEvent} e
 */
export async function sendEmail(e) {
  e.preventDefault();

  const form = document.getElementById("contact-form");
  const btn = document.getElementById("submit-btn");
  const toast = document.getElementById("form-toast");

  if (!form || !btn || !toast || btn.disabled) {
    return;
  }

  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const subjectSelectEl = document.getElementById("subject-select");
  const subjectCustomEl = document.getElementById("subject-custom");
  const subjectHiddenEl = document.getElementById("subject");
  const messageEl = document.getElementById("message");

  const fieldElements = {
    name: nameEl,
    email: emailEl,
    subjectSelect: subjectSelectEl,
    subjectCustom: subjectCustomEl,
    message: messageEl,
  };

  clearAllFieldErrors(form);

  const validationErrors = validateContactFields({
    name: nameEl.value,
    email: emailEl.value,
    selectedSubject: subjectSelectEl.value,
    customSubject: subjectCustomEl.value,
    message: messageEl.value,
  });

  if (validationErrors.length > 0) {
    showToast(toast, "", "");
    for (const { field, messageKey } of validationErrors) {
      setFieldError(fieldElements[field], t(messageKey));
    }
    fieldElements[validationErrors[0].field]?.focus();
    return;
  }

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const selectedSubject = subjectSelectEl.value;
  const isCustomSubject = selectedSubject === CUSTOM_SUBJECT_VALUE;
  const subject = isCustomSubject ? subjectCustomEl.value.trim() : selectedSubject.trim();
  const message = messageEl.value.trim();

  if (subjectHiddenEl) {
    subjectHiddenEl.value = subject;
  }

  const honeypotEl = form.elements["bot-field"];
  const spamCheck = detectSpam({
    honeypot: honeypotEl ? honeypotEl.value : "",
    name,
    email,
    subject,
    message,
    timing: { pageLoadedAt, firstInteractionAt, hasInteracted },
    storage: window.localStorage,
  });

  if (spamCheck.blocked) {
    if (spamCheck.silent) {
      showToast(toast, t("contact.toast.sent"), "success");
      resetFormState(form, subjectCustomEl, subjectHiddenEl, messageEl);
    } else {
      showToast(toast, spamCheck.userMessage, "error");
    }
    return;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    showToast(toast, t("contact.toast.offline"), "error");
    return;
  }

  // Vite dev server returns 200 OK for POST without processing the Worker endpoint.
  if (import.meta.env.DEV && window.location.port !== "8787") {
    showToast(toast, t("contact.toast.devMode"), "error");
    return;
  }

  showToast(toast, "", "");
  setButtonLoading(btn, true);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const formData = new FormData(form);
    formData.set("name", name);
    formData.set("email", email);
    formData.set("subject", subject);
    formData.set("message", message);

    const contactEndpoint =
      window.location.hostname.endsWith(".workers.dev") || window.location.port === "8787"
        ? "/api/contact"
        : "https://haruchanz64-portfolio.haruchanz64.workers.dev/api/contact";

    const response = await fetch(contactEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(formData).toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      const statusError = new Error(`Request failed with status ${response.status}`);
      statusError.status = response.status;
      throw statusError;
    }

    recordSubmissionTime(window.localStorage);
    showToast(toast, t("contact.toast.sent"), "success");
    resetFormState(form, subjectCustomEl, subjectHiddenEl, messageEl);
  } catch (err) {
    console.error("Contact form submission error:", err);
    let errorMsg = t("contact.toast.genericError");

    if (err.name === "AbortError") {
      errorMsg = t("contact.toast.timeout");
    } else if (err.status === 404 || err.status === 405) {
      errorMsg = t("contact.toast.endpointUnavailable", { status: err.status });
    } else if (err.status >= 500) {
      errorMsg = t("contact.toast.serverError", { status: err.status });
    }

    showToast(toast, errorMsg, "error");
    toast.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } finally {
    clearTimeout(timeoutId);
    setButtonLoading(btn, false);
  }
}
