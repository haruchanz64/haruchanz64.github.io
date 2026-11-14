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

function setSubmitting(btn, isSubmitting) {
  const btnText = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".btn-spinner");

  btn.disabled = isSubmitting;
  btn.setAttribute("aria-busy", String(isSubmitting));
  btnText.style.display = isSubmitting ? "none" : "inline";
  spinner.style.display = isSubmitting ? "inline" : "none";
}

const CUSTOM_SUBJECT_VALUE = "__custom__";

function initFormControls() {
  const messageEl = document.getElementById("message");
  const counterEl = document.getElementById("message-char-count");
  if (messageEl && counterEl) {
    const maxLen = messageEl.getAttribute("maxlength") || "2000";
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
      if (isCustom) {
        subjectCustom.focus();
      } else {
        subjectCustom.value = "";
      }
    };

    subjectSelect.addEventListener("change", syncCustomSubjectVisibility);
    syncCustomSubjectVisibility();
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
    const maxLen = messageEl.getAttribute("maxlength") || "2000";
    counterEl.textContent = `0 / ${maxLen}`;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFormControls);
} else {
  initFormControls();
}

/**
 * Handles contact form submission via /api/contact with validation, timeout, and accessible toast feedback.
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

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const selectedSubject = subjectSelectEl ? subjectSelectEl.value : "";
  const isCustomSubject = selectedSubject === CUSTOM_SUBJECT_VALUE;
  const subject = isCustomSubject
    ? subjectCustomEl.value.trim()
    : selectedSubject.trim();
  const message = messageEl.value.trim();

  if (!name) {
    showToast(toast, "Please enter your name.", "error");
    nameEl.focus();
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast(toast, "Please enter a valid email address.", "error");
    emailEl.focus();
    return;
  }
  if (!selectedSubject) {
    showToast(toast, "Please select a subject.", "error");
    subjectSelectEl.focus();
    return;
  }
  if (isCustomSubject && !subject) {
    showToast(toast, "Please enter your custom subject.", "error");
    subjectCustomEl.focus();
    return;
  }
  if (!message) {
    showToast(toast, "Please enter a message.", "error");
    messageEl.focus();
    return;
  }

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
    storage: typeof window !== "undefined" ? window.localStorage : null,
  });

  if (spamCheck.blocked) {
    if (spamCheck.silent) {
      showToast(toast, "Message sent! I'll get back to you soon.", "success");
      resetFormState(form, subjectCustomEl, subjectHiddenEl, messageEl);
    } else {
      showToast(toast, spamCheck.userMessage, "error");
    }
    return;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    showToast(
      toast,
      "You appear to be offline. Please check your connection and try again.",
      "error"
    );
    return;
  }

  // Vite dev server returns 200 OK for POST without processing the Worker endpoint.
  if (import.meta.env.DEV && window.location.port !== "8787") {
    showToast(
      toast,
      "Email not sent: local Vite dev has no /api/contact handler. Deploy to Cloudflare or run `npx wrangler dev`.",
      "error"
    );
    return;
  }

  showToast(toast, "", "");
  setSubmitting(btn, true);

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

    recordSubmissionTime(typeof window !== "undefined" ? window.localStorage : null);
    showToast(toast, "Message sent! I'll get back to you soon.", "success");
    resetFormState(form, subjectCustomEl, subjectHiddenEl, messageEl);
  } catch (err) {
    console.error("Contact form submission error:", err);
    let errorMsg =
      "Email could not be sent. Please try again or reach out via the social links below.";

    if (err.name === "AbortError") {
      errorMsg = "Request timed out. Please check your connection and try again.";
    } else if (err.status === 404 || err.status === 405) {
      errorMsg = `Form endpoint unavailable (HTTP ${err.status}). Please reach out via the social links below.`;
    } else if (err.status >= 500) {
      errorMsg = `Server error (HTTP ${err.status}). Please try again later or reach out via the social links below.`;
    }

    showToast(toast, errorMsg, "error");
    toast.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } finally {
    clearTimeout(timeoutId);
    setSubmitting(btn, false);
  }
}
