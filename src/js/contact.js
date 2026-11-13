const REQUEST_TIMEOUT_MS = 15000;
const TOAST_AUTO_HIDE_MS = 6000;

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

function initMessageCounter() {
  const messageEl = document.getElementById("message");
  const counterEl = document.getElementById("message-char-count");
  if (!messageEl || !counterEl) return;

  const maxLen = messageEl.getAttribute("maxlength") || "2000";
  const update = () => {
    counterEl.textContent = `${messageEl.value.length} / ${maxLen}`;
  };

  messageEl.addEventListener("input", update);
  update();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMessageCounter);
} else {
  initMessageCounter();
}

/**
 * Handles contact form submission via Netlify Forms AJAX with validation, timeout, and accessible toast feedback.
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
  const subjectEl = document.getElementById("subject");
  const messageEl = document.getElementById("message");

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const subject = subjectEl.value.trim();
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
  if (!subject) {
    showToast(toast, "Please enter a subject.", "error");
    subjectEl.focus();
    return;
  }
  if (!message) {
    showToast(toast, "Please enter a message.", "error");
    messageEl.focus();
    return;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    showToast(
      toast,
      "✕ You appear to be offline. Please check your connection and try again.",
      "error"
    );
    return;
  }

  // Vite dev server returns 200 OK for POST / without processing Netlify Forms.
  if (import.meta.env.DEV && window.location.port !== "8888") {
    showToast(
      toast,
      "✕ Email not sent: local Vite dev has no Netlify Forms handler. Deploy to Netlify or run `netlify dev`.",
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

    const response = await fetch("/", {
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

    showToast(toast, "✓ Message sent! I'll get back to you soon.", "success");
    form.reset();
    const counterEl = document.getElementById("message-char-count");
    if (counterEl) {
      const maxLen = messageEl.getAttribute("maxlength") || "2000";
      counterEl.textContent = `0 / ${maxLen}`;
    }
  } catch (err) {
    console.error("Netlify form submission error:", err);
    let errorMsg =
      "✕ Email could not be sent. Please try again or reach out via the social links below.";

    if (err.name === "AbortError") {
      errorMsg = "✕ Request timed out. Please check your connection and try again.";
    } else if (err.status === 404 || err.status === 405) {
      errorMsg = `✕ Form endpoint unavailable (HTTP ${err.status}). Please reach out via the social links below.`;
    } else if (err.status >= 500) {
      errorMsg = `✕ Server error (HTTP ${err.status}). Please try again later or reach out via the social links below.`;
    }

    showToast(toast, errorMsg, "error");
    toast.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } finally {
    clearTimeout(timeoutId);
    setSubmitting(btn, false);
  }
}
