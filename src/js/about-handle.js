/**
 * Opens the `@haruchanz64` origin modal when clicking "Haru" in About.
 * Uses event delegation on `#about` so locale switches that replace
 * `about.p1Html` never drop the click handler.
 */
function initAboutHandleModal() {
  const aboutSection = document.getElementById("about");
  const modal = document.getElementById("haru-origin-modal");
  if (!aboutSection || !modal) return;

  const closeBtn = modal.querySelector(".haru-modal-close");

  const syncExpandedState = () => {
    const trigger = aboutSection.querySelector(".haru-trigger");
    if (trigger) {
      trigger.setAttribute("aria-expanded", String(!modal.hidden));
    }
  };

  const openModal = () => {
    modal.hidden = false;
    syncExpandedState();
    closeBtn?.focus();
  };

  const closeModal = () => {
    if (modal.hidden) return;
    modal.hidden = true;
    syncExpandedState();
    aboutSection.querySelector(".haru-trigger")?.focus();
  };

  aboutSection.addEventListener("click", (event) => {
    if (event.target.closest(".haru-trigger")) {
      openModal();
    }
  });

  closeBtn?.addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });
}

initAboutHandleModal();
