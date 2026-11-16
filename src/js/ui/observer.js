const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.01, rootMargin: "0px 0px 80px 0px" },
);

function revealImmediately(el) {
  if (!el) return;
  el.classList.add("visible");
  observer.unobserve(el);
}

function revealTargetSection(hash) {
  if (!hash || hash === "#") return;
  const id = hash.startsWith("#") ? hash.slice(1) : hash;
  const target = document.getElementById(id);
  if (!target) return;
  if (target.classList.contains("reveal")) revealImmediately(target);
  for (const el of target.querySelectorAll(".reveal")) {
    revealImmediately(el);
  }
}

window.observeReveal = (el) => {
  if (!el) return;
  el.classList.add("reveal");
  const rect = el.getBoundingClientRect();
  if (rect.top < window.innerHeight + 80 && rect.bottom > 0) {
    el.classList.add("visible");
    return;
  }
  observer.observe(el);
};

for (const el of document.querySelectorAll(
  ".project-card, .skill-item, .section-title, .experience-item, .background-text",
)) {
  window.observeReveal(el);
}

document.addEventListener("click", (e) => {
  const link = e.target.closest?.('a[href^="#"]');
  if (link) revealTargetSection(link.getAttribute("href"));
});

window.addEventListener("hashchange", () => revealTargetSection(location.hash));
if (location.hash) revealTargetSection(location.hash);
