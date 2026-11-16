const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.1 },
);

window.observeReveal = (el) => {
  if (!el) return;
  el.classList.add("reveal");
  observer.observe(el);
};

for (const el of document.querySelectorAll(
  ".project-card, .skill-item, .section-title, .experience-item, .background-text",
)) {
  window.observeReveal(el);
}
