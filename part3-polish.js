(() => {
  "use strict";

  function appendOnce(parent, className, tagName = "span") {
    if (!parent) return null;
    const existing = parent.querySelector(`:scope > .${className.split(" ").join(".")}`);
    if (existing) return existing;

    const el = document.createElement(tagName);
    el.className = className;
    el.setAttribute("aria-hidden", "true");
    parent.appendChild(el);
    return el;
  }

  function setPhaseClass(stage, phase) {
    if (!stage || !phase) return;

    Array.from(stage.classList).forEach((name) => {
      if (name.startsWith("p3-phase-")) stage.classList.remove(name);
    });
    stage.classList.add(`p3-phase-${phase}`);

    stage.querySelectorAll(".phase-pop").forEach((el) => el.classList.remove("phase-pop"));
    const activeBits = stage.querySelectorAll(
      ".block-tower, .quarrel-mark, .dyad-breath-puff"
    );
    activeBits.forEach((el) => {
      void el.offsetWidth;
      el.classList.add("phase-pop");
    });
  }

  function setupDyadPolish() {
    const stage = document.getElementById("dyad-stage");
    if (!stage || stage.dataset.part3PolishReady === "true") return;
    stage.dataset.part3PolishReady = "true";

    // Tag each tower's blocks with a label initial so visitors can see whose
    // tower is whose at a glance (matches the dyad-name above each panel).
    stage.querySelectorAll(".block-tower").forEach((tower) => {
      const label = appendOnce(tower, "tower-initial");
      if (label) label.textContent = tower.classList.contains("nora") ? "N" : "J";
    });

    setPhaseClass(stage, stage.dataset.phase || "calm");

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-phase") {
          setPhaseClass(stage, stage.dataset.phase || "calm");
        }
      });
    });

    observer.observe(stage, { attributes: true, attributeFilter: ["data-phase"] });
  }

  function init() {
    setupDyadPolish();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
