/* =========================================================
   THE CIRCUIT IN YOUR HEAD — interactive layer
   Part 1: auto-play intro animation (4 beats)
   Part 2: tap-in-order regulation game
   ========================================================= */

(function () {
  "use strict";

  function inlinePeterSvg() {
    const svg = document.getElementById("peter-svg");
    const symbol = document.getElementById("peter");
    if (!svg || !symbol || svg.querySelector(".peter-body")) return;

    const use = svg.querySelector("use");
    if (use) use.remove();
    Array.from(symbol.children).forEach((child) => {
      svg.appendChild(child.cloneNode(true));
    });
  }
  inlinePeterSvg();

  /* ====================== SOUND SYSTEM ======================
     Web Audio API, fully synthesized — no audio files, no extra weight.
     Default ON. Click the speaker icon to mute. State persists in
     localStorage. Audio context must be created after a user gesture.
     ============================================================= */

  let audioCtx = null;
  /* Default ON, while localStorage remembers a visitor who explicitly mutes
     sound during a session. */
  const SOUND_PREF_KEY = "three-sound-v2";
  let soundOn = true;
  try {
    const stored = localStorage.getItem(SOUND_PREF_KEY);
    if (stored !== null) soundOn = (stored === "on");
  } catch (e) { /* private mode etc. */ }

  function ensureAudio() {
    if (audioCtx) return audioCtx;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      return null;
    }
    return audioCtx;
  }
  function resumeAudio() {
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  }

  /* Browser autoplay policy: an AudioContext can be CREATED at any time but
     starts suspended until the first user gesture. We create it eagerly so
     sound calls don't no-op silently, then keep listeners attached for every
     interaction (idempotent — only does work if currently suspended). */
  ensureAudio();
  ["click", "touchstart", "keydown", "pointerdown"].forEach((evt) => {
    document.addEventListener(evt, resumeAudio, { capture: true });
  });

  /* Helpers — short envelopes, ducked under the page audio. */
  function tone(freq, dur, opts) {
    if (!soundOn) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    /* Defensive: if suspended, try to resume — only succeeds if we're inside
       a user gesture, but harmless otherwise. */
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    opts = opts || {};
    const vol = opts.vol != null ? opts.vol : 0.10;
    const type = opts.type || "sine";
    const attack = opts.attack != null ? opts.attack : 0.01;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    if (opts.sweepTo) {
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.sweepTo), now + dur);
    } else {
      osc.frequency.value = freq;
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  /* Filtered noise burst for whoosh — generates short white noise
     and bandpass-filters it for a "swoop" feel. */
  function whoosh(centerFreq, dur, vol) {
    if (!soundOn) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const len = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 3;
    filter.frequency.setValueAtTime(centerFreq * 0.7, now);
    filter.frequency.exponentialRampToValueAtTime(centerFreq * 1.6, now + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol || 0.05, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + dur + 0.05);
  }

  /* Sound bank — each named effect maps to a Web Audio call. */
  const sounds = {
    trip()    { tone(110, 0.22, { vol: 0.15, type: "sawtooth", sweepTo: 60 }); },
    limbic()  { tone(880, 0.10, { vol: 0.10, type: "square" }); tone(660, 0.10, { vol: 0.06, type: "square" }); },
    /* Trip + limbic firing happen in immediate succession (~150 ms apart) */
    tripLimbic() {
      this.trip();
      setTimeout(() => this.limbic(), 180);
    },
    stem()    { tone(220, 0.20, { vol: 0.08, type: "triangle" }); },
    arrow()   { whoosh(700, 0.30, 0.05); },
    heart()   { tone(70, 0.08, { vol: 0.15, type: "sine" }); setTimeout(() => tone(60, 0.07, { vol: 0.08, type: "sine" }), 100); },
    heartPound() {
      [0, 300, 610].forEach((delay) => {
        setTimeout(() => {
          tone(74, 0.09, { vol: 0.16, type: "sine" });
          setTimeout(() => tone(58, 0.08, { vol: 0.10, type: "sine" }), 92);
        }, delay);
      });
    },
    deepBreath() {
      whoosh(260, 0.55, 0.035);
      tone(165, 0.60, { vol: 0.035, type: "triangle", sweepTo: 105 });
      setTimeout(() => {
        whoosh(170, 0.70, 0.028);
        tone(115, 0.58, { vol: 0.025, type: "sine", sweepTo: 76 });
      }, 470);
    },
    cortex()  {
      // soft rising arpeggio C5 E5 G5
      tone(523, 0.18, { vol: 0.06, type: "sine" });
      setTimeout(() => tone(659, 0.18, { vol: 0.06, type: "sine" }), 90);
      setTimeout(() => tone(784, 0.32, { vol: 0.06, type: "sine" }), 180);
    },
    tap()     { tone(800, 0.05, { vol: 0.05, type: "sine" }); },
    wrong()   { tone(200, 0.15, { vol: 0.08, type: "square", sweepTo: 110 }); },
    win()     {
      tone(523, 0.18, { vol: 0.10, type: "sine" });
      setTimeout(() => tone(659, 0.18, { vol: 0.10, type: "sine" }), 100);
      setTimeout(() => tone(784, 0.18, { vol: 0.10, type: "sine" }), 200);
      setTimeout(() => tone(1047, 0.40, { vol: 0.10, type: "sine" }), 300);
    },
  };

  /* Sound toggle button */
  const soundBtn = document.getElementById("sound-toggle");
  const soundIcon = document.getElementById("sound-icon");
  function refreshSoundBtn() {
    if (!soundBtn) return;
    soundBtn.setAttribute("aria-pressed", String(soundOn));
    if (soundIcon) soundIcon.textContent = soundOn ? "🔊" : "🔇";
  }
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      soundOn = !soundOn;
      if (soundOn) {
        /* The click itself is a user gesture — both create and resume
           are allowed here. */
        ensureAudio();
        resumeAudio();
      }
      try { localStorage.setItem(SOUND_PREF_KEY, soundOn ? "on" : "off"); } catch (e) {}
      refreshSoundBtn();
      if (soundOn) sounds.tap(); // confirm with a quick tap sound
    });
  }
  refreshSoundBtn();


  /* ====================== WEBCAM PPG HEART RATE ======================
     Opt-in. When enabled, samples the green channel of a centered ROI of
     the visitor's face video, detrends, finds peaks, and reports BPM.
     Sends nothing over the network — runs entirely in the browser.
     Accuracy depends on lighting; we show a "lock confidence" hint. */

  const camToggle  = document.getElementById("camera-toggle");
  const camPreview = document.getElementById("camera-preview");
  const camVideo   = document.getElementById("camera-video");
  const camClose   = document.getElementById("camera-close");
  const camBpmEl   = document.getElementById("camera-bpm");
  const camHintEl  = document.getElementById("camera-hint");

  const camera = {
    active: false,
    stream: null,
    rafId: null,
    canvas: null,
    ctx: null,
    samples: [],      // {t, g} pairs
    bpmHistory: [],   // recent BPM estimates for smoothing
    lastBpm: null,
    lastUpdate: 0,

    async start() {
      if (this.active) return;
      try {
        camPreview.classList.remove("error");
        camPreview.setAttribute("aria-hidden", "false");
        if (camHintEl) camHintEl.textContent = "Camera stays on this device. Asking permission...";
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });
      } catch (e) {
        camHintEl.textContent = "Camera permission denied or unavailable.";
        camPreview.classList.add("error");
        camPreview.setAttribute("aria-hidden", "false");
        return;
      }
      camVideo.srcObject = this.stream;
      await camVideo.play();
      this.canvas = document.createElement("canvas");
      this.canvas.width = 80;
      this.canvas.height = 80;
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
      this.samples = [];
      this.bpmHistory = [];
      this.lastBpm = null;
      this.active = true;
      camPreview.classList.remove("error");
      camPreview.setAttribute("aria-hidden", "false");
      camPreview.classList.add("active");
      if (camHintEl) camHintEl.textContent = "Reading…";
      if (camBpmEl) camBpmEl.textContent = "--";
      if (camToggle) {
        camToggle.classList.add("on");
        camToggle.setAttribute("aria-pressed", "true");
      }
      this.loop();
    },

    stop() {
      if (!this.active) return;
      this.active = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = null;
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }
      camPreview.setAttribute("aria-hidden", "true");
      camPreview.classList.remove("active", "error");
      if (camToggle) {
        camToggle.classList.remove("on");
        camToggle.setAttribute("aria-pressed", "false");
      }
      // restore heart rate to beat-driven value
      camera.lastBpm = null;
      goTo(beatIdx); // re-apply current beat → resets bpm displays
    },

    loop() {
      if (!this.active) return;
      this.rafId = requestAnimationFrame(() => this.loop());

      const vw = camVideo.videoWidth, vh = camVideo.videoHeight;
      if (!vw || !vh) return;

      // Sample center 80x80 region (forehead-ish if visitor is centered)
      const sx = (vw - 80) / 2;
      const sy = (vh - 100) / 2; // shift up slightly
      this.ctx.drawImage(camVideo, sx, sy, 80, 80, 0, 0, 80, 80);
      const data = this.ctx.getImageData(0, 0, 80, 80).data;
      let g = 0;
      for (let i = 0; i < data.length; i += 4) g += data[i + 1];
      g /= data.length / 4;

      const now = performance.now();
      this.samples.push({ t: now, g: g });
      // keep last 8 seconds
      const cutoff = now - 8000;
      while (this.samples.length && this.samples[0].t < cutoff) this.samples.shift();

      // update every ~500 ms once we have enough data
      if (now - this.lastUpdate > 500 && this.samples.length > 90) {
        this.lastUpdate = now;
        const bpm = this.estimateBpm();
        if (bpm) {
          this.bpmHistory.push(bpm);
          if (this.bpmHistory.length > 5) this.bpmHistory.shift();
          // median of recent estimates for stability
          const sorted = [...this.bpmHistory].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          this.lastBpm = median;
          if (camBpmEl) camBpmEl.textContent = median;
          if (camHintEl) camHintEl.textContent = this.bpmHistory.length >= 3 ? "Locked ✓" : "Reading…";
          // also push to the wiring SVG so it reflects visitor's real rate
          if (wBpm) wBpm.textContent = median;
        } else {
          if (camHintEl) camHintEl.textContent = "Hold still, more light helps";
        }
      }
    },

    estimateBpm() {
      const n = this.samples.length;
      if (n < 60) return null;
      // detrend with moving average
      const W = 30;
      const dt = [];
      for (let i = 0; i < n; i++) {
        let acc = 0, cnt = 0;
        for (let j = Math.max(0, i - W); j <= Math.min(n - 1, i + W); j++) { acc += this.samples[j].g; cnt++; }
        dt.push(this.samples[i].g - acc / cnt);
      }
      // peak detection — local maxima above a small threshold
      let std = 0;
      for (const v of dt) std += v * v;
      std = Math.sqrt(std / n);
      const thresh = std * 0.6;
      const peaks = [];
      for (let i = 3; i < n - 3; i++) {
        if (dt[i] > thresh
            && dt[i] >= dt[i - 1] && dt[i] >= dt[i + 1]
            && dt[i] >= dt[i - 2] && dt[i] >= dt[i + 2]) {
          // enforce minimum spacing (300 ms = 200 BPM cap)
          const t = this.samples[i].t;
          if (!peaks.length || t - peaks[peaks.length - 1] > 300) peaks.push(t);
        }
      }
      if (peaks.length < 3) return null;
      // average interval, drop outliers
      const intervals = [];
      for (let i = 1; i < peaks.length; i++) intervals.push(peaks[i] - peaks[i - 1]);
      intervals.sort((a, b) => a - b);
      const trimmed = intervals.slice(1, -1).length ? intervals.slice(1, -1) : intervals;
      const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
      const bpm = 60000 / avg;
      if (bpm < 45 || bpm > 180) return null;
      return Math.round(bpm);
    },
  };

  if (camToggle) {
    camToggle.addEventListener("click", () => {
      if (camera.active) camera.stop();
      else camera.start();
      if (sounds.tap) sounds.tap();
    });
  }
  if (camClose) {
    camClose.addEventListener("click", () => camera.stop());
  }


  /* ====================== PART 1: INTRO ANIMATION ======================
     Six beats. Each one names ONE thing that just lit up, with a visible
     number badge + an arrow connecting it to whatever came before it.
     The cortex beat takes deliberately longer to emphasize that the
     "thinking" part is the slowest. */

  const body = document.body;

  /**
   * beats:
   *   kid       — pose of kid figure ("run" | "trip" | "think")
   *   layers    — { cortex / limbic / brainstem -> "active" | "hot" | "dim" | "current" }
   *   badges    — which numeric badges (1..4) are visible
   *   arrows    — which arrow paths are visible (data-arrow values)
   *   organs    — { heart / lungs -> class ("" | "fast" | "calm") }
   *   bpm, brpm — body readouts
   *   caption   — caption shown below
   *   hold      — ms to wait before auto-advancing to the next beat
   */
  const beats = [
    {
      name: "run", kid: "run",
      layers: { cortex: "active", limbic: "active", brainstem: "active" },
      badges: [], arrows: [],
      organs: { heart: "", lungs: "" },
      bpm: 90, brpm: 16,
      caption: "A calm circuit: body, alarm, and cortex all online.",
      thought: null,
      hold: 1800,
    },
    {
      // Trip and limbic firing happen at essentially the same moment
      // (amygdala responds in ~12 ms). Merged into one beat.
      name: "trip", kid: "trip",
      layers: { cortex: "dim", limbic: "current", brainstem: "dim" },
      badges: [1], arrows: [],
      organs: { heart: "", lungs: "" },
      bpm: 100, brpm: 19,
      caption: "1. Trip. Limbic fires before cortex can explain.",
      thought: null,
      hold: 1500,
    },
    {
      name: "panic", kid: "trip",
      layers: { cortex: "dim", limbic: "hot", brainstem: "hot" },
      badges: [1, 2, 3], arrows: ["limbic-stem", "stem-heart", "stem-lungs"],
      organs: { heart: "fast", lungs: "fast" },
      bpm: 170, brpm: 34,
      caption: "2 -> 3. Brain stem drives the body: heart and breathing race. Cortex has little room to check.",
      thought: "PANIC!",
      hold: 2100,
    },
    {
      name: "breath", kid: "trip",
      layers: { cortex: "dim", limbic: "hot", brainstem: "current" },
      badges: [1, 2, 3], arrows: ["limbic-stem", "stem-heart", "stem-lungs"],
      organs: { heart: "fast", lungs: "calm" },
      bpm: 138, brpm: 18,
      caption: "3 changes first: slower breathing gives the circuit different body data.",
      thought: "Breathe.",
      hold: 1800,
    },
    {
      name: "cortex", kid: "think",
      layers: { cortex: "current", limbic: "active", brainstem: "active" },
      badges: [1, 2, 3, 4],
      arrows: ["limbic-stem", "stem-heart", "stem-lungs", "stem-cortex"],
      organs: { heart: "calm", lungs: "calm" },
      bpm: 96, brpm: 16,
      caption: "4. Cortex returns to the loop: I tripped, but I am safe enough to check.",
      thought: "I tripped. I am safe.",
      hold: 1700,
    },
    {
      name: "settle", kid: "think",
      layers: { cortex: "active", limbic: "active", brainstem: "active" },
      badges: [1, 2, 3, 4],
      arrows: ["limbic-stem", "stem-heart", "stem-lungs", "stem-cortex"],
      organs: { heart: "calm", lungs: "calm" },
      bpm: 78, brpm: 14,
      caption: "Same event, different circuit: alarm becomes information, not panic.",
      thought: "I can choose my next move.",
      hold: 0,  // last beat, no auto-advance
    },
  ];

  const captionEl = document.getElementById("intro-caption");
  const stepEl    = document.getElementById("intro-step");
  const totalEl   = document.getElementById("intro-total");
  const prevBtn   = document.getElementById("intro-prev");
  const nextBtn   = document.getElementById("intro-next");
  const playBtn   = document.getElementById("intro-play");
  const replayBtn = document.getElementById("intro-replay");
  const wiringSvg = document.getElementById("wiring");
  const wHeart    = document.getElementById("wiring-heart");
  const wLungs    = document.getElementById("wiring-lungs");
  const wBpm      = document.getElementById("w-bpm");
  const wBrpm     = document.getElementById("w-brpm");
  const thoughtEl = document.getElementById("kid-thought");
  const thoughtTextEl = thoughtEl ? thoughtEl.querySelector(".thought-text") : null;
  const kidWrapEl = document.getElementById("kid-wrap");

  let beatIdx     = 0;
  let autoTimer   = null;
  let autoRunId   = 0;
  let isPlaying   = false;
  let introPlayed = false;

  if (totalEl) totalEl.textContent = beats.length;

  function restartAnimation(el) {
    if (!el) return;
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
  }

  function animateNumber(textNode, from, to, dur) {
    if (!textNode) return;
    if (isNaN(from)) { textNode.textContent = to; return; }
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const v = Math.round(from + (to - from) * t);
      textNode.textContent = v;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function applyBeat(idx) {
    const b = beats[idx];
    if (!b) return;

    // kid pose + finer beat name for facial expression polish
    body.dataset.intro = b.kid;
    body.dataset.introBeat = b.name;
    if (b.name === "run") restartAnimation(kidWrapEl);

    // brain layers
    if (wiringSvg) {
      wiringSvg.querySelectorAll(".brain-layer").forEach((g) => {
        const r = g.dataset.region;
        g.classList.remove("active", "hot", "dim", "current");
        if (b.layers[r]) g.classList.add(b.layers[r]);
      });
    }

    // arrows
    if (wiringSvg) {
      wiringSvg.querySelectorAll(".wiring-arrows .arrow").forEach((p) => {
        p.classList.toggle("shown", b.arrows.includes(p.dataset.arrow));
      });
    }

    // badges
    if (wiringSvg) {
      wiringSvg.querySelectorAll(".wiring-badges .step-badge").forEach((g) => {
        const n = parseInt(g.dataset.step, 10);
        g.classList.toggle("shown", b.badges.includes(n));
        // mark the latest (newest) badge as "current"
        const isCurrent = b.badges.length > 0 && n === Math.max.apply(null, b.badges);
        g.classList.toggle("current", isCurrent);
      });
    }

    // organs
    if (wHeart) wHeart.className.baseVal = "body-organ " + (b.organs.heart || "");
    if (wLungs) wLungs.className.baseVal = "body-organ " + (b.organs.lungs || "");

    // numbers — webcam, if active, overrides the heart rate
    if (wBpm) {
      const target = (camera.active && camera.lastBpm) ? camera.lastBpm : b.bpm;
      animateNumber(wBpm, parseInt(wBpm.textContent, 10), target, 600);
    }
    if (wBrpm) animateNumber(wBrpm, parseInt(wBrpm.textContent, 10), b.brpm, 600);

    // caption
    if (captionEl) {
      captionEl.classList.add("fade");
      setTimeout(() => {
        captionEl.textContent = b.caption;
        captionEl.classList.remove("fade");
      }, 200);
    }

    // thought bubble (only shown when the beat has a thought)
    if (thoughtEl) {
      if (b.thought) {
        if (thoughtTextEl) thoughtTextEl.textContent = b.thought;
        thoughtEl.classList.add("shown");
        thoughtEl.setAttribute("aria-hidden", "false");
      } else {
        thoughtEl.classList.remove("shown");
        thoughtEl.setAttribute("aria-hidden", "true");
      }
    }

    // step indicator
    if (stepEl) stepEl.textContent = idx + 1;

    // sound effect per beat
    const soundMap = {
      run: null,
      trip: "tripLimbic",   // merged: thud, then alarm
      panic: "heart",
      breath: "stem",
      cortex: "cortex",
      settle: "cortex",
    };
    const sName = soundMap[b.name];
    if (sName && sounds[sName]) sounds[sName]();
    // any new arrow this beat gets a whoosh (capped)
    if (b.arrows && b.arrows.length > 0) {
      const prevArrows = idx > 0 ? (beats[idx - 1].arrows || []) : [];
      const newArrows = b.arrows.filter(a => !prevArrows.includes(a));
      if (newArrows.length > 0 && sounds.arrow) {
        setTimeout(() => sounds.arrow(), 80);
      }
    }

    // button states
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.disabled = idx === beats.length - 1;
  }

  function goTo(i, opts) {
    opts = opts || {};
    const runId = opts.autoplay ? opts.runId : ++autoRunId;
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    beatIdx = Math.max(0, Math.min(beats.length - 1, i));
    applyBeat(beatIdx);
    if (opts.autoplay && beatIdx < beats.length - 1) {
      const hold = beats[beatIdx].hold;
      if (hold > 0) {
        autoTimer = setTimeout(() => {
          if (runId !== autoRunId) return;
          goTo(beatIdx + 1, { autoplay: true, runId });
        }, hold);
      } else {
        setPlaying(false);
      }
    }
    if (beatIdx === beats.length - 1) setPlaying(false);
  }

  function setPlaying(v) {
    isPlaying = v;
    if (playBtn) playBtn.textContent = v ? "⏸ Pause" : (beatIdx >= beats.length - 1 ? "↺ Replay" : "▶ Auto-play");
    if (!v) {
      autoRunId++;
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    }
  }

  function startAutoplay() {
    const runId = ++autoRunId;
    if (beatIdx >= beats.length - 1) {
      goTo(0, { autoplay: true, runId });
    } else {
      goTo(beatIdx, { autoplay: true, runId });
    }
    setPlaying(true);
  }

  if (prevBtn) prevBtn.addEventListener("click", () => { setPlaying(false); goTo(beatIdx - 1); });
  if (nextBtn) nextBtn.addEventListener("click", () => { setPlaying(false); goTo(beatIdx + 1); });
  if (playBtn) playBtn.addEventListener("click", () => isPlaying ? setPlaying(false) : startAutoplay());
  if (replayBtn) replayBtn.addEventListener("click", () => { setPlaying(false); goTo(0); });

  document.addEventListener("keydown", (e) => {
    const part1 = document.getElementById("part-1");
    if (!part1) return;
    const rect = part1.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    if (e.key === "ArrowRight") { e.preventDefault(); setPlaying(false); goTo(beatIdx + 1); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); setPlaying(false); goTo(beatIdx - 1); }
  });

  // initial state
  goTo(0);

  // autoplay once on first scroll into view
  if ("IntersectionObserver" in window) {
    const part1 = document.getElementById("part-1");
    const autoplayTarget = document.getElementById("intro-stage") || part1;
    if (autoplayTarget) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !introPlayed) {
            introPlayed = true;
            startAutoplay();
            io.disconnect();
          }
        });
      }, { threshold: 0.35 });
      io.observe(autoplayTarget);
    }
  }


  /* ====================== PART 2: PETER RABBIT GAME ======================
     Simulation, not a quiz. Each card is an intervention on the same circuit
     the player just learned in Part 1. Multiple orderings can calm Peter —
     this is regulation, not a single correct sequence:
       • Notice wakes the cortex and makes breath more efficient — but isn't
         required for the body to settle.
       • Breath always cools the body. After enough breath the body alone can
         be calm enough to win, even without explicit naming.
       • Reframe needs a quiet enough alarm to land — otherwise it bounces.
         Land it after the body is already settled and it deepens the calm.
       • Suppress always backfires: the alarm gets louder, the cortex dims.
     Three picks per attempt; unlimited retries; no failure state — Peter
     just stays panicked until a working combination is found. */

  const PETER_LABELS = {
    notice:   "Notice",
    breathe:  "Breathe",
    reframe:  "Reframe",
    suppress: "Push down",
  };
  const PETER_EMOJI = {
    notice: "👂", breathe: "🌬️", reframe: "💭", suppress: "🙈",
  };

  function freshPeterState() {
    return {
      hr: 180,             // heart rate (bpm)
      brpm: 35,            // breath rate (per min)
      hasNoticed: false,   // first notice wakes cortex; later ones just nudge
      breatheCount: 0,     // count for caption variation
      cortex: "dim",       // dim → active
      limbic: "hot",       // hot → active → calm (the alarm)
      brainstem: "hot",    // hot → active → calm
      picks: [],           // history of card IDs in this attempt
    };
  }

  const peterGame = {
    state: null,
    pickInProgress: false,
    ended: false,
    attempts: 0,      // number of failed 3-pick attempts (drives hint sharpness)

    init() {
      this.state = freshPeterState();
      this.pickInProgress = false;
      this.ended = false;
      this.attempts = 0;
      this.clearSlots();
      this.applyStateToDom(true);
      this.setCaption("Peter's alarm is loud. His body is racing. Pick an action.", "");
      this.unlockCards();
      this.hideRetry();
      this.hideWin();
      this.setPeterState("panic");
      this.hidePeterThought();
    },

    /* ---------- Card effects: state mutation + animation directives ----- */
    applyCard(cardId) {
      const s = this.state;
      const wasPanicked = s.hr > 140;   // raised from 130 — reframe is a bit
                                        // more forgiving so Breathe-first
                                        // paths can land reframe without
                                        // a preceding Notice.

      if (cardId === "notice") {
        if (!s.hasNoticed) {
          s.hasNoticed = true;
          s.cortex = "active";
          if (s.limbic === "hot") s.limbic = "active";
          s.hr   = clamp(s.hr   - 15, 55, 220);
          s.brpm = clamp(s.brpm - 4,  10, 50);
          return {
            arrow: "attn",
            caption: "Cortex wakes up. Peter notices his heart pounding.",
            peter: "notice",
          };
        }
        s.hr = clamp(s.hr - 3, 55, 220);
        return {
          arrow: "attn",
          caption: "Peter already feels it. Noticing alone won't slow him further.",
          peter: "notice",
        };
      }

      if (cardId === "breathe") {
        s.breatheCount++;
        const noticed = s.hasNoticed;
        // Breathing alone works — slower, but real. Naming first makes
        // each breath a bit more efficient.
        const hrDrop  = noticed ? 38 : 28;
        const brDrop  = noticed ? 8  : 6;
        s.hr   = clamp(s.hr   - hrDrop, 55, 220);
        s.brpm = clamp(s.brpm - brDrop, 10, 50);
        s.brainstem = "active";
        if (s.hr < 140 && s.limbic === "hot")    s.limbic = "active";
        if (s.hr < 100 && s.limbic === "active") s.limbic = "calm";
        let cap;
        if (noticed) {
          cap = s.breatheCount === 1
            ? "Long exhale. Vagus nerve says: safe. Heart slows."
            : "Another breath. Body settles further.";
        } else {
          cap = s.breatheCount >= 2
            ? "Slow breaths build on each other. Body keeps settling."
            : "Peter breathes slowly. His body starts to settle.";
        }
        return {
          arrow: "breath",
          caption: cap,
          peter: "breathe",
          showPuff: true,
        };
      }

      if (cardId === "reframe") {
        if (wasPanicked) {
          // Cortex can't reach a hot limbic — the thought bounces.
          s.hr = clamp(s.hr + 6, 55, 220);
          return {
            arrow: "attn-bounced",
            caption: "Cortex tries to think — but the alarm is too loud. Peter can't reach it yet.",
            peter: "panic",
            isError: true,
          };
        }
        // Lands stronger if cortex is already online (Notice came first, or
        // an earlier Reframe). Lands cold but smaller if not.
        const wasCortexActive = s.cortex === "active";
        s.cortex = "active";
        if (s.limbic === "active") s.limbic = "calm";
        const drop = wasCortexActive ? 35 : 25;
        s.hr   = clamp(s.hr   - drop, 55, 220);
        s.brpm = clamp(s.brpm - 3,    10, 50);
        return {
          arrow: "attn",
          caption: "Cortex online. \"I am hidden right now.\" Limbic settles.",
          peter: "reframe",
          showThought: true,
        };
      }

      if (cardId === "suppress") {
        s.hr   = clamp(s.hr   + 12, 55, 220);
        s.brpm = clamp(s.brpm + 4,  10, 50);
        s.limbic = "hot";
        s.cortex = "dim";
        return {
          arrow: "block",
          caption: "The alarm doesn't quiet. Pushing it down only makes it louder.",
          peter: "suppress",
          isError: true,
          amplifyAlarm: true,
        };
      }
      return { arrow: null, caption: "", peter: "panic" };
    },

    /* ---------- Click handler: choreograph the per-pick animation ------ */
    onCardClick(cardId, cardEl) {
      if (this.ended || this.pickInProgress) return;
      if (!this.state) return;
      this.pickInProgress = true;
      this.lockCards();
      cardEl.classList.add("pressed");
      setTimeout(() => cardEl.classList.remove("pressed"), 450);
      if (sounds.tap) sounds.tap();

      const slot   = this.state.picks.length;
      this.state.picks.push(cardId);
      const effect = this.applyCard(cardId);
      this.playPeterSound(cardId, effect);

      // T+0: character and circuit feedback; brain-region glow carries the action.
      if (effect.amplifyAlarm) this.amplifyAlarmArrows();
      if (effect.showPuff)     this.showBreathPuff();
      if (effect.showThought)  this.showPeterThought();
      this.setPeterState(effect.peter);

      // T+200ms: brain layers, body organs and numbers re-render in sync
      setTimeout(() => {
        this.applyStateToDom(false);
        this.setCaption(effect.caption, effect.isError ? "warn" : "");
      }, 200);

      // T+600ms: fill the next slot
      setTimeout(() => this.fillSlot(slot, cardId), 600);

      // T+1700ms: action animation done — settle Peter to a resting state
      // matching his new HR, then either unlock cards or evaluate.
      setTimeout(() => {
        if (this.state.picks.length < 3) {
          this.setPeterState(this.peterRestState());
          this.pickInProgress = false;
          this.unlockCards();
        } else {
          this.pickInProgress = false;
          this.evaluate();
        }
      }, 1700);
    },

    playPeterSound(cardId, effect) {
      if (cardId === "breathe") {
        if (sounds.deepBreath) sounds.deepBreath();
        setTimeout(() => { if (sounds.heart) sounds.heart(); }, 820);
        return;
      }
      if (cardId === "notice") {
        if (sounds.heartPound) sounds.heartPound();
        setTimeout(() => { if (sounds.cortex) sounds.cortex(); }, 520);
        return;
      }
      if (cardId === "suppress") {
        if (sounds.wrong) sounds.wrong();
        setTimeout(() => { if (sounds.heartPound) sounds.heartPound(); }, 120);
        return;
      }
      if (effect && effect.isError) {
        if (sounds.wrong) sounds.wrong();
        setTimeout(() => { if (sounds.heartPound) sounds.heartPound(); }, 140);
        return;
      }
      if (cardId === "reframe" && sounds.cortex) sounds.cortex();
    },

    /* ---------- Win / retry evaluation after the 3rd pick ---------------
       Two ways to win, so multiple paths can succeed:
         (a) Very calm body alone (HR ≤ 100), OR
         (b) Moderately calm body PLUS cortex online (HR ≤ 120 + active).
       Either passes — regulation isn't a single sequence. */
    evaluate() {
      const s = this.state;
      const calmed = s.hr <= 100 || (s.hr <= 120 && s.cortex === "active");
      if (calmed) {
        this.ended = true;
        this.setPeterState("calm");
        this.applyRegulationState();
        this.pulseLearningCircuit();
        this.setCaption("Peter's body settles. The circuit has a new safe experience.", "success");
        setTimeout(() => this.showWin(), 900);
        return;
      }
      // Not calm — soft escalation. No "Peter gets caught"; just a hint.
      this.attempts++;
      this.setPeterState(this.peterRestState());
      const hint = this.hintForFailure();
      this.setCaption(hint, "warn");
      this.showRetry();
      this.lockCards();   // force the user to hit "Try again" — sharper teaching
    },

    hintForFailure() {
      const s = this.state;
      if (s.picks.includes("suppress")) {
        return this.attempts >= 2
          ? "Pushing it down always backfires. Try a mix of Notice and Breathe."
          : "Pushing it down only makes the alarm louder. Try a different mix.";
      }
      if (s.picks[0] === "reframe") {
        return "Reframing came too soon — the body wasn't ready. Settle the body first.";
      }
      if (s.hr > 130) {
        return this.attempts >= 2
          ? "Peter's body is still racing. More breath helps it settle."
          : "Peter's body is still racing. Try more breath in the mix.";
      }
      if (s.cortex === "dim") {
        return "Body's settling, but Peter's mind isn't on it yet. Try Notice or Reframe.";
      }
      return "Almost there. Try a different mix to fully settle him.";
    },

    peterRestState() {
      const hr = this.state.hr;
      if (hr >= 170) return "hyper";
      if (hr >= 130) return "panic";
      if (hr <= 95 && this.state.cortex === "active") return "calm";
      return "settling"; // intermediate: still alert, but body is coming down
    },

    regulationState() {
      const s = this.state;
      if (!s) return "alarm";
      if (s.picks.includes("suppress") || s.hr >= 165 || s.limbic === "hot") return "alarm";
      if (s.hr >= 130) return "active";
      if (s.hr <= 100 && s.cortex === "active" && s.limbic === "calm") return "calm";
      return "settling";
    },

    applyRegulationState() {
      const stage = document.getElementById("game-stage");
      if (stage) stage.dataset.regulation = this.regulationState();
    },

    /* ---------- DOM application: state → visual ------------------------- */
    applyStateToDom(initial) {
      const s = this.state;
      // Brain layers
      const brain = document.querySelector("#game-wiring .wiring-brain");
      if (brain) {
        brain.querySelectorAll(".brain-layer").forEach((g) => {
          const r = g.dataset.region;
          g.classList.remove("active", "hot", "dim", "current");
          if (s[r]) g.classList.add(s[r]);
        });
      }
      // Body organs — pulse class derived from current rates
      const heart = document.getElementById("game-wiring-heart");
      const lungs = document.getElementById("game-wiring-lungs");
      const heartClass = s.hr   >= 150 ? "racing" : s.hr   >= 110 ? "fast" : "calm";
      const lungsClass = s.brpm >= 28  ? "racing" : s.brpm >= 20  ? "fast" : "calm";
      if (heart) heart.setAttribute("class", "body-organ " + heartClass);
      if (lungs) lungs.setAttribute("class", "body-organ " + lungsClass);
      // Numbers
      const bpmEl  = document.getElementById("g-bpm");
      const brpmEl = document.getElementById("g-brpm");
      const dur    = initial ? 0 : 700;
      if (bpmEl)  animateNumber(bpmEl,  parseInt(bpmEl.textContent, 10),  s.hr,   dur);
      if (brpmEl) animateNumber(brpmEl, parseInt(brpmEl.textContent, 10), s.brpm, dur);
      // Alarm arrows: visibility tracks limbic state
      const alarms = document.querySelectorAll("#game-wiring .alarm-arrows .arrow");
      alarms.forEach(a => {
        a.classList.remove("dim", "faded", "amplified");
        if (s.limbic === "hot")    { a.classList.add("shown"); }
        else if (s.limbic === "active") { a.classList.add("shown"); a.classList.add("dim"); }
        else                       { a.classList.remove("shown"); a.classList.add("faded"); }
      });
      this.applyRegulationState();
    },

    amplifyAlarmArrows() {
      const alarms = document.querySelectorAll("#game-wiring .alarm-arrows .arrow");
      alarms.forEach(a => {
        a.classList.remove("dim", "faded");
        a.classList.add("shown");
      });
    },

    showBreathPuff() {
      const puff = document.getElementById("breath-puff");
      if (!puff) return;
      puff.classList.remove("shown");
      // force a reflow so re-adding the class restarts the animation
      // eslint-disable-next-line no-unused-expressions
      void puff.offsetWidth;
      puff.classList.add("shown");
      setTimeout(() => puff.classList.remove("shown"), 2400);
    },

    showPeterThought() {
      const t = document.getElementById("peter-thought");
      if (!t) return;
      t.classList.add("shown");
      t.setAttribute("aria-hidden", "false");
      setTimeout(() => this.hidePeterThought(), 2500);
    },
    hidePeterThought() {
      const t = document.getElementById("peter-thought");
      if (!t) return;
      t.classList.remove("shown");
      t.setAttribute("aria-hidden", "true");
    },

    pulseLearningCircuit() {
      const stage = document.getElementById("game-stage");
      if (!stage) return;
      stage.classList.remove("learned");
      void stage.offsetWidth;
      stage.classList.add("learned");
      setTimeout(() => stage.classList.remove("learned"), 1600);
    },

    setPeterState(state) {
      const c = document.getElementById("game-character");
      if (c) c.dataset.peter = state;
    },

    setCaption(text, mod) {
      const cap = document.getElementById("game-caption");
      if (!cap) return;
      cap.classList.add("fade");
      setTimeout(() => {
        cap.textContent = text;
        cap.classList.remove("fade", "warn", "error", "success");
        if (mod) cap.classList.add(mod);
      }, 180);
    },

    /* ---------- Slot rendering ------------------------------------------ */
    clearSlots() {
      document.querySelectorAll("#game-sequence .seq-slot").forEach((slot) => {
        slot.classList.remove("filled");
        slot.querySelectorAll(".seq-emoji, .seq-text").forEach(n => n.remove());
        let ph = slot.querySelector(".seq-placeholder");
        if (!ph) {
          ph = document.createElement("span");
          ph.className = "seq-placeholder";
          ph.textContent = "?";
          slot.appendChild(ph);
        } else {
          ph.textContent = "?";
        }
      });
    },

    fillSlot(idx, cardId) {
      const slot = document.querySelector('#game-sequence .seq-slot[data-slot="' + idx + '"]');
      if (!slot) return;
      slot.classList.add("filled");
      const ph = slot.querySelector(".seq-placeholder");
      if (ph) ph.remove();
      slot.querySelectorAll(".seq-emoji, .seq-text").forEach(n => n.remove());
      const e = document.createElement("span");
      e.className = "seq-emoji";
      e.textContent = PETER_EMOJI[cardId] || "•";
      const t = document.createElement("span");
      t.className = "seq-text";
      t.textContent = PETER_LABELS[cardId] || cardId;
      slot.appendChild(e);
      slot.appendChild(t);
    },

    /* ---------- Card lock + retry --------------------------------------- */
    lockCards()   { document.querySelectorAll(".action-card").forEach(c => c.classList.add("locked")); },
    unlockCards() { document.querySelectorAll(".action-card").forEach(c => c.classList.remove("locked")); },

    showRetry() {
      const btn = document.getElementById("game-retry");
      if (btn) btn.hidden = false;
    },
    hideRetry() {
      const btn = document.getElementById("game-retry");
      if (btn) btn.hidden = true;
    },

    retry() {
      // Soft reset for another attempt. Attempts counter persists so hints
      // sharpen if the user keeps stalling.
      const carryAttempts = this.attempts;
      this.state = freshPeterState();
      this.ended = false;
      this.pickInProgress = false;
      this.attempts = carryAttempts;
      this.clearSlots();
      this.applyStateToDom(true);
      this.unlockCards();
      this.hideRetry();
      this.hidePeterThought();
      this.setPeterState("panic");
      this.setCaption("Pick three actions in a different order.", "");
    },

    /* ---------- Win overlay --------------------------------------------- */
    showWin() {
      const character = document.getElementById("game-character");
      if (character) character.classList.add("won");
      this.setPeterState("calm");
      const overlay = document.getElementById("win-overlay");
      if (overlay) {
        overlay.classList.add("open");
        overlay.setAttribute("aria-hidden", "false");
      }
      if (sounds.win) sounds.win();
    },
    hideWin() {
      const character = document.getElementById("game-character");
      if (character) character.classList.remove("won");
      const overlay = document.getElementById("win-overlay");
      if (overlay) {
        overlay.classList.remove("open");
        overlay.setAttribute("aria-hidden", "true");
      }
    },
  };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  document.querySelectorAll(".action-card").forEach((card) => {
    card.addEventListener("click", () => peterGame.onCardClick(card.dataset.action, card));
  });

  const retryBtn = document.getElementById("game-retry");
  if (retryBtn) retryBtn.addEventListener("click", () => peterGame.retry());

  const playAgainBtn = document.getElementById("play-again");
  if (playAgainBtn) playAgainBtn.addEventListener("click", () => peterGame.init());

  peterGame.init();


  /* ====================== PART 3: TWO-CIRCUIT LOOP ======================
     Same interaction shape as Part 1, but the unit of analysis is a shared
     loop: each person's body/action becomes data for the other's circuit. */

  /* Six beats. The story mirrors Parts 1 and 2:
       shared safety -> one alarm -> the other reads it -> feedback loop ->
       one changed signal -> repair. */
  const dyadBeats = [
    {
      phase: "calm",
      a: "calm", b: "calm",
      links: [],
      alarms: { a: "low", b: "low" },
      vitals: { a: { bpm: 82, brpm: 15 }, b: { bpm: 82, brpm: 15 } },
      event: "They start with one shared story.",
      speech: {
        a: "Let's build one castle.",
        b: "I'll add this wall.",
      },
      read: {
        primary: "Both circuits read: we are building together.",
        a: "\"Safe enough to play.\"",
        b: "\"Safe enough to play.\"",
      },
      hold: 1600,
    },
    {
      phase: "bump",
      a: "alert", b: "calm",
      links: [],
      alarms: { a: "rising", b: "low" },
      vitals: { a: { bpm: 118, brpm: 23 }, b: { bpm: 84, brpm: 15 } },
      event: "A wall falls. Nora's body jumps.",
      speech: {
        a: "Hey, you knocked it down!",
        b: "I just turned.",
      },
      read: {
        primary: "Nora's alarm fills in the missing story: \"He wrecked it on purpose.\"",
        a: "\"He wrecked it on purpose.\"",
        b: "\"It was an accident.\"",
      },
      hold: 2000,
    },
    {
      phase: "b-reads",
      a: "alert", b: "alert",
      links: ["a-hot"],
      alarms: { a: "rising", b: "rising" },
      vitals: { a: { bpm: 126, brpm: 25 }, b: { bpm: 108, brpm: 21 } },
      event: "Jules reads Nora's alarm.",
      speech: {
        a: "You ruined it!",
        b: "I didn't mean to!",
      },
      read: {
        primary: "Jules reads her alarm as danger: \"She thinks I'm bad.\"",
        a: "\"He ruined it.\"",
        b: "\"She thinks I'm bad.\"",
      },
      hold: 1800,
    },
    {
      phase: "escalate",
      a: "hot", b: "hot",
      links: ["a-hot", "b-hot"],
      alarms: { a: "high", b: "high" },
      vitals: { a: { bpm: 144, brpm: 29 }, b: { bpm: 138, brpm: 28 } },
      event: "Two alarms start looping.",
      speech: {
        a: "You won't listen!",
        b: "Stop blaming me!",
      },
      read: {
        primary: "The loop gets louder. Each child feels certain their story is right.",
        a: "\"He won't listen.\"",
        b: "\"I'm in trouble.\"",
      },
      hold: 2100,
    },
    {
      phase: "breath",
      a: "settling", b: "alert",
      links: ["safe"],
      alarms: { a: "falling", b: "high" },
      vitals: { a: { bpm: 108, brpm: 18 }, b: { bpm: 140, brpm: 28 } },
      event: "Nora changes the signal.",
      speech: {
        a: "Was it an accident?",
        b: "Yes. I can fix it.",
      },
      read: {
        primary: "One changed signal gives cortex time to check: \"Was it an accident?\"",
        a: "\"Maybe it was an accident.\"",
        b: "\"She is softer now.\"",
      },
      hold: 2100,
    },
    {
      phase: "settle",
      a: "calm", b: "calm",
      links: ["safe"],
      alarms: { a: "low", b: "low" },
      vitals: { a: { bpm: 86, brpm: 16 }, b: { bpm: 90, brpm: 17 } },
      event: "Both update the story.",
      speech: {
        a: "Let's rebuild it.",
        b: "I'll help.",
      },
      read: {
        primary: "\"It fell. We can rebuild.\" The castle becomes shared again.",
        a: "\"We can rebuild.\"",
        b: "\"I can help fix it.\"",
      },
      hold: 0,
    },
  ];

  const dyadStage = document.getElementById("dyad-stage");
  const dyadA = document.getElementById("dyad-a");
  const dyadB = document.getElementById("dyad-b");
  const dyadCaption = document.getElementById("dyad-caption");
  const dyadStepEl = document.getElementById("dyad-step");
  const dyadTotalEl = document.getElementById("dyad-total");
  const dyadPrevBtn = document.getElementById("dyad-prev");
  const dyadNextBtn = document.getElementById("dyad-next");
  const dyadPlayBtn = document.getElementById("dyad-play");
  const dyadReplayBtn = document.getElementById("dyad-replay");
  const dyadAAlarm = document.getElementById("dyad-a-alarm");
  const dyadBAlarm = document.getElementById("dyad-b-alarm");
  const dyadEventText = document.getElementById("dyad-event-text");
  const dyadReadPrimary = document.getElementById("dyad-read-primary");
  const dyadReadSecondary = document.getElementById("dyad-read-secondary");
  const dyadASpeech = document.getElementById("dyad-speech-a");
  const dyadBSpeech = document.getElementById("dyad-speech-b");
  const dyadABpm = document.getElementById("dyad-a-bpm");
  const dyadABrpm = document.getElementById("dyad-a-brpm");
  const dyadBBpm = document.getElementById("dyad-b-bpm");
  const dyadBBrpm = document.getElementById("dyad-b-brpm");

  let dyadIdx = 0;
  let dyadTimer = null;
  let dyadPlaying = false;
  let dyadPlayed = false;

  if (dyadTotalEl) dyadTotalEl.textContent = dyadBeats.length;

  function applyDyadBeat(idx) {
    const b = dyadBeats[idx];
    if (!b || !dyadStage) return;

    dyadStage.dataset.phase = b.phase;
    if (dyadA) dyadA.dataset.state = b.a;
    if (dyadB) dyadB.dataset.state = b.b;
    if (dyadAAlarm) dyadAAlarm.textContent = b.alarms.a;
    if (dyadBAlarm) dyadBAlarm.textContent = b.alarms.b;
    if (dyadEventText) dyadEventText.textContent = b.event;
    if (dyadReadPrimary) dyadReadPrimary.textContent = b.read.primary;
    if (dyadReadSecondary) dyadReadSecondary.textContent = b.read.secondary;
    if (dyadASpeech) dyadASpeech.textContent = b.speech.a;
    if (dyadBSpeech) dyadBSpeech.textContent = b.speech.b;
    if (dyadABpm) animateNumber(dyadABpm, parseInt(dyadABpm.textContent, 10), b.vitals.a.bpm, 600);
    if (dyadABrpm) animateNumber(dyadABrpm, parseInt(dyadABrpm.textContent, 10), b.vitals.a.brpm, 600);
    if (dyadBBpm) animateNumber(dyadBBpm, parseInt(dyadBBpm.textContent, 10), b.vitals.b.bpm, 600);
    if (dyadBBrpm) animateNumber(dyadBBrpm, parseInt(dyadBBrpm.textContent, 10), b.vitals.b.brpm, 600);

    const linkEls = dyadStage.querySelectorAll(".dyad-link, .dyad-pause");
    linkEls.forEach((el) => el.classList.remove("shown"));
    void dyadStage.offsetWidth;
    linkEls.forEach((el) => {
      el.classList.toggle("shown", b.links.includes(el.dataset.link));
    });

    if (dyadStepEl) dyadStepEl.textContent = idx + 1;
    if (dyadPrevBtn) dyadPrevBtn.disabled = idx === 0;
    if (dyadNextBtn) dyadNextBtn.disabled = idx === dyadBeats.length - 1;
  }

  function setDyadPlaying(v) {
    dyadPlaying = v;
    if (dyadPlayBtn) {
      dyadPlayBtn.textContent = v ? "⏸ Pause" : (dyadIdx >= dyadBeats.length - 1 ? "↺ Replay" : "▶ Auto-play");
    }
    if (!v && dyadTimer) {
      clearTimeout(dyadTimer);
      dyadTimer = null;
    }
  }

  function goToDyad(i, opts) {
    opts = opts || {};
    if (dyadTimer) {
      clearTimeout(dyadTimer);
      dyadTimer = null;
    }
    dyadIdx = Math.max(0, Math.min(dyadBeats.length - 1, i));
    applyDyadBeat(dyadIdx);
    if (opts.autoplay && dyadIdx < dyadBeats.length - 1) {
      const hold = dyadBeats[dyadIdx].hold;
      if (hold > 0) {
        dyadTimer = setTimeout(() => goToDyad(dyadIdx + 1, { autoplay: true }), hold);
      } else {
        setDyadPlaying(false);
      }
    }
    if (dyadIdx === dyadBeats.length - 1) setDyadPlaying(false);
  }

  function startDyadAutoplay() {
    if (dyadIdx >= dyadBeats.length - 1) goToDyad(0, { autoplay: true });
    else goToDyad(dyadIdx, { autoplay: true });
    setDyadPlaying(true);
  }

  if (dyadPrevBtn) dyadPrevBtn.addEventListener("click", () => { setDyadPlaying(false); goToDyad(dyadIdx - 1); });
  if (dyadNextBtn) dyadNextBtn.addEventListener("click", () => { setDyadPlaying(false); goToDyad(dyadIdx + 1); });
  if (dyadPlayBtn) dyadPlayBtn.addEventListener("click", () => dyadPlaying ? setDyadPlaying(false) : startDyadAutoplay());
  if (dyadReplayBtn) dyadReplayBtn.addEventListener("click", () => { setDyadPlaying(false); goToDyad(0); });

  document.addEventListener("keydown", (e) => {
    const part3 = document.getElementById("part-3");
    if (!part3) return;
    const rect = part3.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    if (e.key === "ArrowRight") { e.preventDefault(); setDyadPlaying(false); goToDyad(dyadIdx + 1); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); setDyadPlaying(false); goToDyad(dyadIdx - 1); }
  });

  goToDyad(0);

  if ("IntersectionObserver" in window && dyadStage) {
    const part3 = document.getElementById("part-3");
    if (part3) {
      const dyadObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !dyadPlayed) {
            dyadPlayed = true;
            startDyadAutoplay();
            dyadObserver.disconnect();
          }
        });
      }, { threshold: 0.35 });
      dyadObserver.observe(part3);
    }
  }
})();

/* =========================================================
   Part 4: literary lens.
   Pride and Prejudice is used as an adult-scale example of the same
   prediction/update circuit from Part 3.
   ========================================================= */
(function () {
  const litBeats = [
    {
      phase: "assembly",
      speaker: "darcy",
      event: "Darcy keeps his distance at the assembly.",
      elizabeth: {
        state: "wounded",
        read: "\"That sounded like contempt.\"",
        body: "A sharp social signal narrows attention toward pride.",
      },
      darcy: {
        state: "defensive",
        read: "\"I will keep my distance.\"",
        body: "His body chooses safety before curiosity.",
      },
      vitals: { e: { bpm: 96, brpm: 18 }, d: { bpm: 88, brpm: 16 } },
      caption: "Turn 1: Darcy's distance becomes Elizabeth's first data point.",
      mod: "",
      hold: 2100,
    },
    {
      phase: "prejudice",
      speaker: "elizabeth",
      event: "Elizabeth's first model hardens after Wickham's story.",
      elizabeth: {
        state: "wounded",
        read: "\"He thinks I am beneath him.\"",
        body: "The old prediction now feels like evidence.",
      },
      darcy: {
        state: "defensive",
        read: "\"She now reads me through one narrow signal.\"",
        body: "His guarded style becomes harder to repair.",
      },
      vitals: { e: { bpm: 112, brpm: 22 }, d: { bpm: 104, brpm: 19 } },
      caption: "Turn 2: Elizabeth answers with a stronger prior: pride means threat.",
      mod: "",
      hold: 2300,
    },
    {
      phase: "proposal",
      speaker: "darcy",
      event: "Darcy speaks, but affection and pride arrive tangled.",
      elizabeth: {
        state: "wounded",
        read: "\"His love still sounds like contempt.\"",
        body: "Alarm rises; the old model becomes rigid.",
      },
      darcy: {
        state: "defensive",
        read: "\"My intention should be obvious.\"",
        body: "He misses how his signal lands in her circuit.",
      },
      vitals: { e: { bpm: 132, brpm: 26 }, d: { bpm: 124, brpm: 24 } },
      caption: "Turn 3: Darcy sends a signal his own circuit expects to be clear.",
      mod: "",
      hold: 2400,
    },
    {
      phase: "proposal",
      speaker: "elizabeth",
      event: "Elizabeth refuses; her alarm names the wound.",
      elizabeth: {
        state: "wounded",
        read: "\"No: that signal hurt.\"",
        body: "Her response becomes prediction error for Darcy.",
      },
      darcy: {
        state: "defensive",
        read: "\"I did not see how it landed.\"",
        body: "A rigid self-model begins to loosen.",
      },
      vitals: { e: { bpm: 128, brpm: 25 }, d: { bpm: 118, brpm: 23 } },
      caption: "Turn 4: Elizabeth's reply gives Darcy new data about impact.",
      mod: "",
      hold: 2300,
    },
    {
      phase: "letter",
      speaker: "darcy",
      event: "Darcy's letter offers slower evidence.",
      elizabeth: {
        state: "curious",
        read: "\"My first read may be incomplete.\"",
        body: "Attention widens; the model can revise.",
      },
      darcy: {
        state: "curious",
        read: "\"Here is the missing context.\"",
        body: "He changes channel from defense to evidence.",
      },
      vitals: { e: { bpm: 102, brpm: 20 }, d: { bpm: 94, brpm: 18 } },
      caption: "Turn 5: Darcy makes his internal model more readable.",
      mod: "",
      hold: 2300,
    },
    {
      phase: "update",
      speaker: "elizabeth",
      event: "Later actions let Elizabeth revise the model.",
      elizabeth: {
        state: "changed",
        read: "\"His character is larger than my first model.\"",
        body: "A safer read lets affection and judgment coexist.",
      },
      darcy: {
        state: "changed",
        read: "\"Respect changes the signal.\"",
        body: "His behavior becomes new data, not just explanation.",
      },
      vitals: { e: { bpm: 82, brpm: 15 }, d: { bpm: 82, brpm: 15 } },
      caption: "Turn 6: Elizabeth updates without forgetting the earlier alarm.",
      mod: "update",
      hold: 0,
    },
  ];

  const litStage = document.getElementById("lit-stage");
  const litEvent = document.getElementById("lit-event");
  const litElizabeth = document.getElementById("lit-elizabeth");
  const litDarcy = document.getElementById("lit-darcy");
  const litElizabethSpeech = document.getElementById("lit-elizabeth-speech");
  const litDarcySpeech = document.getElementById("lit-darcy-speech");
  const litElizabethRead = document.getElementById("lit-elizabeth-read");
  const litElizabethBody = document.getElementById("lit-elizabeth-body");
  const litDarcyRead = document.getElementById("lit-darcy-read");
  const litDarcyBody = document.getElementById("lit-darcy-body");
  const litEBpm = document.getElementById("lit-e-bpm");
  const litEBrpm = document.getElementById("lit-e-brpm");
  const litDBpm = document.getElementById("lit-d-bpm");
  const litDBrpm = document.getElementById("lit-d-brpm");
  const litCaption = document.getElementById("lit-caption");
  const litStepEl = document.getElementById("lit-step");
  const litTotalEl = document.getElementById("lit-total");
  const litPrevBtn = document.getElementById("lit-prev");
  const litNextBtn = document.getElementById("lit-next");
  const litPlayBtn = document.getElementById("lit-play");
  const litReplayBtn = document.getElementById("lit-replay");

  if (!litStage) return;

  let litIdx = 0;
  let litTimer = null;
  let litPlaying = false;
  let litPlayed = false;

  if (litTotalEl) litTotalEl.textContent = litBeats.length;

  function animateLitNumber(textNode, from, to, dur) {
    if (!textNode) return;
    if (isNaN(from)) { textNode.textContent = to; return; }
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const v = Math.round(from + (to - from) * t);
      textNode.textContent = v;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function applyLitBeat(idx) {
    const b = litBeats[idx];
    if (!b) return;

    const speaker = b.speaker || "both";
    litStage.dataset.speaker = speaker;
    if (litEvent) litEvent.textContent = b.event;
    if (litElizabeth) litElizabeth.dataset.state = b.elizabeth.state;
    if (litDarcy) litDarcy.dataset.state = b.darcy.state;
    if (litElizabethSpeech) litElizabethSpeech.dataset.state = b.elizabeth.state;
    if (litDarcySpeech) litDarcySpeech.dataset.state = b.darcy.state;
    if (litElizabeth) litElizabeth.dataset.turn = speaker === "elizabeth" ? "speaking" : "listening";
    if (litDarcy) litDarcy.dataset.turn = speaker === "darcy" ? "speaking" : "listening";
    if (litElizabethSpeech) litElizabethSpeech.dataset.turn = speaker === "elizabeth" ? "speaking" : "listening";
    if (litDarcySpeech) litDarcySpeech.dataset.turn = speaker === "darcy" ? "speaking" : "listening";
    if (litElizabethRead) litElizabethRead.textContent = b.elizabeth.read;
    if (litElizabethBody) litElizabethBody.textContent = b.elizabeth.body;
    if (litDarcyRead) litDarcyRead.textContent = b.darcy.read;
    if (litDarcyBody) litDarcyBody.textContent = b.darcy.body;
    litStage.dataset.phase = b.phase;
    if (litEBpm) animateLitNumber(litEBpm, parseInt(litEBpm.textContent, 10), b.vitals.e.bpm, 600);
    if (litEBrpm) animateLitNumber(litEBrpm, parseInt(litEBrpm.textContent, 10), b.vitals.e.brpm, 600);
    if (litDBpm) animateLitNumber(litDBpm, parseInt(litDBpm.textContent, 10), b.vitals.d.bpm, 600);
    if (litDBrpm) animateLitNumber(litDBrpm, parseInt(litDBrpm.textContent, 10), b.vitals.d.brpm, 600);
    if (litCaption) {
      litCaption.classList.add("fade");
      setTimeout(() => {
        litCaption.textContent = b.caption;
        litCaption.classList.remove("fade", "update");
        if (b.mod) litCaption.classList.add(b.mod);
      }, 180);
    }

    if (litStepEl) litStepEl.textContent = idx + 1;
    if (litPrevBtn) litPrevBtn.disabled = idx === 0;
    if (litNextBtn) litNextBtn.disabled = idx === litBeats.length - 1;
  }

  function setLitPlaying(v) {
    litPlaying = v;
    if (litPlayBtn) {
      litPlayBtn.textContent = v ? "⏸ Pause" : (litIdx >= litBeats.length - 1 ? "↺ Replay" : "▶ Auto-play");
    }
    if (!v && litTimer) {
      clearTimeout(litTimer);
      litTimer = null;
    }
  }

  function goToLit(i, opts) {
    opts = opts || {};
    if (litTimer) {
      clearTimeout(litTimer);
      litTimer = null;
    }
    litIdx = Math.max(0, Math.min(litBeats.length - 1, i));
    applyLitBeat(litIdx);
    if (opts.autoplay && litIdx < litBeats.length - 1) {
      const hold = litBeats[litIdx].hold;
      if (hold > 0) {
        litTimer = setTimeout(() => goToLit(litIdx + 1, { autoplay: true }), hold);
      } else {
        setLitPlaying(false);
      }
    }
    if (litIdx === litBeats.length - 1) setLitPlaying(false);
  }

  function startLitAutoplay() {
    if (litIdx >= litBeats.length - 1) goToLit(0, { autoplay: true });
    else goToLit(litIdx, { autoplay: true });
    setLitPlaying(true);
  }

  if (litPrevBtn) litPrevBtn.addEventListener("click", () => { setLitPlaying(false); goToLit(litIdx - 1); });
  if (litNextBtn) litNextBtn.addEventListener("click", () => { setLitPlaying(false); goToLit(litIdx + 1); });
  if (litPlayBtn) litPlayBtn.addEventListener("click", () => litPlaying ? setLitPlaying(false) : startLitAutoplay());
  if (litReplayBtn) litReplayBtn.addEventListener("click", () => { setLitPlaying(false); goToLit(0); });

  goToLit(0);

  if ("IntersectionObserver" in window) {
    const part4 = document.getElementById("part-4");
    if (part4) {
      const litObserver = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !litPlayed) {
            litPlayed = true;
            startLitAutoplay();
            litObserver.disconnect();
          }
        });
      }, { threshold: 0.3 });
      litObserver.observe(part4);
    }
  }
})();
