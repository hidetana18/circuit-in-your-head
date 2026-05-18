(function () {
  const stage = document.getElementById("lit-stage");
  if (!stage) return;

  const ballroom = stage.querySelector(".lit-ballroom");
  const speechNodes = [
    document.getElementById("lit-elizabeth-speech"),
    document.getElementById("lit-darcy-speech"),
  ].filter(Boolean);
  const mindNodes = [
    document.getElementById("lit-elizabeth"),
    document.getElementById("lit-darcy"),
  ].filter(Boolean);

  const phaseMeta = {
    assembly: { cue: "distance", update: false },
    prejudice: { cue: "confirming-prior", update: false },
    proposal: { cue: "prediction-error", update: true },
    letter: { cue: "new-evidence", update: true },
    update: { cue: "revised-model", update: true },
  };

  let previousPhase = `${stage.dataset.phase || "assembly"}:${stage.dataset.speaker || "both"}`;
  let pulseTimer = null;

  function addDecorativeElement(parent, className, selector) {
    if (!parent || parent.querySelector(selector)) return;
    const node = document.createElement("span");
    node.className = className;
    node.setAttribute("aria-hidden", "true");
    parent.appendChild(node);
  }

  function addArm(figure, className) {
    if (!figure || figure.querySelector(`.${className.replace(/\s+/g, ".")}`)) return;
    const arm = document.createElement("span");
    arm.className = className;
    arm.setAttribute("aria-hidden", "true");

    const hand = document.createElement("span");
    hand.className = "figure-hand";
    arm.appendChild(hand);
    figure.appendChild(arm);
  }

  function ensureStagePolish() {
    stage.classList.add("lit-polish-ready");

    if (!ballroom) return;
    addDecorativeElement(ballroom, "lit-evidence-trail", ".lit-evidence-trail");
    addDecorativeElement(ballroom, "lit-update-burst", ".lit-update-burst");
    addDecorativeElement(ballroom, "lit-model-spark spark-one", ".spark-one");
    addDecorativeElement(ballroom, "lit-model-spark spark-two", ".spark-two");
    addDecorativeElement(ballroom, "lit-model-spark spark-three", ".spark-three");

    ballroom.querySelectorAll(".regency-figure").forEach((figure) => {
      addArm(figure, "figure-arm arm-left");
      addArm(figure, "figure-arm arm-right");
    });
  }

  function restartClassAnimation(node, className) {
    if (!node) return;
    node.classList.remove(className);
    void node.offsetWidth;
    node.classList.add(className);
  }

  function markPhase(phase) {
    const meta = phaseMeta[phase] || phaseMeta.assembly;
    stage.dataset.polishCue = meta.cue;

    speechNodes.forEach((node) => {
      const isSpeaking = node.dataset.turn !== "listening";
      node.classList.toggle("is-listening", !isSpeaking);
      if (isSpeaking) restartClassAnimation(node, "is-speaking");
      else node.classList.remove("is-speaking");
    });

    mindNodes.forEach((node) => {
      node.classList.toggle("is-updating", meta.update);
      if (meta.update) restartClassAnimation(node, "is-updating");
    });

    window.clearTimeout(pulseTimer);
    pulseTimer = window.setTimeout(() => {
      speechNodes.forEach((node) => node.classList.remove("is-speaking"));
      mindNodes.forEach((node) => node.classList.remove("is-updating"));
    }, 920);
  }

  ensureStagePolish();
  markPhase(previousPhase);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.attributeName !== "data-phase" && record.attributeName !== "data-speaker") continue;
      const phase = stage.dataset.phase || "assembly";
      const speaker = stage.dataset.speaker || "both";
      const phaseKey = `${phase}:${speaker}`;
      if (phaseKey === previousPhase) continue;
      previousPhase = phaseKey;
      markPhase(phase);
    }
  });

  observer.observe(stage, { attributes: true, attributeFilter: ["data-phase", "data-speaker"] });
})();
