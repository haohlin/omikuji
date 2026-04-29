(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const DATA = Array.isArray(window.OMIKUJI) ? window.OMIKUJI : [];
  const SHAKE_TARGET = 8;
  const SHAKE_COOLDOWN = 260;

  const state = {
    lang: localStorage.getItem("omikuji.lang") || "zh",
    stage: "intro",
    shakeCount: 0,
    lastMotionAt: 0,
    lastMagnitude: 0,
    selected: null,
    audio: null,
    petals: [],
    raf: 0,
    motionReady: false,
  };

  const I18N = {
    zh: {
      title: "御神籤",
      sub: "观音百签 · 元三大师",
      inst: "静心祈愿，然后摇动签筒",
      start: "开始参拜",
      shakePrompt: "摇一摇手机，或连续点击签筒",
      shakeUnit: " 次",
      draw: "抽签",
      back: "返回",
      openPaper: "展开签纸",
      altLabel: "日文训读",
      share: "分享",
      again: "再抽一次",
      copied: "链接已复制",
      shared: "愿这支签给你一点方向",
      motionDenied: "可直接点击签筒摇签",
      loading: "签文正在整理中",
      numberPrefix: "第",
      numberSuffix: "番",
      summaryTitle: "解签",
      aspects: {
        願事: "愿望",
        恋愛: "恋爱",
        仕事: "事业",
        健康: "健康",
        旅行: "旅行",
        失物: "失物",
        待人: "待人",
      },
      fortunes: {
        大吉: "大吉",
        吉: "吉",
        中吉: "中吉",
        小吉: "小吉",
        末吉: "末吉",
        半吉: "半吉",
        凶: "凶",
        小凶: "小凶",
        末凶: "末凶",
        大凶: "大凶",
      },
    },
    ja: {
      title: "御神籤",
      sub: "観音百籤 · 元三大師",
      inst: "心を静め、願いを念じて筒を振る",
      start: "参拝へ",
      shakePrompt: "筒を振るか、画面を連打する",
      shakeUnit: " 回",
      draw: "籤を引く",
      back: "戻る",
      openPaper: "お籤を開く",
      altLabel: "訓読",
      share: "共有",
      again: "再び引く",
      copied: "リンクをコピーしました",
      shared: "この御神籤が道しるべになりますように",
      motionDenied: "画面を押しても振れます",
      loading: "籤文を整えています",
      numberPrefix: "第",
      numberSuffix: "番",
      summaryTitle: "御告げ",
      aspects: {
        願事: "願事",
        恋愛: "恋愛",
        仕事: "仕事",
        健康: "健康",
        旅行: "旅行",
        失物: "失物",
        待人: "待人",
      },
      fortunes: {
        大吉: "大吉",
        吉: "吉",
        中吉: "中吉",
        小吉: "小吉",
        末吉: "末吉",
        半吉: "半吉",
        凶: "凶",
        小凶: "小凶",
        末凶: "末凶",
        大凶: "大凶",
      },
    },
    en: {
      title: "Omikuji",
      sub: "Kannon Hundred Lots · Ganzan Daishi",
      inst: "Quiet your heart, make a wish, then shake the box",
      start: "Enter the Shrine",
      shakePrompt: "Shake your phone, or tap the fortune box",
      shakeUnit: " shakes",
      draw: "Draw a Lot",
      back: "Back",
      openPaper: "Open the Fortune",
      altLabel: "Original verse",
      share: "Share",
      again: "Draw Again",
      copied: "Link copied",
      shared: "May this omikuji offer a small sign for your path",
      motionDenied: "You can tap the box to shake it",
      loading: "Preparing your fortune",
      numberPrefix: "No. ",
      numberSuffix: "",
      summaryTitle: "Reading",
      aspects: {
        願事: "Wish",
        恋愛: "Love",
        仕事: "Work",
        健康: "Health",
        旅行: "Travel",
        失物: "Lost Item",
        待人: "Expected Person",
      },
      fortunes: {
        大吉: "Great Blessing",
        吉: "Blessing",
        中吉: "Middle Blessing",
        小吉: "Small Blessing",
        末吉: "Future Blessing",
        半吉: "Half Blessing",
        凶: "Misfortune",
        小凶: "Small Misfortune",
        末凶: "Future Misfortune",
        大凶: "Great Misfortune",
      },
    },
  };

  const els = {};

  function boot() {
    Object.assign(els, {
      stages: $$(".stage"),
      langButtons: $$(".lang-switch button"),
      goShake: $("#go-shake"),
      goDraw: $("#go-draw"),
      goBack: $("#go-back1"),
      goPaper: $("#go-paper"),
      boxWrap: $("#box-wrap"),
      box: $("#box"),
      shakeCount: $("#shake-count"),
      stickNumber: $("#stick-number"),
      stickFloating: $("#stick-floating"),
      paper: $("#paper"),
      pNum: $("#p-num"),
      pFortune: $("#p-fortune"),
      pPoemZh: $("#p-poem-zh"),
      pPoemAlt: $("#p-poem-alt"),
      pSummary: $("#p-summary"),
      pAspects: $("#p-aspects"),
      share: $("#btn-share"),
      again: $("#btn-again"),
      sakura: $("#sakura"),
      ghLink: $("#gh-link"),
    });

    if (els.ghLink) els.ghLink.href = "https://github.com/haohlin/omikuji";
    bindEvents();
    setLang(I18N[state.lang] ? state.lang : "zh");
    showStage("intro");
    initSakura();
    window.addEventListener("resize", resizeSakura, { passive: true });
  }

  function bindEvents() {
    els.langButtons.forEach((btn) => btn.addEventListener("click", () => setLang(btn.dataset.lang)));
    els.goShake.addEventListener("click", () => {
      resetShake();
      showStage("shake");
      unlockAudio().then(() => soundBell());
      enableMotion();
    });
    els.goBack.addEventListener("click", () => showStage("intro"));
    els.boxWrap.addEventListener("click", manualShake);
    els.boxWrap.addEventListener("pointerdown", () => unlockAudio(), { passive: true });
    els.goDraw.addEventListener("click", drawFortune);
    els.goPaper.addEventListener("click", openPaper);
    els.share.addEventListener("click", shareFortune);
    els.again.addEventListener("click", () => {
      state.selected = null;
      resetShake();
      showStage("shake");
    });
    window.addEventListener("devicemotion", onDeviceMotion, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !state.raf) animateSakura();
    });
  }

  function setLang(lang) {
    state.lang = I18N[lang] ? lang : "zh";
    localStorage.setItem("omikuji.lang", state.lang);
    document.documentElement.lang = state.lang;
    document.documentElement.dataset.lang = state.lang;
    els.langButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.lang === state.lang));
    $$('[data-i18n]').forEach((node) => {
      const key = node.dataset.i18n;
      if (I18N[state.lang][key]) node.textContent = I18N[state.lang][key];
    });
    updateShakeCount();
    if (state.selected) renderFortune(state.selected);
  }

  function showStage(name) {
    state.stage = name;
    els.stages.forEach((stage) => {
      const active = stage.id === `stage-${name}`;
      stage.classList.toggle("active", active);
      stage.classList.remove("leaving");
    });
  }

  async function enableMotion() {
    if (state.motionReady) return true;
    try {
      const DME = window.DeviceMotionEvent;
      if (DME && typeof DME.requestPermission === "function") {
        const res = await DME.requestPermission();
        state.motionReady = res === "granted";
        if (!state.motionReady) toast(t("motionDenied"));
        return state.motionReady;
      }
      state.motionReady = true;
      return true;
    } catch (_) {
      toast(t("motionDenied"));
      return false;
    }
  }

  function onDeviceMotion(event) {
    if (state.stage !== "shake") return;
    const acc = event.accelerationIncludingGravity || event.acceleration || {};
    const x = acc.x || 0;
    const y = acc.y || 0;
    const z = acc.z || 0;
    const mag = Math.sqrt(x * x + y * y + z * z);
    const delta = Math.abs(mag - state.lastMagnitude);
    state.lastMagnitude = mag;
    const now = performance.now();
    if ((mag > 22 || delta > 13) && now - state.lastMotionAt > SHAKE_COOLDOWN) {
      state.lastMotionAt = now;
      registerShake();
    }
  }

  function manualShake() {
    if (state.stage !== "shake") return;
    registerShake();
  }

  function registerShake() {
    state.shakeCount = Math.min(SHAKE_TARGET, state.shakeCount + 1);
    updateShakeCount();
    animateBox();
    soundShake();
    if (state.shakeCount >= SHAKE_TARGET) {
      els.goDraw.classList.remove("hidden");
      soundBell(0.42);
    }
  }

  function resetShake() {
    state.shakeCount = 0;
    state.lastMagnitude = 0;
    updateShakeCount();
    els.goDraw.classList.add("hidden");
  }

  function updateShakeCount() {
    els.shakeCount.textContent = String(state.shakeCount);
    const unit = els.shakeCount.nextElementSibling;
    if (unit) unit.textContent = t("shakeUnit");
  }

  function animateBox() {
    els.box.classList.remove("shaking");
    void els.box.offsetWidth;
    els.box.classList.add("shaking");
  }

  function drawFortune() {
    if (!DATA.length) {
      toast(t("loading"));
      return;
    }
    unlockAudio();
    soundStick();
    state.selected = DATA[Math.floor(Math.random() * DATA.length)];
    els.stickNumber.textContent = formatNumber(state.selected.number);
    els.stickFloating.style.animation = "none";
    void els.stickFloating.offsetWidth;
    els.stickFloating.style.animation = "";
    showStage("stick");
  }

  function openPaper() {
    if (!state.selected) drawFortune();
    soundPaper();
    setTimeout(() => soundBell(0.55), 180);
    renderFortune(state.selected);
    showStage("paper");
  }

  function renderFortune(item) {
    const lang = state.lang;
    const detailLang = lang === "zh" ? "zh" : lang === "ja" ? "ja" : "en";
    els.pNum.textContent = formatNumber(item.number);
    els.pFortune.textContent = (I18N[lang].fortunes && I18N[lang].fortunes[item.fortune]) || item.fortune;

    if (lang === "en") {
      els.pPoemZh.textContent = item.meaning_en || item.poem_ja || "";
      els.pPoemAlt.textContent = item.poem_ja || "";
      els.pSummary.textContent = item.meaning_en || "";
    } else if (lang === "ja") {
      els.pPoemZh.textContent = item.poem_ja || "";
      els.pPoemAlt.textContent = item.poem_reading || "";
      els.pSummary.textContent = item.meaning_ja || "";
    } else {
      els.pPoemZh.textContent = item.poem_ja || "";
      els.pPoemAlt.textContent = item.poem_reading || "";
      els.pSummary.textContent = item.meaning_zh || "";
    }

    els.pAspects.innerHTML = "";
    Object.entries(item.details || {}).forEach(([key, value]) => {
      const card = document.createElement("div");
      card.className = "aspect";
      const label = document.createElement("b");
      label.textContent = (I18N[lang].aspects && I18N[lang].aspects[key]) || key;
      const body = document.createElement("span");
      body.textContent = (value && (value[detailLang] || value.zh || value.ja || value.en)) || "";
      card.append(label, body);
      els.pAspects.appendChild(card);
    });
  }

  async function shareFortune() {
    const item = state.selected;
    const lang = state.lang;
    const fortune = item ? ((I18N[lang].fortunes && I18N[lang].fortunes[item.fortune]) || item.fortune) : "Omikuji";
    const text = item
      ? `${t("shared")}\n${formatNumber(item.number)} · ${fortune}\n${summaryForShare(item)}`
      : t("shared");
    const payload = {
      title: document.title,
      text,
      url: location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else {
        await navigator.clipboard.writeText(`${text}\n${location.href}`);
        toast(t("copied"));
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(`${text}\n${location.href}`);
        toast(t("copied"));
      } catch (_) {
        toast(location.href);
      }
    }
  }

  function summaryForShare(item) {
    if (state.lang === "en") return item.meaning_en || "";
    if (state.lang === "ja") return item.meaning_ja || "";
    return item.meaning_zh || "";
  }

  function formatNumber(num) {
    if (state.lang === "en") return `${t("numberPrefix")}${num}${t("numberSuffix")}`;
    return `${t("numberPrefix")}${toCjkNumber(num)}${t("numberSuffix")}`;
  }

  function toCjkNumber(num) {
    const chars = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
    if (num === 100) return "百";
    if (num < 10) return chars[num];
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    const head = tens === 1 ? "十" : `${chars[tens]}十`;
    return ones ? `${head}${chars[ones]}` : head;
  }

  function t(key) {
    return (I18N[state.lang] && I18N[state.lang][key]) || I18N.zh[key] || key;
  }

  function toast(message) {
    let node = $(".toast");
    if (!node) {
      node = document.createElement("div");
      node.className = "toast";
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(node._timer);
    node._timer = setTimeout(() => node.classList.remove("show"), 2100);
  }

  async function unlockAudio() {
    if (!state.audio) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      state.audio = new Ctx();
    }
    if (state.audio.state === "suspended") {
      try { await state.audio.resume(); } catch (_) {}
    }
    return state.audio;
  }

  function envGain(ctx, start, duration, peak = 0.22) {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(ctx.destination);
    return gain;
  }

  function playTone(freq, duration, type = "sine", peak = 0.16, delay = 0) {
    const ctx = state.audio;
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.72), start + duration);
    osc.connect(envGain(ctx, start, duration, peak));
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function playNoise(duration, peak = 0.12, delay = 0, filterFreq = 950) {
    const ctx = state.audio;
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = filterFreq;
    filter.Q.value = 4;
    src.connect(filter);
    filter.connect(envGain(ctx, start, duration, peak));
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  function soundShake() {
    unlockAudio().then(() => {
      playNoise(0.075, 0.13, 0, 620);
      playTone(180 + Math.random() * 80, 0.08, "triangle", 0.08, 0.012);
      playTone(120 + Math.random() * 35, 0.06, "square", 0.045, 0.045);
    });
  }

  function soundStick() {
    unlockAudio().then(() => {
      playTone(880, 0.11, "triangle", 0.12, 0);
      playTone(1320, 0.09, "sine", 0.08, 0.035);
      playNoise(0.05, 0.05, 0.02, 1800);
    });
  }

  function soundPaper() {
    unlockAudio().then(() => {
      playNoise(0.22, 0.09, 0, 2600);
      playNoise(0.16, 0.055, 0.11, 1800);
    });
  }

  function soundBell(volume = 0.28) {
    unlockAudio().then(() => {
      [784, 1176, 1568].forEach((freq, i) => playTone(freq, 1.15 - i * 0.18, "sine", volume / (i + 1.8), i * 0.018));
    });
  }

  function initSakura() {
    if (!els.sakura) return;
    resizeSakura();
    const count = Math.min(58, Math.max(24, Math.floor(window.innerWidth / 18)));
    state.petals = Array.from({ length: count }, () => makePetal(true));
    animateSakura();
  }

  function resizeSakura() {
    if (!els.sakura) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    els.sakura.width = Math.floor(window.innerWidth * dpr);
    els.sakura.height = Math.floor(window.innerHeight * dpr);
    els.sakura.style.width = `${window.innerWidth}px`;
    els.sakura.style.height = `${window.innerHeight}px`;
    const ctx = els.sakura.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makePetal(randomY = false) {
    return {
      x: Math.random() * window.innerWidth,
      y: randomY ? Math.random() * window.innerHeight : -20 - Math.random() * 120,
      r: 4 + Math.random() * 6,
      vy: 0.35 + Math.random() * 0.9,
      vx: -0.35 + Math.random() * 0.7,
      rot: Math.random() * Math.PI,
      spin: -0.018 + Math.random() * 0.036,
      alpha: 0.35 + Math.random() * 0.45,
    };
  }

  function animateSakura() {
    if (!els.sakura || document.hidden) {
      state.raf = 0;
      return;
    }
    const ctx = els.sakura.getContext("2d");
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    state.petals.forEach((p, idx) => {
      p.x += p.vx + Math.sin((p.y + idx * 17) / 54) * 0.35;
      p.y += p.vy;
      p.rot += p.spin;
      if (p.y > window.innerHeight + 30 || p.x < -40 || p.x > window.innerWidth + 40) {
        state.petals[idx] = makePetal(false);
        return;
      }
      drawPetal(ctx, p);
    });
    state.raf = requestAnimationFrame(animateSakura);
  }

  function drawPetal(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, p.r * 1.8);
    grad.addColorStop(0, "rgba(255,238,242,.95)");
    grad.addColorStop(0.75, "rgba(248,170,190,.82)");
    grad.addColorStop(1, "rgba(248,170,190,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r * 0.72, p.r * 1.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
