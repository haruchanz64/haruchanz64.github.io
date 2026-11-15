import { readStorageItem, writeStorageItem } from "../core/cache.js";

const SKILL_TAB_STORAGE_KEY = "haru_active_skill_tab";

const skillTabs = [...document.querySelectorAll("#skills .skill-tab")];
const skillContents = document.querySelectorAll("#skills .tab-content");

function activateSkillTab(tab) {
  const skillId = tab.getAttribute("data-skill");
  if (skillId) writeStorageItem(SKILL_TAB_STORAGE_KEY, skillId);

  skillTabs.forEach((t) => {
    const isActive = t === tab;
    t.classList.toggle("active", isActive);
    t.setAttribute("aria-selected", String(isActive));
  });

  skillContents.forEach((content) => {
    content.classList.toggle("active", content.id === skillId);
  });
}

const savedTabId = readStorageItem(SKILL_TAB_STORAGE_KEY);
const initialTab =
  (savedTabId && skillTabs.find((t) => t.getAttribute("data-skill") === savedTabId)) ||
  skillTabs.find((t) => t.classList.contains("active")) ||
  skillTabs[0];

if (initialTab) {
  activateSkillTab(initialTab);
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
