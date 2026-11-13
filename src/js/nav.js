function initNav() {
  const nav = document.querySelector(".nav");
  const burger = document.getElementById("burger-menu-toggle");
  const navLinks = document.querySelector(".nav-links");
  const navLinkItems = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("section[id]");

  function setMenuOpen(isOpen) {
    if (!navLinks || !burger) return;
    navLinks.classList.toggle("active", isOpen);
    burger.setAttribute("aria-expanded", String(isOpen));
    burger.innerHTML = isOpen
      ? '<i class="fas fa-xmark"></i>'
      : '<i class="fas fa-bars"></i>';
  }

  if (burger && navLinks) {
    burger.addEventListener("click", () => {
      setMenuOpen(!navLinks.classList.contains("active"));
    });
  }

  navLinkItems.forEach((link) => {
    link.addEventListener("click", () => {
      if (navLinks?.classList.contains("active")) {
        setMenuOpen(false);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navLinks?.classList.contains("active")) {
      setMenuOpen(false);
      burger?.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (
      nav &&
      navLinks?.classList.contains("active") &&
      !nav.contains(event.target)
    ) {
      setMenuOpen(false);
    }
  });

  function highlightNavOnScroll() {
    const scrollY = window.pageYOffset;
    const pageBottom =
      document.documentElement.scrollHeight - window.innerHeight;

    if (scrollY >= pageBottom - 5) {
      navLinkItems.forEach((link) => link.classList.remove("active"));
      const sectionLinks = [...navLinkItems].filter((link) => {
        const href = link.getAttribute("href");
        return href && href.includes("#");
      });
      const lastSectionLink = sectionLinks[sectionLinks.length - 1];
      if (lastSectionLink) lastSectionLink.classList.add("active");
      return;
    }

    let matched = false;
    sections.forEach((section) => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 120;
      const sectionId = section.getAttribute("id");
      const correspondingLink = document.querySelector(
        `.nav-link[href$="#${sectionId}"]`,
      );

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        matched = true;
        navLinkItems.forEach((link) => link.classList.remove("active"));
        if (correspondingLink) correspondingLink.classList.add("active");
      }
    });

    if (!matched) {
      navLinkItems.forEach((link) => link.classList.remove("active"));
    }
  }

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        highlightNavOnScroll();
        ticking = false;
      });
    },
    { passive: true },
  );

  highlightNavOnScroll();
}

window.initNav = initNav;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNav);
} else {
  initNav();
}
