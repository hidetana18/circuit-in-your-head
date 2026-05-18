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
      ".courtyard-pot, .quarrel-mark, .toy-listener, .listen-ring, .toy-pause-mark"
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

    const scene = stage.querySelector(".dyad-scene");
    const listener = stage.querySelector(".toy-listener");

    if (scene) {
      appendOnce(scene, "co-reg-cue one");
      appendOnce(scene, "co-reg-cue two");
      appendOnce(scene, "co-reg-cue three");
    }

    if (listener) {
      appendOnce(listener, "listener-ear left");
      appendOnce(listener, "listener-ear right");
      appendOnce(listener, "listener-body");
      appendOnce(listener, "listener-hand left");
      appendOnce(listener, "listener-hand right");
      appendOnce(listener, "listener-mouth");
    }

    stage.querySelectorAll(".courtyard-pot").forEach((pot) => {
      const label = appendOnce(pot, "pot-initial");
      if (label) label.textContent = pot.classList.contains("nora") ? "N" : "J";
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
