const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("visible");
    });
  },
  { threshold: 0.1 },
);

window.observeReveal = function (el) {
  if (!el) return;
  el.classList.add("reveal");
  observer.observe(el);
};

document
  .querySelectorAll(".project-card, .skill-item, .section-title, .experience-item")
  .forEach((el) => window.observeReveal(el));