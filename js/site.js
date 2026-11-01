// Smiley Pumpkin / Please Stop Landing Here - site behaviour
(() => {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  document.documentElement.classList.add("js");

  // ---------- top bar + hero parallax ----------
  const topbar = $(".topbar");
  const hero = $(".hero");
  const onScroll = () => {
    const y = scrollY;
    topbar.classList.toggle("scrolled", y > 40);
    if (!reduced) hero.style.setProperty("--scroll", Math.min(y / innerHeight, 1).toFixed(3));
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ---------- reveal on scroll + stat counters ----------
  const countUp = (el) => {
    const end = +el.dataset.count;
    if (reduced) return;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min((t - t0) / 1200, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in");
      $$("[data-count]", e.target).forEach(countUp);
      io.unobserve(e.target);
    }
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el) => io.observe(el));

  // ---------- starfield ----------
  const stars = $("#stars");
  const sctx = stars.getContext("2d");
  let starList = [];
  const sizeStars = () => {
    stars.width = innerWidth * dpr();
    stars.height = innerHeight * dpr();
    const n = Math.round((innerWidth * innerHeight) / 5200);
    starList = Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random() * 0.9 + 0.1,
      h: [190, 300, 50, 260][Math.floor(Math.random() * 4)], tw: Math.random() * Math.PI * 2,
    }));
  };
  const drawStars = (t) => {
    const w = stars.width, h = stars.height, s = dpr();
    sctx.clearRect(0, 0, w, h);
    const drift = scrollY * 0.05;
    for (const st of starList) {
      const y = ((st.y * h - drift * st.z * s) % h + h) % h;
      const a = 0.35 + 0.65 * st.z * (0.6 + 0.4 * Math.sin(t / 900 + st.tw));
      sctx.fillStyle = `hsla(${st.h}, 90%, 85%, ${a})`;
      const r = st.z * 1.4 * s;
      sctx.fillRect(st.x * w, y, r, r);
    }
    if (!reduced) requestAnimationFrame(drawStars);
  };
  sizeStars();
  requestAnimationFrame(drawStars);
  addEventListener("resize", sizeStars);

  // ---------- click to shoot (particles + score popups + combo) ----------
  const fx = $("#fx");
  const fctx = fx.getContext("2d");
  const parts = [];
  const popups = [];
  let score = 0, combo = 1, lastHit = 0, fxRunning = false;
  const hud = $("#hud"), hudScore = $("#hudScore"), hudCombo = $("#hudCombo");
  const sizeFx = () => { fx.width = innerWidth * dpr(); fx.height = innerHeight * dpr(); };
  sizeFx();
  addEventListener("resize", sizeFx);
  const colours = ["#36e6ff", "#ff2fd6", "#ffc21a", "#b6ff2e", "#ff8a00", "#8a4dff"];

  const fxLoop = () => {
    const s = dpr();
    fctx.clearRect(0, 0, fx.width, fx.height);
    fctx.globalCompositeOperation = "lighter";
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.97; p.life -= 1;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      const a = p.life / p.max;
      fctx.fillStyle = p.c;
      fctx.globalAlpha = a;
      fctx.beginPath();
      fctx.arc(p.x * s, p.y * s, p.r * s * (0.5 + a), 0, 6.283);
      fctx.fill();
    }
    fctx.globalCompositeOperation = "source-over";
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.y -= 0.9; p.life -= 1;
      if (p.life <= 0) { popups.splice(i, 1); continue; }
      fctx.globalAlpha = Math.min(1, p.life / 25);
      fctx.font = `${14 * s}px "Press Start 2P", monospace`;
      fctx.textAlign = "center";
      fctx.lineWidth = 4 * s;
      fctx.strokeStyle = "#000";
      fctx.strokeText(p.text, p.x * s, p.y * s);
      fctx.fillStyle = p.c;
      fctx.fillText(p.text, p.x * s, p.y * s);
    }
    fctx.globalAlpha = 1;
    if (parts.length || popups.length) requestAnimationFrame(fxLoop);
    else fxRunning = false;
  };

  const shoot = (x, y) => {
    const now = performance.now();
    combo = now - lastHit < 1100 ? Math.min(combo + 1, 8) : 1;
    lastHit = now;
    const pts = 100 * combo;
    score += pts;
    hudScore.textContent = String(score).padStart(8, "0");
    hudCombo.textContent = combo > 1 ? `x${combo} COMBO` : "";
    hud.classList.add("on");
    if (reduced) return;
    const n = 18 + combo * 4;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = 1.5 + Math.random() * (3 + combo * 0.4);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, r: 1.5 + Math.random() * 2.5,
        c: colours[Math.floor(Math.random() * colours.length)], life: 40 + Math.random() * 25, max: 65 });
    }
    popups.push({ x, y: y - 10, text: combo > 1 ? `+${pts} x${combo}` : `+${pts}`, c: combo > 1 ? "#ffc21a" : "#fff", life: 60 });
    if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
  };
  // Mouse fires on press; touch and pen fire on a completed tap (click), so scrolling a phone doesn't shoot.
  const notTarget = (e) => e.target.closest("a, button, [role=tab], .lightbox, audio, input");
  let lastPointer = "mouse";
  addEventListener("pointerdown", (e) => {
    lastPointer = e.pointerType;
    if (e.pointerType !== "mouse" || e.button !== 0 || notTarget(e)) return;
    shoot(e.clientX, e.clientY);
  });
  addEventListener("click", (e) => {
    if (lastPointer === "mouse" || notTarget(e)) return;
    shoot(e.clientX, e.clientY);
  });

  // ---------- power-up switcher ----------
  const powerImg = $("#powerImg"), powerLabel = $("#powerLabel"), powerDesc = $("#powerDesc");
  const powers = $$(".power");
  const showPowerDesc = (btn) => (powerDesc.textContent = $("p", btn).textContent);
  showPowerDesc(powers.find((b) => b.getAttribute("aria-selected") === "true"));
  const selectPower = (btn) => {
    if (btn.getAttribute("aria-selected") === "true") return;
    powers.forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
    showPowerDesc(btn);
    powerImg.style.opacity = 0;
    setTimeout(() => {
      powerImg.src = `assets/img/shots/${btn.dataset.img}.webp`;
      powerImg.alt = btn.dataset.alt;
      powerLabel.textContent = $("h3", btn).textContent.toUpperCase();
      powerImg.onload = () => (powerImg.style.opacity = 1);
    }, 180);
  };
  powers.forEach((b) => {
    b.addEventListener("click", () => selectPower(b));
    b.addEventListener("mouseenter", () => matchMedia("(hover: hover)").matches && selectPower(b));
    const pre = new Image(); pre.src = `assets/img/shots/${b.dataset.img}.webp`;
  });

  // ---------- alien card tilt ----------
  if (!reduced && matchMedia("(hover: hover)").matches) {
    $$(".alien:not(.extra)").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-4px)`;
      });
      card.addEventListener("pointerleave", () => (card.style.transform = ""));
    });
  }

  // ---------- bosses ----------
  // The Mothership's later stages are a surprise: show and describe stage 1 only.
  const BOSSES = [
    { n: "KRAKEN", w: 10, c: "#3a6bff", img: "kraken", move: "LUNGE",
      d: "Lurks just outside the arena, surges in and backs off &mdash; and its tentacles come in through your gates. Ink included." },
    { n: "BIG BRAIN", w: 20, c: "#ff2fd6", img: "brain", move: "BLINK",
      d: "Hovers, then beams out and back in somewhere else. Brings a copy of itself. Throws Heavies at you." },
    { n: "OVERLORD", w: 30, c: "#ff3b4e", img: "overlord", move: "ORBIT",
      d: "Glides round the ring, pausing on a gate to rain glowing orbs. Your flamethrower burns them out of the sky." },
    { n: "HYDRA", w: 40, c: "#b6ff2e", img: "hydra", move: "CHARGE",
      d: "Dashes two or three gates at a time and stomps. Take the green heads off &mdash; then go for the golden one." },
    { n: "HIVE QUEEN", w: 50, c: "#ffc21a", img: "queen", move: "LEAP",
      d: "Leaps round the ring to a gate of her choosing and leaves nests behind. Burn them." },
    { n: "THE WYRM", w: 60, c: "#7dff5a", img: "wyrm", move: "DIVE",
      d: "Coils in and out through the wall. Only its tail end can be hurt &mdash; until it can't, and then it's the head." },
    { n: "THE MOTHERSHIP", w: 70, c: "#36e6ff", img: "mothership", move: "FINAL", final: true,
      d: "The one that started all this. It's seen your sign. It is not impressed. Beat it to win &mdash; and unlock Batsh*t Crazy." },
  ];
  const bossSection = $("#bosses"), bossList = $("#bossList"), bossImg = $("#bossImg");
  const bossName = $("#bossName"), bossWave = $("#bossWave"), bossDesc = $("#bossDesc");
  const CYCLE = 6000;
  let bossIdx = 0, bossTimer = null, bossAuto = true;
  BOSSES.forEach((b, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<button class="boss-tab${b.final ? " final" : ""}" role="tab" aria-selected="false" style="--c:${b.c}">
      <span class="n">${b.w}</span><span class="name">${b.n}</span><span class="prog"></span></button>`;
    const btn = li.firstElementChild;
    btn.addEventListener("click", () => { bossAuto = false; showBoss(i); });
    bossList.appendChild(li);
    const pre = new Image(); pre.src = `assets/img/bosses/${b.img}.webp`;
  });
  const tabs = $$(".boss-tab", bossList);
  const showBoss = (i) => {
    bossIdx = i;
    const b = BOSSES[i];
    tabs.forEach((t, j) => {
      t.setAttribute("aria-selected", String(j === i));
      const p = $(".prog", t);
      p.classList.remove("run");
      if (j === i && bossAuto && !reduced) { void p.offsetWidth; p.style.setProperty("--dur", CYCLE + "ms"); p.classList.add("run"); }
    });
    bossSection.style.setProperty("--boss-c", b.c);
    bossImg.src = `assets/img/bosses/${b.img}.webp`;
    bossImg.alt = `${b.n} on wave ${b.w}`;
    bossName.textContent = b.n;
    bossWave.textContent = b.final ? `WAVE ${b.w} · FINAL BOSS` : `WAVE ${b.w}`;
    bossDesc.innerHTML = `<span class="move">${b.move}</span>${b.d}`;
    if (!reduced) { bossImg.classList.remove("glitch"); void bossImg.offsetWidth; bossImg.classList.add("glitch"); }
    clearTimeout(bossTimer);
    if (bossAuto && !reduced) bossTimer = setTimeout(() => inView && showBoss((bossIdx + 1) % BOSSES.length), CYCLE);
  };
  let inView = false;
  new IntersectionObserver(([e]) => {
    const was = inView; inView = e.isIntersecting;
    if (inView && !was && bossAuto) showBoss(bossIdx);
  }, { threshold: 0.3 }).observe($(".boss-stage"));
  bossList.addEventListener("keydown", (e) => {
    const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!k) return;
    e.preventDefault(); bossAuto = false;
    const i = (bossIdx + k + BOSSES.length) % BOSSES.length;
    showBoss(i); tabs[i].focus();
  });
  showBoss(0);

  // ---------- soundtrack + visualiser ----------
  const audio = $("#audio"), trackBtns = $$(".track"), vizWrap = $("#vizWrap"), vizCenter = $("#vizCenter");
  const progress = $("#progress span");
  const viz = $("#viz"), vctx = viz.getContext("2d");
  let actx = null, analyser = null, freq = null, current = -1;
  const ensureAudioGraph = () => {
    if (actx) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      const src = actx.createMediaElementSource(audio);
      analyser = actx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      src.connect(analyser); analyser.connect(actx.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
    } catch (err) { analyser = null; }
  };
  const setPlayingUI = () => {
    const playing = !audio.paused;
    vizWrap.classList.toggle("playing", playing);
    trackBtns.forEach((b, i) => {
      b.setAttribute("aria-pressed", String(i === current));
      b.classList.toggle("playing", i === current && playing);
    });
  };
  const playTrack = (i) => {
    ensureAudioGraph();
    if (actx && actx.state === "suspended") actx.resume();
    if (i === current) { audio.paused ? audio.play() : audio.pause(); return; }
    current = i;
    audio.src = trackBtns[i].dataset.src;
    audio.play().catch(() => {});
  };
  trackBtns.forEach((b, i) => b.addEventListener("click", () => playTrack(i)));
  $("#playBig").addEventListener("click", () => playTrack(current < 0 ? 0 : current));
  $$("[data-autoplay]").forEach((a) => a.addEventListener("click", () => { if (audio.paused) playTrack(current < 0 ? 0 : current); }));
  ["play", "pause", "ended"].forEach((ev) => audio.addEventListener(ev, setPlayingUI));
  audio.addEventListener("ended", () => playTrack((current + 1) % trackBtns.length));
  audio.addEventListener("timeupdate", () => { progress.style.width = (audio.currentTime / (audio.duration || 1)) * 100 + "%"; });
  $("#progress").addEventListener("click", (e) => {
    if (!audio.duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
  });

  const sizeViz = () => { const r = viz.getBoundingClientRect(); viz.width = r.width * dpr(); viz.height = r.height * dpr(); };
  sizeViz();
  addEventListener("resize", sizeViz);
  const BARS = 96, GATES = 8;
  let rot = 0, vizVisible = false, vizRunning = false;
  new IntersectionObserver(([e]) => {
    vizVisible = e.isIntersecting;
    if (vizVisible && !vizRunning) { vizRunning = true; requestAnimationFrame(drawViz); }
  }).observe(viz);
  function drawViz(t) {
    const w = viz.width, h = viz.height, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.24;
    vctx.clearRect(0, 0, w, h);
    const playing = !audio.paused;
    let bass = 0;
    const vals = new Array(BARS);
    if (analyser && playing) {
      analyser.getByteFrequencyData(freq);
      for (let i = 0; i < 8; i++) bass += freq[i];
      bass /= 8 * 255;
    }
    for (let i = 0; i < BARS; i++) {
      const m = i < BARS / 2 ? i : BARS - 1 - i; // mirrored so the ring is symmetric
      let v;
      if (analyser && playing) v = freq[Math.floor((m / (BARS / 2)) * freq.length * 0.72)] / 255;
      else v = 0.12 + 0.08 * Math.sin(t / 700 + i * 0.4) + (playing ? 0.25 * Math.abs(Math.sin(t / 180 + i)) : 0);
      vals[i] = v;
    }
    if (!(analyser && playing) && playing) bass = 0.4 + 0.3 * Math.abs(Math.sin(t / 240));
    rot += reduced ? 0 : 0.0016 + bass * 0.01;
    // arena rings
    vctx.lineWidth = 2 * dpr();
    vctx.strokeStyle = `rgba(58,107,255,${0.35 + bass * 0.5})`;
    vctx.beginPath(); vctx.arc(cx, cy, R * 0.92, 0, 6.283); vctx.stroke();
    vctx.strokeStyle = `rgba(255,47,214,${0.25 + bass * 0.6})`;
    vctx.beginPath(); vctx.arc(cx, cy, R * (1.9 + bass * 0.08), 0, 6.283); vctx.stroke();
    // gate spokes
    for (let g = 0; g < GATES; g++) {
      const a = rot * 0.5 + (g / GATES) * 6.283;
      vctx.strokeStyle = `rgba(54,230,255,${0.12 + bass * 0.35})`;
      vctx.beginPath(); vctx.moveTo(cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92);
      vctx.lineTo(cx + Math.cos(a) * R * 2.05, cy + Math.sin(a) * R * 2.05); vctx.stroke();
    }
    // spectrum bars
    vctx.lineCap = "round";
    for (let i = 0; i < BARS; i++) {
      const a = rot + (i / BARS) * 6.283;
      const len = R * (0.08 + vals[i] * 0.85);
      const hue = 190 + (i / BARS) * 140 + bass * 40;
      vctx.strokeStyle = `hsl(${hue % 360}, 100%, ${55 + vals[i] * 20}%)`;
      vctx.lineWidth = Math.max(2, (R * 6.283) / BARS * 0.5);
      vctx.shadowColor = vctx.strokeStyle; vctx.shadowBlur = 12 * dpr();
      const r0 = R * 1.02;
      vctx.beginPath();
      vctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      vctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len));
      vctx.stroke();
    }
    vctx.shadowBlur = 0;
    vizCenter.style.transform = `scale(${1 + bass * 0.12})`;
    if (vizVisible && !reduced) requestAnimationFrame(drawViz);
    else vizRunning = false;
  }

  // ---------- lightbox ----------
  const lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap");
  const shots = $$(".shot");
  let lbIdx = 0, lastFocus = null;
  const showShot = (i) => {
    lbIdx = (i + shots.length) % shots.length;
    const s = shots[lbIdx];
    lbImg.src = s.dataset.full;
    lbImg.alt = $("img", s).alt;
    lbCap.textContent = $("figcaption", s).textContent;
  };
  const openLb = (i) => { lastFocus = document.activeElement; showShot(i); lb.classList.add("open"); $("#lbClose").focus(); document.body.style.overflow = "hidden"; };
  const closeLb = () => { lb.classList.remove("open"); document.body.style.overflow = ""; lastFocus && lastFocus.focus(); };
  shots.forEach((s, i) => s.addEventListener("click", () => openLb(i)));
  $("#lbClose").addEventListener("click", closeLb);
  $("#lbPrev").addEventListener("click", () => showShot(lbIdx - 1));
  $("#lbNext").addEventListener("click", () => showShot(lbIdx + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") showShot(lbIdx - 1);
    if (e.key === "ArrowRight") showShot(lbIdx + 1);
  });
})();
