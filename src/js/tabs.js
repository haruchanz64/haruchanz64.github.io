const skillTabs = [...document.querySelectorAll("#skills .skill-tab")];
const skillContents = document.querySelectorAll("#skills .tab-content");

function activateSkillTab(tab) {
  const skillId = tab.getAttribute("data-skill");

  skillTabs.forEach((t) => {
    const isActive = t === tab;
    t.classList.toggle("active", isActive);
    t.setAttribute("aria-selected", String(isActive));
  });

  skillContents.forEach((content) => {
    content.classList.toggle("active", content.id === skillId);
  });
}

skillTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateSkillTab(tab));

  tab.addEventListener("keydown", (event) => {
    let nextIndex = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % skillTabs.length;
    else if (event.key === "ArrowLeft")
      nextIndex = (index - 1 + skillTabs.length) % skillTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = skillTabs.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      skillTabs[nextIndex].focus();
      activateSkillTab(skillTabs[nextIndex]);
    }
  });
});