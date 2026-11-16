import { onDomReady } from "../core/dom.js";

function initNav() {
  const navLinkItems = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("section[id]");
  const currentSectionLabel = document.querySelector(".nav-current-section");

  function updateCurrentSectionLabel(activeLink) {
    if (!currentSectionLabel) return;
    const label = activeLink ? activeLink.textContent.trim() : "";
    currentSectionLabel.textContent = label;
    currentSectionLabel.classList.toggle("visible", Boolean(label));
  }

  function highlightNavOnScroll() {
    const scrollY = window.pageYOffset;
    const pageBottom = document.documentElement.scrollHeight - window.innerHeight;

    if (scrollY >= pageBottom - 5) {
      for (const link of navLinkItems) {
        link.classList.remove("active");
      }
      const sectionLinks = [...navLinkItems].filter((link) => {
        const href = link.getAttribute("href");
        return href?.includes("#");
      });
      const lastSectionLink = sectionLinks[sectionLinks.length - 1];
      if (lastSectionLink) lastSectionLink.classList.add("active");
      updateCurrentSectionLabel(lastSectionLink);
      return;
    }

    let matchedLink = null;
    sections.forEach((section) => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 120;
      const sectionId = section.getAttribute("id");
      const correspondingLink = document.querySelector(`.nav-link[href$="#${sectionId}"]`);

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        for (const link of navLinkItems) {
          link.classList.remove("active");
        }
        if (correspondingLink) {
          correspondingLink.classList.add("active");
          matchedLink = correspondingLink;
        }
      }
    });

    if (!matchedLink) {
      for (const link of navLinkItems) {
        link.classList.remove("active");
      }
    }
    updateCurrentSectionLabel(matchedLink);
  }

  const nav = document.querySelector(".nav");
  const heroTarget = document.getElementById("hero");

  function setNavVisible(visible) {
    if (!nav) return;
    nav.classList.toggle("nav--hidden", !visible);
    if (visible) {
      nav.inert = false;
    } else {
      if (nav.contains(document.activeElement)) {
        document.activeElement.blur();
      }
      nav.inert = true;
    }
  }

  function updateNavVisibility() {
    if (!heroTarget) {
      setNavVisible(true);
      return;
    }
    const heroRect = heroTarget.getBoundingClientRect();
    const scrolledPastHero =
      window.pageYOffset > 40 && heroRect.bottom <= window.innerHeight * 0.75;
    setNavVisible(scrolledPastHero);
  }

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        highlightNavOnScroll();
        updateNavVisibility();
        ticking = false;
      });
    },
    { passive: true },
  );

  highlightNavOnScroll();
  updateNavVisibility();
}

window.initNav = initNav;

void onDomReady(initNav);
