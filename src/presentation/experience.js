const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

class NoirAudio {
  constructor(settings, persist) {
    this.settings = settings;
    this.persist = persist;
    this.context = null;
    this.master = null;
    this.music = null;
    this.sfx = null;
    this.sequence = null;
    this.step = 0;
    this.scene = "lobby";
  }

  async unlock() {
    if (this.context) {
      if (this.context.state === "suspended") await this.context.resume();
      return;
    }
    const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.music = this.context.createGain();
    this.sfx = this.context.createGain();
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(this.context.destination);
    this.applySettings();
    this.startAmbience();
  }

  applySettings() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(this.settings.muted ? 0 : this.settings.masterVolume, now, 0.05);
    this.music.gain.setTargetAtTime(this.settings.music ? 0.24 : 0, now, 0.2);
    this.sfx.gain.setTargetAtTime(this.settings.sfx ? 0.7 : 0, now, 0.05);
    this.persist();
  }

  setScene(scene) {
    this.scene = scene;
  }

  tone(frequency, duration = 0.12, options = {}) {
    if (!this.context || !this.settings.sfx || this.settings.muted) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = options.type || "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, options.to || frequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(options.volume || 0.16, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.sfx);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  play(name) {
    const sounds = {
      hover: () => this.tone(520, 0.04, { volume: 0.035, to: 620 }),
      click: () => this.tone(150, 0.08, { type: "triangle", volume: 0.1, to: 90 }),
      transition: () => this.tone(90, 0.34, { type: "sawtooth", volume: 0.07, to: 260 }),
      spin: () => { this.tone(70, 0.25, { type: "sawtooth", volume: 0.16, to: 420 }); this.tone(220, 0.35, { volume: 0.08, to: 880 }); },
      stop: () => this.tone(105, 0.12, { type: "square", volume: 0.11, to: 72 }),
      chip: () => this.tone(1150, 0.07, { type: "triangle", volume: 0.09, to: 730 }),
      card: () => this.tone(330, 0.09, { type: "triangle", volume: 0.06, to: 190 }),
      win: () => [523, 659, 784, 1046].forEach((note, index) => setTimeout(() => this.tone(note, 0.28, { volume: 0.11 }), index * 75)),
      bigWin: () => [392, 523, 659, 784, 1046, 1318].forEach((note, index) => setTimeout(() => this.tone(note, 0.42, { type: "triangle", volume: 0.13 }), index * 65)),
      error: () => this.tone(120, 0.26, { type: "sawtooth", volume: 0.08, to: 70 }),
    };
    sounds[name]?.();
  }

  startAmbience() {
    if (this.sequence) return;
    const patterns = {
      lobby: [55, 82.41, 65.41, 98],
      slot: [65.41, 98, 73.42, 110],
      roulette: [55, 73.42, 82.41, 61.74],
      blackjack: [49, 65.41, 73.42, 55],
    };
    const pulse = () => {
      if (!this.context || !this.settings.music || this.settings.muted) return;
      const notes = patterns[this.scene] || patterns.lobby;
      const now = this.context.currentTime;
      const bass = this.context.createOscillator();
      const pad = this.context.createOscillator();
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();
      bass.type = "sine";
      bass.frequency.value = notes[this.step % notes.length];
      pad.type = "triangle";
      pad.frequency.value = notes[(this.step + 2) % notes.length] * 4;
      filter.type = "lowpass";
      filter.frequency.value = 620;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.065, now + 0.09);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      bass.connect(filter); pad.connect(filter); filter.connect(gain); gain.connect(this.music);
      bass.start(now); pad.start(now); bass.stop(now + 1.5); pad.stop(now + 1.5);
      this.step += 1;
    };
    pulse();
    this.sequence = setInterval(pulse, 1050);
  }
}

class AmbientCanvas {
  constructor(settings) {
    this.settings = settings;
    this.canvas = document.createElement("canvas");
    this.canvas.id = "noirAtmosphere";
    this.canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(this.canvas);
    this.context = this.canvas.getContext("2d", { alpha: true });
    this.pointer = { x: 0.5, y: 0.5 };
    this.particles = [];
    this.frame = 0;
    this.resize = this.resize.bind(this);
    this.draw = this.draw.bind(this);
    addEventListener("resize", this.resize, { passive: true });
    addEventListener("pointermove", (event) => {
      this.pointer.x = event.clientX / innerWidth;
      this.pointer.y = event.clientY / innerHeight;
    }, { passive: true });
    this.resize();
    requestAnimationFrame(this.draw);
  }

  quality() {
    if (this.settings.quality !== "auto") return this.settings.quality;
    return (navigator.deviceMemory && navigator.deviceMemory <= 4) || navigator.hardwareConcurrency <= 4 ? "low" : innerWidth < 900 ? "medium" : "high";
  }

  resize() {
    const quality = this.quality();
    const scale = quality === "high" ? Math.min(devicePixelRatio, 1.5) : 1;
    this.canvas.width = innerWidth * scale;
    this.canvas.height = innerHeight * scale;
    this.canvas.style.width = innerWidth + "px";
    this.canvas.style.height = innerHeight + "px";
    this.context.setTransform(scale, 0, 0, scale, 0, 0);
    const count = quality === "high" ? 70 : quality === "medium" ? 38 : 18;
    this.particles = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      size: Math.random() * 1.7 + 0.35,
      speed: Math.random() * 0.16 + 0.03,
      drift: Math.random() * 0.15 - 0.075,
      hue: Math.random() > 0.7 ? 335 : Math.random() > 0.4 ? 156 : 38,
      alpha: Math.random() * 0.32 + 0.08,
    }));
  }

  draw() {
    const ctx = this.context;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches || this.settings.motion !== "full";
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    const glow = ctx.createRadialGradient(innerWidth * this.pointer.x, innerHeight * this.pointer.y, 0, innerWidth * this.pointer.x, innerHeight * this.pointer.y, innerWidth * 0.55);
    glow.addColorStop(0, "rgba(22,104,72,.075)");
    glow.addColorStop(0.45, "rgba(102,25,65,.028)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, innerWidth, innerHeight);
    for (const particle of this.particles) {
      if (!reduced && this.settings.motion !== "off") {
        particle.y -= particle.speed;
        particle.x += particle.drift;
        if (particle.y < -5) particle.y = innerHeight + 5;
        if (particle.x < -5) particle.x = innerWidth + 5;
        if (particle.x > innerWidth + 5) particle.x = -5;
      }
      ctx.beginPath();
      ctx.fillStyle = `hsla(${particle.hue},75%,68%,${particle.alpha})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = ctx.fillStyle;
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    this.frame = requestAnimationFrame(this.draw);
  }
}

export class NoirExperience {
  constructor(settings, persist) {
    this.settings = settings;
    this.persist = persist;
    this.audio = new NoirAudio(settings, persist);
    this.ambient = new AmbientCanvas(settings);
    this.currentJackpot = 847_529_300;
    this.introFinished = false;
    this.installGlobalEvents();
    this.showIntro();
  }

  installGlobalEvents() {
    const unlock = () => this.audio.unlock();
    addEventListener("pointerdown", unlock, { once: true, passive: true });
    addEventListener("keydown", unlock, { once: true });
    document.addEventListener("pointerover", (event) => {
      if (event.target.closest("button, a, .game-card")) this.audio.play("hover");
    }, { passive: true });
    document.addEventListener("click", (event) => {
      if (event.target.closest("button, a")) this.audio.play("click");
    });
    setInterval(() => {
      this.currentJackpot += Math.floor(Math.random() * 97) + 17;
      document.querySelectorAll("[data-live-jackpot]").forEach((node) => this.animateNumber(node, this.currentJackpot, "₲ "));
    }, 2800);
  }

  showIntro() {
    const seen = this.settings.introSeen;
    const intro = document.createElement("div");
    intro.id = "noirIntro";
    intro.className = seen ? "intro intro-short" : "intro";
    intro.innerHTML = `<div class="intro-light"></div><div class="intro-mark"><span>N</span><strong>NOIR</strong><small>CASINO · ASUNCIÓN</small></div><div class="intro-line"></div><button>SKIP INTRO</button>`;
    document.body.appendChild(intro);
    const finish = () => {
      if (this.introFinished) return;
      this.introFinished = true;
      intro.classList.add("is-leaving");
      this.settings.introSeen = true;
      this.persist();
      setTimeout(() => intro.remove(), 700);
    };
    intro.querySelector("button").onclick = finish;
    setTimeout(finish, seen ? 650 : 2600);
  }

  transition(callback, accent = "gold") {
    if (document.body.classList.contains("is-transitioning")) return;
    document.body.dataset.transition = accent;
    document.body.classList.add("is-transitioning");
    this.audio.play("transition");
    setTimeout(callback, 260);
    setTimeout(() => document.body.classList.remove("is-transitioning"), 720);
  }

  setScene(scene) {
    document.body.dataset.scene = scene;
    this.audio.setScene(scene);
  }

  bindParallax(root = document) {
    const targets = [...root.querySelectorAll("[data-parallax]")];
    if (!targets.length || this.settings.motion === "off") return;
    const onMove = (event) => {
      const x = (event.clientX / innerWidth - 0.5) * 2;
      const y = (event.clientY / innerHeight - 0.5) * 2;
      for (const target of targets) {
        const amount = Number(target.dataset.parallax || 1);
        target.style.setProperty("--px", `${x * amount}px`);
        target.style.setProperty("--py", `${y * amount}px`);
      }
    };
    root.addEventListener("pointermove", onMove, { passive: true });
  }

  animateNumber(node, target, prefix = "") {
    if (!node) return;
    const current = Number(node.dataset.value || target);
    node.dataset.value = target;
    if (this.settings.motion === "off") {
      node.textContent = prefix + Math.round(target).toLocaleString("es-PY");
      return;
    }
    const started = performance.now();
    const duration = 520;
    const tick = (time) => {
      const progress = clamp((time - started) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = prefix + Math.round(current + (target - current) * eased).toLocaleString("es-PY");
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    node.classList.remove("number-flash");
    requestAnimationFrame(() => node.classList.add("number-flash"));
  }

  winCelebration(amount, multiplier = 1) {
    const tier = multiplier >= 500 ? "LEGENDARY" : multiplier >= 100 ? "EPIC WIN" : multiplier >= 50 ? "MEGA WIN" : multiplier >= 20 ? "BIG WIN" : "WIN";
    const overlay = document.createElement("div");
    overlay.className = `win-celebration tier-${tier.toLowerCase().replace(/\s/g, "-")}`;
    overlay.innerHTML = `<div class="win-rays"></div><div class="win-coins">${Array.from({ length: 24 }, (_, index) => `<i style="--i:${index}"></i>`).join("")}</div><p>${tier}</p><strong data-win-counter>₲ 0</strong><button>SKIP</button>`;
    document.body.appendChild(overlay);
    this.audio.play(multiplier >= 20 ? "bigWin" : "win");
    this.animateNumber(overlay.querySelector("[data-win-counter]"), amount, "₲ ");
    const close = () => { overlay.classList.add("is-leaving"); setTimeout(() => overlay.remove(), 500); };
    overlay.querySelector("button").onclick = close;
    setTimeout(close, multiplier >= 20 ? 3600 : 1800);
  }

  openAudioPanel(container) {
    container.innerHTML = `<div class="modal-backdrop audio-backdrop"><section class="audio-console"><button class="modal-close">×</button><p class="overline">NOIR SOUND SYSTEM</p><h2>ATMOSPHERE CONTROL</h2><label><span>MUSIC</span><button data-audio="music" class="console-switch ${this.settings.music ? "active" : ""}">${this.settings.music ? "ON" : "OFF"}</button></label><label><span>SFX</span><button data-audio="sfx" class="console-switch ${this.settings.sfx ? "active" : ""}">${this.settings.sfx ? "ON" : "OFF"}</button></label><label><span>MASTER VOLUME</span><input data-audio="volume" type="range" min="0" max="1" step="0.05" value="${this.settings.masterVolume}"></label><label><span>MOTION</span><select data-audio="motion"><option value="full">FULL</option><option value="reduced">REDUCED</option><option value="off">OFF</option></select></label><label><span>VISUAL QUALITY</span><select data-audio="quality"><option value="auto">AUTO</option><option value="high">HIGH</option><option value="medium">MEDIUM</option><option value="low">LOW</option></select></label><button class="mute-control ${this.settings.muted ? "active" : ""}" data-audio="mute">${this.settings.muted ? "UNMUTE NOIR" : "MUTE ALL"}</button></section></div>`;
    container.querySelector('[data-audio="motion"]').value = this.settings.motion;
    container.querySelector('[data-audio="quality"]').value = this.settings.quality;
    container.querySelector(".modal-close").onclick = () => container.innerHTML = "";
    container.querySelector(".modal-backdrop").onclick = (event) => { if (event.target === event.currentTarget) container.innerHTML = ""; };
    container.querySelectorAll("[data-audio]").forEach((control) => {
      control.onchange = control.onclick = (event) => {
        const key = event.currentTarget.dataset.audio;
        if (key === "music" || key === "sfx") this.settings[key] = !this.settings[key];
        if (key === "mute") this.settings.muted = !this.settings.muted;
        if (key === "volume") this.settings.masterVolume = Number(event.currentTarget.value);
        if (key === "motion") this.settings.motion = event.currentTarget.value;
        if (key === "quality") { this.settings.quality = event.currentTarget.value; this.ambient.resize(); }
        this.audio.unlock();
        this.audio.applySettings();
        this.openAudioPanel(container);
      };
    });
  }
}
