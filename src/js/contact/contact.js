import { onDomReady, setButtonLoading } from "../core/dom.js";
import { t } from "../core/i18n.js";
import { detectSpam, recordSubmissionTime } from "./spam-detector.js";

const REQUEST_TIMEOUT_MS = 15000;
const TOAST_AUTO_HIDE_MS = 6000;
const TURNSTILE_ONLOAD_CALLBACK = "haruOnTurnstileLoad";
const TURNSTILE_SCRIPT_URL = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${TURNSTILE_ONLOAD_CALLBACK}`;

const CUSTOM_OPTION_VALUE = "__custom__";
const FREELANCE_SUBJECT_VALUE = "Freelance / Project Inquiry";
const JOB_SUBJECT_VALUE = "Job Opportunity / Interview";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_COMPANY_LENGTH = 120;
const MAX_ROLE_LENGTH = 120;
const MAX_REFERENCE_URL_LENGTH = 300;
const MAX_BUDGET_LENGTH = 60;
const MAX_TIMELINE_LENGTH = 60;

const pageLoadedAt = Date.now();
let firstInteractionAt = null;
let hasInteracted = false;
let toastTimer = null;
let turnstileActive = false;
let turnstileLoadStarted = false;
let turnstileWidgetId = null;
let turnstileToken = "";
let triggerTurnstileLoad = null;

function showToast(toast, message, type) {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }

  toast.textContent = message;
  toast.classList.remove("success", "error");
  if (type) {
    toast.classList.add(type);
  }

  if (type === "success") {
    toastTimer = setTimeout(() => {
      toast.textContent = "";
      toast.classList.remove("success", "error");
      toastTimer = null;
    }, TOAST_AUTO_HIDE_MS);
  }
}

/**
 * Check whether a string is a valid http:// or https:// URL.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidHttpUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
}

/**
 * Validate contact form field values and return localized message keys for invalid fields.
 * @param {{
 *   name: string,
 *   email: string,
 *   company?: string,
 *   referenceUrl?: string,
 *   selectedSubject: string,
 *   customSubject: string,
 *   selectedBudget?: string,
 *   customBudget?: string,
 *   selectedTimeline?: string,
 *   customTimeline?: string,
 *   role?: string,
 *   message: string,
 * }} fields
 * @returns {Array<{ field: "name" | "email" | "company" | "referenceUrl" | "subjectSelect" | "subjectCustom" | "budgetCustom" | "timelineCustom" | "role" | "message", messageKey: string }>}
 */
export function validateContactFields({
  name,
  email,
  company = "",
  referenceUrl = "",
  selectedSubject,
  customSubject,
  selectedBudget = "",
  customBudget = "",
  selectedTimeline = "",
  customTimeline = "",
  role = "",
  message,
}) {
  const errors = [];

  if (!name.trim()) {
    errors.push({ field: "name", messageKey: "contact.toast.enterName" });
  }
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
    errors.push({ field: "email", messageKey: "contact.toast.invalidEmail" });
  }
  if (company.trim().length > MAX_COMPANY_LENGTH) {
    errors.push({ field: "company", messageKey: "contact.toast.fieldTooLong" });
  }
  const trimmedReferenceUrl = referenceUrl.trim();
  if (trimmedReferenceUrl) {
    if (trimmedReferenceUrl.length > MAX_REFERENCE_URL_LENGTH) {
      errors.push({ field: "referenceUrl", messageKey: "contact.toast.fieldTooLong" });
    } else if (!isValidHttpUrl(trimmedReferenceUrl)) {
      errors.push({ field: "referenceUrl", messageKey: "contact.toast.invalidUrl" });
    }
  }
  if (!selectedSubject) {
    errors.push({ field: "subjectSelect", messageKey: "contact.toast.selectSubject" });
  } else if (selectedSubject === CUSTOM_OPTION_VALUE && !customSubject.trim()) {
    errors.push({ field: "subjectCustom", messageKey: "contact.toast.enterCustomSubject" });
  }
  if (selectedSubject === FREELANCE_SUBJECT_VALUE) {
    if (selectedBudget === CUSTOM_OPTION_VALUE) {
      const trimmedBudget = customBudget.trim();
      if (!trimmedBudget) {
        errors.push({ field: "budgetCustom", messageKey: "contact.toast.enterCustomBudget" });
      } else if (trimmedBudget.length > MAX_BUDGET_LENGTH) {
        errors.push({ field: "budgetCustom", messageKey: "contact.toast.fieldTooLong" });
      }
    }
    if (selectedTimeline === CUSTOM_OPTION_VALUE) {
      const trimmedTimeline = customTimeline.trim();
      if (!trimmedTimeline) {
        errors.push({ field: "timelineCustom", messageKey: "contact.toast.enterCustomTimeline" });
      } else if (trimmedTimeline.length > MAX_TIMELINE_LENGTH) {
        errors.push({ field: "timelineCustom", messageKey: "contact.toast.fieldTooLong" });
      }
    }
  }
  if (role.trim().length > MAX_ROLE_LENGTH) {
    errors.push({ field: "role", messageKey: "contact.toast.fieldTooLong" });
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

function getTurnstileSiteKey(widgetEl) {
  const attrKey = widgetEl?.dataset?.sitekey?.trim() || "";
  if (attrKey) return attrKey;
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_TURNSTILE_SITE_KEY) {
    return String(import.meta.env.VITE_TURNSTILE_SITE_KEY).trim();
  }
  return "";
}

function setTurnstileError(message) {
  const errorEl = document.getElementById("turnstile-error");
  if (errorEl) {
    errorEl.textContent = message;
  }
}

function resetTurnstileWidget() {
  turnstileToken = "";
  document.getElementById("turnstile-wrapper")?.classList.remove("is-interactive");
  if (turnstileWidgetId !== null && typeof window !== "undefined" && window.turnstile?.reset) {
    try {
      window.turnstile.reset(turnstileWidgetId);
    } catch {
      // Ignore widget reset errors if Turnstile has not finished initializing.
    }
  }
}

function initTurnstile() {
  const wrapper = document.getElementById("turnstile-wrapper");
  const widgetEl = document.getElementById("turnstile-widget");
  if (!wrapper || !widgetEl) return;

  const siteKey = getTurnstileSiteKey(widgetEl);
  if (!siteKey) return;

  turnstileActive = true;

  const form = document.getElementById("contact-form");
  const observeTarget = document.getElementById("contact") || form || wrapper;
  let observer = null;

  const renderWidget = () => {
    if (!window.turnstile?.render || turnstileWidgetId !== null) return;
    const isLight = document.documentElement.classList.contains("light-theme");
    turnstileWidgetId = window.turnstile.render(widgetEl, {
      sitekey: siteKey,
      theme: isLight ? "light" : "dark",
      appearance: "interaction-only",
      "before-interactive-callback"() {
        wrapper.classList.add("is-interactive");
      },
      "after-interactive-callback"() {
        wrapper.classList.remove("is-interactive");
      },
      callback(token) {
        turnstileToken = token || "";
        wrapper.classList.remove("is-interactive");
        setTurnstileError("");
      },
      "expired-callback"() {
        turnstileToken = "";
      },
      "error-callback"() {
        turnstileToken = "";
      },
    });
  };

  const attachInteractionTriggers = () => {
    form?.addEventListener("focusin", loadTurnstile);
    form?.addEventListener("pointerdown", loadTurnstile);
  };

  const cleanupTriggers = () => {
    observer?.disconnect();
    observer = null;
    form?.removeEventListener("focusin", loadTurnstile);
    form?.removeEventListener("pointerdown", loadTurnstile);
  };

  function loadTurnstile() {
    if (turnstileLoadStarted) return;
    turnstileLoadStarted = true;
    cleanupTriggers();
    wrapper.hidden = false;

    if (window.turnstile?.render) {
      renderWidget();
      return;
    }

    window[TURNSTILE_ONLOAD_CALLBACK] = renderWidget;

    if (!document.querySelector(`script[src="${TURNSTILE_SCRIPT_URL}"]`)) {
      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.addEventListener("error", () => {
        script.remove();
        turnstileLoadStarted = false;
        attachInteractionTriggers();
      });
      document.head.appendChild(script);
    }
  }

  triggerTurnstileLoad = loadTurnstile;

  if (typeof IntersectionObserver !== "function") {
    loadTurnstile();
    return;
  }

  attachInteractionTriggers();

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadTurnstile();
      }
    },
    { rootMargin: "200px 0px", threshold: 0 },
  );
  observer.observe(observeTarget);
}

function syncCustomSelectField(selectEl, customEl, { focusOnShow = false } = {}) {
  if (!selectEl || !customEl) return;
  const isCustom = selectEl.value === CUSTOM_OPTION_VALUE;
  customEl.style.display = isCustom ? "block" : "none";
  customEl.required = isCustom;
  clearFieldError(selectEl);
  clearFieldError(customEl);
  if (isCustom) {
    if (focusOnShow) {
      customEl.focus();
    }
  } else {
    customEl.value = "";
  }
}

function initFormControls() {
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const companyEl = document.getElementById("company");
  const referenceUrlEl = document.getElementById("reference-url");
  const roleEl = document.getElementById("role");
  const budgetEl = document.getElementById("budget");
  const budgetCustomEl = document.getElementById("budget-custom");
  const timelineEl = document.getElementById("timeline");
  const timelineCustomEl = document.getElementById("timeline-custom");
  const freelanceGroupEl = document.getElementById("freelance-fields");
  const jobGroupEl = document.getElementById("job-fields");
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

  if (budgetEl && budgetCustomEl) {
    budgetEl.addEventListener("change", () =>
      syncCustomSelectField(budgetEl, budgetCustomEl, { focusOnShow: true }),
    );
    syncCustomSelectField(budgetEl, budgetCustomEl);
  }

  if (timelineEl && timelineCustomEl) {
    timelineEl.addEventListener("change", () =>
      syncCustomSelectField(timelineEl, timelineCustomEl, { focusOnShow: true }),
    );
    syncCustomSelectField(timelineEl, timelineCustomEl);
  }

  const subjectSelect = document.getElementById("subject-select");
  const subjectCustom = document.getElementById("subject-custom");
  if (subjectSelect && subjectCustom) {
    const syncSubjectDependentFields = ({ focusOnShow = false } = {}) => {
      const value = subjectSelect.value;
      const isFreelance = value === FREELANCE_SUBJECT_VALUE;
      const isJob = value === JOB_SUBJECT_VALUE;

      syncCustomSelectField(subjectSelect, subjectCustom, { focusOnShow });

      if (freelanceGroupEl) {
        freelanceGroupEl.hidden = !isFreelance;
        if (!isFreelance) {
          if (budgetEl) budgetEl.value = "";
          if (timelineEl) timelineEl.value = "";
          syncCustomSelectField(budgetEl, budgetCustomEl);
          syncCustomSelectField(timelineEl, timelineCustomEl);
        }
      }

      if (jobGroupEl) {
        jobGroupEl.hidden = !isJob;
        if (!isJob && roleEl) {
          roleEl.value = "";
          clearFieldError(roleEl);
        }
      }
    };

    subjectSelect.addEventListener("change", () =>
      syncSubjectDependentFields({ focusOnShow: true }),
    );
    syncSubjectDependentFields();
  }

  for (const fieldEl of [
    nameEl,
    emailEl,
    companyEl,
    referenceUrlEl,
    subjectCustom,
    budgetCustomEl,
    timelineCustomEl,
    roleEl,
    messageEl,
  ]) {
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

  initTurnstile();
}

function resetFormState(form, subjectCustomEl, subjectHiddenEl, messageEl) {
  form.reset();
  clearAllFieldErrors(form);
  firstInteractionAt = null;
  hasInteracted = false;
  for (const customEl of [
    subjectCustomEl,
    document.getElementById("budget-custom"),
    document.getElementById("timeline-custom"),
  ]) {
    if (customEl) {
      customEl.style.display = "none";
      customEl.required = false;
      customEl.value = "";
    }
  }
  if (subjectHiddenEl) {
    subjectHiddenEl.value = "";
  }
  const freelanceGroupEl = document.getElementById("freelance-fields");
  if (freelanceGroupEl) {
    freelanceGroupEl.hidden = true;
  }
  const jobGroupEl = document.getElementById("job-fields");
  if (jobGroupEl) {
    jobGroupEl.hidden = true;
  }
  const counterEl = document.getElementById("message-char-count");
  if (counterEl && messageEl) {
    const maxLen = messageEl.getAttribute("maxlength") || "1000";
    counterEl.textContent = `0 / ${maxLen}`;
  }
  resetTurnstileWidget();
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
  const companyEl = document.getElementById("company");
  const referenceUrlEl = document.getElementById("reference-url");
  const subjectSelectEl = document.getElementById("subject-select");
  const subjectCustomEl = document.getElementById("subject-custom");
  const subjectHiddenEl = document.getElementById("subject");
  const budgetEl = document.getElementById("budget");
  const budgetCustomEl = document.getElementById("budget-custom");
  const timelineEl = document.getElementById("timeline");
  const timelineCustomEl = document.getElementById("timeline-custom");
  const roleEl = document.getElementById("role");
  const messageEl = document.getElementById("message");

  const fieldElements = {
    name: nameEl,
    email: emailEl,
    company: companyEl,
    referenceUrl: referenceUrlEl,
    subjectSelect: subjectSelectEl,
    subjectCustom: subjectCustomEl,
    budgetCustom: budgetCustomEl,
    timelineCustom: timelineCustomEl,
    role: roleEl,
    message: messageEl,
  };

  clearAllFieldErrors(form);

  const validationErrors = validateContactFields({
    name: nameEl.value,
    email: emailEl.value,
    company: companyEl?.value ?? "",
    referenceUrl: referenceUrlEl?.value ?? "",
    selectedSubject: subjectSelectEl.value,
    customSubject: subjectCustomEl.value,
    selectedBudget: budgetEl?.value ?? "",
    customBudget: budgetCustomEl?.value ?? "",
    selectedTimeline: timelineEl?.value ?? "",
    customTimeline: timelineCustomEl?.value ?? "",
    role: roleEl?.value ?? "",
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

  const resolvedTurnstileToken =
    turnstileToken || form.elements["cf-turnstile-response"]?.value?.trim() || "";
  if (turnstileActive && !resolvedTurnstileToken) {
    triggerTurnstileLoad?.();
    showToast(toast, "", "");
    setTurnstileError(t("contact.toast.turnstileRequired"));
    return;
  }

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const company = companyEl?.value?.trim() ?? "";
  const referenceUrl = referenceUrlEl?.value?.trim() ?? "";
  const selectedSubject = subjectSelectEl.value;
  const isCustomSubject = selectedSubject === CUSTOM_OPTION_VALUE;
  const subject = isCustomSubject ? subjectCustomEl.value.trim() : selectedSubject.trim();
  const selectedBudget = budgetEl?.value ?? "";
  const budget =
    selectedSubject === FREELANCE_SUBJECT_VALUE
      ? (selectedBudget === CUSTOM_OPTION_VALUE
          ? (budgetCustomEl?.value ?? "")
          : selectedBudget
        ).trim()
      : "";
  const selectedTimeline = timelineEl?.value ?? "";
  const timeline =
    selectedSubject === FREELANCE_SUBJECT_VALUE
      ? (selectedTimeline === CUSTOM_OPTION_VALUE
          ? (timelineCustomEl?.value ?? "")
          : selectedTimeline
        ).trim()
      : "";
  const role = selectedSubject === JOB_SUBJECT_VALUE ? (roleEl?.value?.trim() ?? "") : "";
  const message = messageEl.value.trim();

  if (subjectHiddenEl) {
    subjectHiddenEl.value = subject;
  }

  const honeypotEl = form.elements["bot-field"];
  const spamCheck = detectSpam({
    honeypot: honeypotEl ? honeypotEl.value : "",
    name,
    email,
    company,
    role,
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

    const optionalFields = { company, referenceUrl, budget, timeline, role };
    for (const [key, val] of Object.entries(optionalFields)) {
      if (val) {
        formData.set(key, val);
      } else {
        formData.delete(key);
      }
    }

    if (resolvedTurnstileToken) {
      formData.set("cf-turnstile-response", resolvedTurnstileToken);
    }

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
    } else if (err.status === 403) {
      errorMsg = t("contact.toast.turnstileFailed");
      resetTurnstileWidget();
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
