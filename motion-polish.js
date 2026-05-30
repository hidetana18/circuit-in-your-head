(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  root.classList.add("motion-ready");
  if (reduceMotion) root.classList.add("motion-reduced");

  const body = document.body;
  const introStage = document.getElementById("intro-stage");
  const gameStage = document.getElementById("game-stage");
  const gameCharacter = document.getElementById("game-character");
  const dyadStage = document.getElementById("dyad-stage");
  const litStage = document.getElementById("lit-stage");
  const hero = document.querySelector(".hero");

  const introProfile = {
    run: { intensity: 0.32, focus: ["50%", "68%"] },
    trip: { intensity: 0.96, focus: ["58%", "42%"] },
    panic: { intensity: 0.86, focus: ["64%", "46%"] },
    breath: { intensity: 0.42, focus: ["72%", "62%"] },
    think: { intensity: 0.22, focus: ["39%", "38%"] },
    cortex: { intensity: 0.24, focus: ["39%", "38%"] },
    settle: { intensity: 0.16, focus: ["45%", "40%"] },
  };

  const regulationProfile = {
    alarm: { intensity: 0.88, focus: ["45%", "42%"] },
    active: { intensity: 0.58, focus: ["55%", "46%"] },
    settling: { intensity: 0.34, focus: ["58%", "58%"] },
    calm: { intensity: 0.18, focus: ["56%", "58%"] },
  };

  const peterProfile = {
    hyper: 0.98,
    panic: 0.84,
    suppress: 0.94,
    notice: 0.56,
    breathe: 0.32,
    settling: 0.28,
    reframe: 0.38,
    calm: 0.16,
  };

  const dyadProfile = {
    calm: 0.18,
    bump: 0.5,
    "b-reads": 0.62,
    escalate: 0.82,
    peak: 1,
    breath: 0.34,
    settle: 0.16,
  };

  const litProfile = {
    assembly: 0.3,
    prejudice: 0.54,
    proposal: 0.84,
    letter: 0.34,
    update: 0.18,
  };

  function setStageProfile(stage, profile) {
    if (!stage || !profile) return;
    const intensity = Number(profile.intensity) || 0;
    stage.style.setProperty("--motion-intensity", String(intensity));
    stage.style.setProperty("--motion-glow-opacity", String(0.34 + intensity * 0.38));
    stage.style.setProperty("--motion-pulse-opacity", String(0.18 + intensity * 0.3));
    stage.style.setProperty("--motion-layer-scale", String(1.012 + intensity * 0.028));
    stage.style.setProperty("--motion-character-saturate", String(0.98 + intensity * 0.18));
    stage.style.setProperty("--motion-focus-x", profile.focus ? profile.focus[0] : "50%");
    stage.style.setProperty("--motion-focus-y", profile.focus ? profile.focus[1] : "50%");
  }

  function pulse(stage) {
    if (!stage || reduceMotion) return;
    stage.classList.remove("motion-pulse");
    void stage.offsetWidth;
    stage.classList.add("motion-pulse");
    window.setTimeout(() => stage.classList.remove("motion-pulse"), 900);
  }

  function syncIntro() {
    if (!introStage) return;
    const state = body.dataset.introBeat || body.dataset.intro || "run";
    setStageProfile(introStage, introProfile[state] || introProfile.run);
  }

  function syncGame() {
    if (!gameStage) return;
    const regulation = gameStage.dataset.regulation || "alarm";
    const peter = gameCharacter ? gameCharacter.dataset.peter : "";
    const base = regulationProfile[regulation] || regulationProfile.alarm;
    const peterIntensity = peterProfile[peter];
    const intensity = peterIntensity == null
      ? base.intensity
      : Math.max(base.intensity, peterIntensity);
    setStageProfile(gameStage, {
      intensity,
      focus: base.focus,
    });
  }

  function syncDyad() {
    if (!dyadStage) return;
    const phase = dyadStage.dataset.phase || "calm";
    setStageProfile(dyadStage, {
      intensity: dyadProfile[phase] == null ? 0.4 : dyadProfile[phase],
      focus: phase === "peak" ? ["50%", "46%"] : ["50%", "58%"],
    });
  }

  function syncLit() {
    if (!litStage) return;
    const phase = litStage.dataset.phase || "assembly";
    setStageProfile(litStage, {
      intensity: litProfile[phase] == null ? 0.35 : litProfile[phase],
      focus: phase === "proposal" ? ["50%", "38%"] : ["50%", "54%"],
    });
  }

  function observeAttr(node, attrs, onChange, pulseTarget) {
    if (!node) return;
    const observer = new MutationObserver((records) => {
      let changed = false;
      records.forEach((record) => {
        if (attrs.includes(record.attributeName)) changed = true;
      });
      if (!changed) return;
      onChange();
      pulse(pulseTarget || node);
    });
    observer.observe(node, { attributes: true, attributeFilter: attrs });
  }

  syncIntro();
  syncGame();
  syncDyad();
  syncLit();

  observeAttr(body, ["data-intro", "data-intro-beat"], syncIntro, introStage);
  observeAttr(gameStage, ["data-regulation"], syncGame, gameStage);
  observeAttr(gameCharacter, ["data-peter"], syncGame, gameStage);
  observeAttr(dyadStage, ["data-phase"], syncDyad, dyadStage);
  observeAttr(litStage, ["data-phase", "data-speaker"], syncLit, litStage);

  const revealTargets = [
    ...document.querySelectorAll(".part"),
    ...document.querySelectorAll(".intro-stage, .game-stage, .dyad-stage, .lit-stage"),
  ];

  revealTargets.forEach((target) => target.classList.add("motion-observed"));

  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("motion-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });

    revealTargets.forEach((target) => revealObserver.observe(target));
  } else {
    revealTargets.forEach((target) => target.classList.add("motion-visible"));
  }

  if (hero && !reduceMotion) {
    let scheduled = false;
    const updateHeroDrift = () => {
      scheduled = false;
      const rect = hero.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, rect.top / Math.max(1, window.innerHeight)));
      hero.style.setProperty("--hero-drift-y", `${progress * -12}px`);
      hero.style.setProperty("--hero-drift-x", `${progress * -18}px`);
    };

    const requestDrift = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(updateHeroDrift);
    };

    updateHeroDrift();
    window.addEventListener("scroll", requestDrift, { passive: true });
    window.addEventListener("resize", requestDrift);
  }
})();
