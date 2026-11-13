const isHomePage =
  window.location.pathname === "/" ||
  window.location.pathname.endsWith("/index.html");

document
  .querySelectorAll('a[href^="#"], a[href^="/index.html#"]')
  .forEach((anchor) => {
    const rawHref = anchor.getAttribute("href");
    if (!rawHref || rawHref === "#") return;
    if (rawHref.startsWith("/index.html#") && !isHomePage) return;

    anchor.addEventListener("click", function (event) {
      const targetId = rawHref.split("#")[1];
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
        event.preventDefault();
        targetSection.scrollIntoView({
          behavior: "smooth",
        });

        if (window.location.hash !== `#${targetId}`) {
          window.history.pushState(null, "", `#${targetId}`);
        }
      }
    });
  });