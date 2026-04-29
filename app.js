(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const DATA = Array.isArray(window.OMIKUJI) ? window.OMIKUJI : [];
  const SHAKE_COOLDOWN = 260;
  const OWNER_NAME = "Haohan Lin";
  const SITE_URL = "https://haohlin.github.io/omikuji/";
  const GITHUB_URL = "https://github.com/haohlin/omikuji";

  const state = {
    lang: localStorage.getItem("omikuji.lang") || "zh",
    stage: "intro",
    shakeCount: 0,
    lastMotionAt: 0,
    lastMagnitude: 0,
    selected: null,
    sessionSalt: String(Date.now()),
    drawSeed: "",
    paperLayout: localStorage.getItem("omikuji.layout") || "card",
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
      shakePrompt: "摇几次都可以抽；次数会改变签运",
      shakeUnit: " 次",
      draw: "抽签",
      back: "返回",
      openPaper: "展开签纸",
      altLabel: "日文训读",
      share: "保存图片 / 分享",
      again: "再抽一次",
      copied: "链接已复制",
      imageReady: "已生成签纸图片，可保存到相册",
      imageSaved: "图片已下载，请从浏览器保存到相册",
      imageError: "图片生成失败，已复制链接",
      shared: "愿这支签给你一点方向",
      motionDenied: "可直接点击签筒摇签",
      loading: "签文正在整理中",
      numberPrefix: "第",
      numberSuffix: "番",
      summaryTitle: "解签",
      shrineTitle: "総本宮\n御神籤",
      shrineSub: "Kannon Hundred Lots",
      layoutReference: "稻荷纸签",
      layoutCard: "卡片版",
      debugToggle: "调试",
      debugLabel: "签号",
      debugShow: "显示",
      debugInvalid: "请输入 1-100 的签号",
      debugMissing: "没有找到这支签",
      aspects: {
        願事: "愿望",
        恋愛: "恋爱",
        仕事: "事业",
        健康: "健康",
        旅行: "旅行",
        失物: "失物",
        待人: "待人",
        方角: "方位",
        勝負: "胜负",
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
      shakePrompt: "何度振っても引けます。回数で籤が変わります",
      shakeUnit: " 回",
      draw: "籤を引く",
      back: "戻る",
      openPaper: "お籤を開く",
      altLabel: "訓読",
      share: "画像保存 / 共有",
      again: "再び引く",
      copied: "リンクをコピーしました",
      imageReady: "御神籤の画像を作成しました。写真に保存できます",
      imageSaved: "画像をダウンロードしました。ブラウザから写真に保存してください",
      imageError: "画像作成に失敗しました。リンクをコピーしました",
      shared: "この御神籤が道しるべになりますように",
      motionDenied: "画面を押しても振れます",
      loading: "籤文を整えています",
      numberPrefix: "第",
      numberSuffix: "番",
      summaryTitle: "御告げ",
      shrineTitle: "総本宮\n御神籤",
      shrineSub: "Kannon Hundred Lots",
      layoutReference: "稲荷紙籤",
      layoutCard: "カード版",
      debugToggle: "検証",
      debugLabel: "番号",
      debugShow: "表示",
      debugInvalid: "1〜100 の番号を入力してください",
      debugMissing: "この番号の籤が見つかりません",
      aspects: {
        願事: "願事",
        恋愛: "恋愛",
        仕事: "仕事",
        健康: "健康",
        旅行: "旅行",
        失物: "失物",
        待人: "待人",
        方角: "方角",
        勝負: "勝負",
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
      shakePrompt: "Shake any number of times; each count changes the lot",
      shakeUnit: " shakes",
      draw: "Draw a Lot",
      back: "Back",
      openPaper: "Open the Fortune",
      altLabel: "Original verse",
      share: "Save Image / Share",
      again: "Draw Again",
      copied: "Link copied",
      imageReady: "Fortune image is ready. Save it to your album.",
      imageSaved: "Image downloaded. Save it to Photos from your browser.",
      imageError: "Could not create image; link copied instead",
      shared: "May this omikuji offer a small sign for your path",
      motionDenied: "You can tap the box to shake it",
      loading: "Preparing your fortune",
      numberPrefix: "No. ",
      numberSuffix: "",
      summaryTitle: "Reading",
      shrineTitle: "Head Shrine\nOmikuji",
      shrineSub: "Kannon Hundred Lots",
      layoutReference: "Shrine Slip",
      layoutCard: "Card View",
      debugToggle: "Debug",
      debugLabel: "No.",
      debugShow: "Show",
      debugInvalid: "Enter a lot number from 1 to 100",
      debugMissing: "No lot found for that number",
      aspects: {
        願事: "Wish",
        恋愛: "Love",
        仕事: "Work",
        健康: "Health",
        旅行: "Travel",
        失物: "Lost Item",
        待人: "Expected Person",
        方角: "Direction",
        勝負: "Contest",
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
      debugLot: $("#debug-lot"),
      debugToggle: $("#debug-toggle"),
      debugForm: $("#debug-form"),
      debugNumber: $("#debug-number"),
      boxWrap: $("#box-wrap"),
      box: $("#box"),
      shakeCount: $("#shake-count"),
      stickNumber: $("#stick-number"),
      stickFloating: $("#stick-floating"),
      paper: $("#paper"),
      pNum: $("#p-num"),
      pNumEn: $("#p-num-en"),
      pFortune: $("#p-fortune"),
      pFortuneEn: $("#p-fortune-en"),
      pShrineTitle: $("#p-shrine-title"),
      pShrineSub: $("#p-shrine-sub"),
      layoutButtons: $$(".layout-btn"),
      pPoemZh: $("#p-poem-zh"),
      pPoemAlt: $("#p-poem-alt"),
      pSummary: $("#p-summary"),
      pAspects: $("#p-aspects"),
      share: $("#btn-share"),
      again: $("#btn-again"),
      sakura: $("#sakura"),
    });

    bindEvents();
    setLang(I18N[state.lang] ? state.lang : "zh");
    showStage("intro");
    initSakura();
    window.addEventListener("resize", resizeSakura, { passive: true });
  }

  function bindEvents() {
    els.langButtons.forEach((btn) => btn.addEventListener("click", () => setLang(btn.dataset.lang)));
    els.layoutButtons.forEach((btn) => btn.addEventListener("click", () => setPaperLayout(btn.dataset.layout)));
    els.goShake.addEventListener("click", () => {
      resetShake();
      showStage("shake");
      unlockAudio().then(() => soundBell());
      enableMotion();
    });
    els.goBack.addEventListener("click", () => showStage("intro"));
    els.debugToggle.addEventListener("click", toggleDebugPanel);
    els.debugForm.addEventListener("submit", showDebugFortune);
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
    if (els.pShrineTitle) els.pShrineTitle.textContent = t("shrineTitle");
    if (els.pShrineSub) els.pShrineSub.textContent = t("shrineSub");
    updateShakeCount();
    setPaperLayout(state.paperLayout, false);
    if (state.selected) renderFortune(state.selected);
  }

  function setPaperLayout(layout, persist = true) {
    state.paperLayout = layout === "card" ? "card" : "reference";
    if (persist) localStorage.setItem("omikuji.layout", state.paperLayout);
    if (els.paper) els.paper.dataset.layout = state.paperLayout;
    if (els.layoutButtons) {
      els.layoutButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.layout === state.paperLayout));
    }
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
    state.shakeCount += 1;
    updateShakeCount();
    animateBox();
    soundShake();
    els.goDraw.classList.remove("hidden");
    if (state.shakeCount === 1 || state.shakeCount % 8 === 0) soundBell(0.32);
  }

  function resetShake() {
    state.shakeCount = 0;
    state.lastMagnitude = 0;
    state.sessionSalt = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    state.drawSeed = "";
    updateShakeCount();
    els.goDraw.classList.remove("hidden");
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
    const seed = buildDrawSeed();
    state.drawSeed = seed;
    state.selected = DATA[pickIndexBySeed(seed, DATA.length)];
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

  function toggleDebugPanel() {
    els.debugLot.classList.toggle("open");
    if (els.debugLot.classList.contains("open")) {
      setTimeout(() => els.debugNumber.focus(), 0);
    }
  }

  function showDebugFortune(event) {
    event.preventDefault();
    const num = Number.parseInt(els.debugNumber.value, 10);
    if (!Number.isInteger(num) || num < 1 || num > 100) {
      toast(t("debugInvalid"));
      return;
    }
    const item = DATA.find((entry) => Number(entry.number) === num);
    if (!item) {
      toast(t("debugMissing"));
      return;
    }
    state.selected = item;
    state.shakeCount = 0;
    state.drawSeed = `debug:${num}`;
    if (els.stickNumber) els.stickNumber.textContent = formatNumber(item.number);
    renderFortune(item);
    showStage("paper");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function renderFortune(item) {
    const lang = state.lang;
    const detailLang = lang === "zh" ? "zh" : lang === "ja" ? "ja" : "en";
    els.pNum.textContent = formatNumber(item.number);
    els.pNumEn.textContent = `No. ${item.number}`;
    els.pFortune.textContent = (I18N[lang].fortunes && I18N[lang].fortunes[item.fortune]) || item.fortune;
    els.pFortuneEn.textContent = I18N.en.fortunes[item.fortune] || item.fortune;
    if (els.pShrineTitle) els.pShrineTitle.textContent = t("shrineTitle");
    if (els.pShrineSub) els.pShrineSub.textContent = t("shrineSub");

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
    getAspectEntries(item).forEach(([key, value]) => {
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
    let file = null;
    try {
      file = item ? await createFortuneImageFile(item) : null;
    } catch (err) {
      console.warn("omikuji image render failed", err);
    }
    const payload = { title: document.title, text, url: SITE_URL };
    try {
      if (file && typeof File !== "undefined" && file instanceof File && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ ...payload, files: [file] });
        toast(t("imageReady"));
        return;
      }
      if (navigator.share) {
        await navigator.share(payload);
        if (file) downloadFile(file);
        toast(file ? t("imageSaved") : t("copied"));
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
      console.warn("omikuji native share failed", err);
    }
    if (file) {
      downloadFile(file);
      toast(t("imageSaved"));
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${SITE_URL}`);
      toast(t("imageError"));
    } catch (_) {
      toast(SITE_URL);
    }
  }

  async function createFortuneImageFile(item) {
    if (document.fonts && document.fonts.ready) {
      try { await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 900))]); } catch (_) {}
    }
    const canvas = renderFortuneCanvas(item);
    const blob = await new Promise((resolve) => {
      if (canvas.toBlob) canvas.toBlob(resolve, "image/png", 0.96);
      else resolve(dataUrlToBlob(canvas.toDataURL("image/png")));
    });
    if (!blob) throw new Error("Could not render fortune image");
    const name = `omikuji-${item.number}.png`;
    try {
      return new File([blob], name, { type: "image/png" });
    } catch (_) {
      blob.name = name;
      return blob;
    }
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name || `omikuji-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function dataUrlToBlob(dataUrl) {
    const [head, body] = dataUrl.split(",");
    const mime = (head.match(/data:([^;]+)/) || [])[1] || "image/png";
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function renderFortuneCanvas(item) {
    const scale = 2;
    const reference = state.paperLayout !== "card";
    const w = reference ? 720 : 900;
    const h = reference ? 1740 : 1720;
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    drawFortuneImage(ctx, item, w, h);
    return canvas;
  }

  function drawFortuneImage(ctx, item, w, h) {
    if (state.paperLayout === "card") drawCardFortuneImage(ctx, item, w, h);
    else drawReferenceFortuneImage(ctx, item, w, h);
  }

  function drawReferenceFortuneImage(ctx, item, w, h) {
    const lang = state.lang;
    const detailLang = lang === "zh" ? "zh" : lang === "ja" ? "ja" : "en";
    const paper = "#fbf7ea";
    const ink = "#11110f";
    const line = "rgba(17,17,15,.62)";
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, h);
    drawPaperGrain(ctx, item, w, h, 0.12);

    const outer = { x: 54, y: 48, w: w - 108, h: h - 142 };
    ctx.strokeStyle = "rgba(17,17,15,.72)";
    ctx.lineWidth = 2;
    ctx.strokeRect(outer.x, outer.y, outer.w, outer.h);
    ctx.strokeStyle = "rgba(17,17,15,.36)";
    ctx.lineWidth = 1;
    ctx.strokeRect(outer.x + 14, outer.y + 14, outer.w - 28, outer.h - 28);

    const left = outer.x + 34;
    const right = outer.x + outer.w - 34;
    let y = outer.y + 34;
    drawCrest(ctx, w / 2, y + 50, 42, ink);
    y += 112;

    const topH = 250;
    const topGap = 14;
    const headerW = Math.floor((right - left - topGap) * (lang === "en" ? 0.42 : 0.52));
    const poemW = right - left - topGap - headerW;
    ctx.strokeStyle = line;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(left, y, headerW, topH);
    const colW = headerW / 3;
    const fortuneText = (I18N[lang].fortunes && I18N[lang].fortunes[item.fortune]) || item.fortune;
    if (lang === "en") {
      drawLeftText(ctx, formatNumber(item.number), left + 16, y + 20, 17, "900", ink, "Georgia");
      drawMultilineText(ctx, t("shrineTitle"), left + 16, y + 54, headerW - 32, 19, 15, ink, "Georgia", 2);
      drawMultilineText(ctx, fortuneText, left + 16, y + 118, headerW - 32, 32, 28, ink, "Georgia", 2);
    } else {
      drawVerticalText(ctx, formatNumber(item.number), left + colW * 2.5, y + 22, 19, 24, ink, true, topH - 44);
      drawVerticalText(ctx, t("shrineTitle"), left + colW * 1.5, y + 22, 18, 23, ink, true, topH - 44);
      drawVerticalText(ctx, fortuneText, left + colW * 0.5, y + 30, 40, 49, ink, true, topH - 60);
    }

    const poemX = left + headerW + topGap;
    ctx.strokeStyle = line;
    ctx.strokeRect(poemX, y, poemW, topH);
    const poem = lang === "en" ? (item.meaning_en || "") : (item.poem_ja || "");
    if (lang === "en") drawWrappedText(ctx, poem, poemX + 16, y + 18, poemW - 32, 19, 13.5, ink, "Georgia");
    else drawVerticalText(ctx, poem, poemX + poemW - 45, y + 24, 25, 34, ink, false, topH - 48);
    y += topH + 18;

    y = drawPlainPanel(ctx, left, y, right - left, t("altLabel"), item.poem_reading || item.poem_ja || "", ink, lang, 110);
    y += 14;
    y = drawPlainPanel(ctx, left, y, right - left, t("summaryTitle"), summaryForShare(item), ink, lang, 124);
    y += 18;

    const entries = getAspectEntries(item).slice(0, 9);
    const gridGapX = 14;
    const gridGapY = 6;
    const boxW = (right - left - gridGapX * 2) / 3;
    const boxH = 90;
    entries.forEach(([key, value], idx) => {
      const x = left + (idx % 3) * (boxW + gridGapX);
      const cy = y + Math.floor(idx / 3) * (boxH + gridGapY);
      const label = (I18N[lang].aspects && I18N[lang].aspects[key]) || key;
      const text = (value && (value[detailLang] || value.zh || value.ja || value.en)) || "";
      drawLeftText(ctx, label, x + 2, cy + 7, 14, "900", ink, "Noto Serif JP");
      ctx.strokeStyle = "rgba(17,17,15,.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 2, cy + 25);
      ctx.lineTo(x + boxW - 2, cy + 25);
      ctx.stroke();
      drawMultilineText(ctx, text, x + 2, cy + 34, boxW - 4, 15, 12, ink, lang === "en" ? "Georgia" : "Noto Serif JP", 4);
    });
    y += 3 * boxH + 2 * gridGapY + 4;

    const sourceY = Math.max(y + 12, outer.y + outer.h - 50);
    ctx.strokeStyle = line;
    ctx.beginPath();
    ctx.moveTo(left, sourceY);
    ctx.lineTo(right, sourceY);
    ctx.stroke();
    drawCenteredText(ctx, "元三大師 · 観音百籤", w / 2, sourceY + 24, 17, "700", ink, "Noto Serif JP");
    drawCenteredText(ctx, `© ${OWNER_NAME}`, w / 2, h - 48, 18, "700", "#24211d", "Georgia");
    drawCenteredText(ctx, `${GITHUB_URL} · ${SITE_URL}`, w / 2, h - 24, 15, "400", "#333", "Georgia");
  }

  function drawPlainPanel(ctx, x, y, w, label, text, ink, lang, minH) {
    ctx.font = `500 15px ${lang === "en" ? "Georgia" : "Noto Serif JP"}, Noto Serif SC, Yu Mincho, serif`;
    const lines = wrapTextLines(ctx, text, w - 28, lang === "en" ? 5 : 6);
    const h = Math.max(minH, 45 + lines.length * 20);
    ctx.strokeStyle = "rgba(17,17,15,.58)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    drawLeftText(ctx, label, x + 12, y + 10, 14, "900", ink, "Noto Serif JP");
    ctx.strokeStyle = "rgba(17,17,15,.28)";
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 34);
    ctx.lineTo(x + w - 10, y + 34);
    ctx.stroke();
    drawMultilineText(ctx, text, x + 12, y + 44, w - 24, 20, 15, ink, lang === "en" ? "Georgia" : "Noto Serif JP", lang === "en" ? 5 : 6);
    return y + h;
  }

  function drawPaperGrain(ctx, item, w, h, alpha = 0.18) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#6c5638";
    for (let i = 0; i < 1200; i += 1) {
      const x = pseudoRandom(i * 17 + item.number) * w;
      const y = pseudoRandom(i * 29 + item.number * 3) * h;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  }

  function drawCrest(ctx, x, y, r, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `900 ${Math.floor(r * 0.86)}px Noto Serif JP, Yu Mincho, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("稲", x, y + 2);
    ctx.restore();
  }

  function drawCardFortuneImage(ctx, item, w, h) {
    const lang = state.lang;
    const detailLang = lang === "zh" ? "zh" : lang === "ja" ? "ja" : "en";
    const bg = "#f8f0dd";
    const panel = "#fffaf0";
    const red = "#b8241d";
    const darkRed = "#7d1714";
    const ink = "#17120f";
    const softLine = "rgba(125,23,20,.24)";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    drawPaperGrain(ctx, item, w, h, 0.10);

    const outer = { x: 44, y: 46, w: w - 88, h: h - 132 };
    fillRoundRect(ctx, outer.x, outer.y, outer.w, outer.h, 34, panel);
    strokeRoundRect(ctx, outer.x, outer.y, outer.w, outer.h, 34, "rgba(116,35,23,.22)", 2);

    const pad = 46;
    const left = outer.x + pad;
    const right = outer.x + outer.w - pad;
    let y = outer.y + 44;
    const fortuneText = (I18N[lang].fortunes && I18N[lang].fortunes[item.fortune]) || item.fortune;

    ctx.strokeStyle = softLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, y + 142);
    ctx.lineTo(right, y + 142);
    ctx.stroke();
    drawLeftText(ctx, formatNumber(item.number), left, y + 18, 26, "700", "#2a2118");
    drawLeftText(ctx, `No. ${item.number}`, left, y + 54, 16, "400", "#8b6554", "Georgia");
    drawRightText(ctx, t("shrineTitle").replace(/\n/g, " "), right, y + 18, lang === "en" ? 22 : 24, "900", darkRed, lang === "en" ? "Georgia" : "Noto Serif SC");
    drawRightText(ctx, t("shrineSub").toUpperCase(), right, y + 54, 14, "400", "#8b6554", "Georgia");
    if (lang === "en") drawCenteredText(ctx, fortuneText, w / 2, y + 88, 34, "900", red, "Georgia");
    else drawCenteredText(ctx, fortuneText, w / 2, y + 78, 76, "900", red, "Noto Serif SC");
    drawCenteredText(ctx, I18N.en.fortunes[item.fortune] || item.fortune, w / 2, y + (lang === "en" ? 126 : 150), 16, "400", "#8b6554", "Georgia");
    y += lang === "en" ? 174 : 188;

    const poem = lang === "en" ? (item.meaning_en || "") : (item.poem_ja || "");
    ctx.fillStyle = ink;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = `900 ${lang === "en" ? 19 : 38}px ${lang === "en" ? "Georgia" : "Noto Serif SC"}, Noto Serif JP, Yu Mincho, serif`;
    const poemLines = lang === "en" ? wrapTextLines(ctx, poem, right - left, 5) : String(poem).split(/\n+/).filter(Boolean);
    if (lang === "en") ctx.textAlign = "left";
    poemLines.slice(0, lang === "en" ? 5 : 4).forEach((line, i) => ctx.fillText(line, lang === "en" ? left : w / 2, y + i * (lang === "en" ? 29 : 62)));
    ctx.textAlign = "center";
    y += lang === "en" ? 172 : 270;
    drawDivider(ctx, left, right, y, softLine);
    y += 26;

    y = drawInfoBox(ctx, left, y, right - left, t("altLabel"), item.poem_reading || item.poem_ja || "", darkRed, ink, lang, 112);
    y += 18;
    y = drawInfoBox(ctx, left, y, right - left, t("summaryTitle"), summaryForShare(item), darkRed, ink, lang, 132);
    y += 24;

    const entries = getAspectEntries(item).slice(0, 9);
    const gap = 14;
    const colW = (right - left - gap) / 2;
    const cardH = 102;
    entries.forEach(([key, value], idx) => {
      const x = left + (idx % 2) * (colW + gap);
      const cy = y + Math.floor(idx / 2) * (cardH + gap);
      fillRoundRect(ctx, x, cy, colW, cardH, 14, "rgba(255,251,240,.82)");
      strokeRoundRect(ctx, x, cy, colW, cardH, 14, "rgba(184,36,29,.18)", 1.5);
      const label = (I18N[lang].aspects && I18N[lang].aspects[key]) || key;
      const text = (value && (value[detailLang] || value.zh || value.ja || value.en)) || "";
      drawLeftText(ctx, label, x + 16, cy + 14, 18, "900", darkRed);
      drawMultilineText(ctx, text, x + 16, cy + 42, colW - 32, 18, 15, ink, lang === "en" ? "Georgia" : "Noto Serif SC", 3);
    });
    y += Math.ceil(entries.length / 2) * (cardH + gap) + 10;

    drawDivider(ctx, left, right, y, "rgba(125,23,20,.22)", true);
    drawCenteredText(ctx, "元三大師 · 観音百籤", w / 2, y + 38, 20, "700", "#7c6254", "Noto Serif JP");
    drawCenteredText(ctx, `© ${OWNER_NAME}`, w / 2, h - 55, 20, "700", "#24211d", "Georgia");
    drawCenteredText(ctx, `${GITHUB_URL} · ${SITE_URL}`, w / 2, h - 28, 16, "400", "#333", "Georgia");
  }

  function getAspectEntries(item) {
    const entries = Object.entries(item.details || {});
    const keys = new Set(entries.map(([key]) => key));
    if (!keys.has("方角")) entries.push(["方角", buildDirectionAspect(item)]);
    if (!keys.has("勝負")) entries.push(["勝負", buildContestAspect(item)]);
    return entries.slice(0, 9);
  }

  function buildDirectionAspect(item) {
    const dirs = [
      { zh: "东方", ja: "東", en: "east" },
      { zh: "东南", ja: "東南", en: "southeast" },
      { zh: "南方", ja: "南", en: "south" },
      { zh: "西南", ja: "西南", en: "southwest" },
      { zh: "西方", ja: "西", en: "west" },
      { zh: "西北", ja: "西北", en: "northwest" },
      { zh: "北方", ja: "北", en: "north" },
      { zh: "东北", ja: "北東", en: "northeast" },
    ];
    const dir = dirs[item.number % dirs.length];
    return {
      zh: `${dir.zh}较顺，出门、会面、择位宜取明亮安静处。`,
      ja: `${dir.ja}がよし。外出・面会・席取りは明るく静かな所を選ぶ。`,
      en: `${dir.en} is favorable. Choose a bright, quiet place for travel, meetings, or seating.`,
    };
  }

  function buildContestAspect(item) {
    const score = fortuneScore(item.fortune);
    if (score >= 7) return {
      zh: "胜机在先，宜主动出手，但不可轻敌。",
      ja: "勝機あり。先んじて動けばよし、油断は禁物。",
      en: "The advantage is yours. Act first, but do not underestimate others.",
    };
    if (score >= 4) return {
      zh: "胜负相半，守正比冒进更有利。",
      ja: "勝負は半ば。無理に攻めず正道を守ればよし。",
      en: "The contest is balanced. Steady play beats rushing ahead.",
    };
    return {
      zh: "不宜强争，先退一步，等待时机再定胜负。",
      ja: "強く争わず、一歩退いて時を待つべし。",
      en: "Avoid forcing the contest. Step back and wait for the better moment.",
    };
  }

  function fortuneScore(fortune) {
    return ({ 大吉: 9, 吉: 8, 中吉: 7, 小吉: 6, 末吉: 5, 半吉: 4, 凶: 3, 小凶: 2, 末凶: 1, 大凶: 0 })[fortune] ?? 5;
  }

  function fillRoundRect(ctx, x, y, w, h, r, color) {
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function strokeRoundRect(ctx, x, y, w, h, r, color, lineWidth = 1) {
    roundRectPath(ctx, x, y, w, h, r);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }

  function drawDivider(ctx, left, right, y, color, dashed = false) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (dashed) ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.restore();
  }

  function drawInfoBox(ctx, x, y, w, label, text, labelColor, ink, lang, minH) {
    const lineHeight = 23;
    ctx.font = `500 17px ${lang === "en" ? "Georgia" : "Noto Serif SC"}, Noto Serif JP, Yu Mincho, serif`;
    const lines = wrapTextLines(ctx, text, w - 32, lang === "en" ? 4 : 5);
    const h = Math.max(minH, 50 + lines.length * lineHeight);
    fillRoundRect(ctx, x, y, w, h, 16, "rgba(184,36,29,.045)");
    ctx.fillStyle = labelColor;
    ctx.fillRect(x, y, 6, h);
    drawLeftText(ctx, label, x + 18, y + 15, 17, "900", labelColor);
    drawMultilineText(ctx, text, x + 18, y + 45, w - 36, lineHeight, 17, ink, lang === "en" ? "Georgia" : "Noto Serif SC", lang === "en" ? 4 : 5);
    return y + h;
  }

  function drawLeftText(ctx, text, x, y, size, weight = "400", color = "#111", family = "Noto Serif SC") {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${family}, Noto Serif JP, Yu Mincho, serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(String(text), x, y);
  }

  function drawRightText(ctx, text, x, y, size, weight = "400", color = "#111", family = "Noto Serif SC") {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${family}, Noto Serif JP, Yu Mincho, serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(String(text), x, y);
  }

  function drawMultilineRightText(ctx, text, right, y, maxWidth, lineHeight, size, weight = "400", color = "#111", family = "Noto Serif SC", maxLines = 2) {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${family}, Noto Serif JP, Yu Mincho, serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    wrapTextLines(ctx, text, maxWidth, maxLines).forEach((line, idx) => ctx.fillText(line, right, y + idx * lineHeight));
  }

  function drawMultilineText(ctx, text, x, y, maxWidth, lineHeight, size, color, family = "Noto Serif SC", maxLines = 4) {
    ctx.fillStyle = color;
    ctx.font = `500 ${size}px ${family}, Noto Serif JP, Yu Mincho, serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    wrapTextLines(ctx, text, maxWidth, maxLines).forEach((line, idx) => ctx.fillText(line, x, y + idx * lineHeight));
  }

  function wrapTextLines(ctx, text, maxWidth, maxLines = 4) {
    const raw = String(text || "").replace(/\s+/g, " ").trim();
    if (!raw) return [];
    const hasSpaces = /\s/.test(raw);
    const tokens = hasSpaces ? raw.split(/\s+/) : Array.from(raw);
    const lines = [];
    let line = "";
    tokens.forEach((token) => {
      const next = hasSpaces ? (line ? `${line} ${token}` : token) : `${line}${token}`;
      if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = token;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      const kept = lines.slice(0, maxLines);
      kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[。,.，、；;：:]*$/, "")}…`;
      return kept;
    }
    return lines;
  }

  function drawOwnershipWatermark(ctx, w, h) {
    void ctx;
    void w;
    void h;
  }

  function drawCenteredText(ctx, text, x, y, size, weight = "400", color = "#111", family = "Noto Serif SC, Noto Serif JP") {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${family}, Yu Mincho, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(text), x, y);
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, size, color, family = "Noto Serif JP") {
    ctx.fillStyle = color;
    ctx.font = `500 ${size}px ${family}, Noto Serif SC, Noto Serif JP, Yu Mincho, serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const words = String(text).split(/\s+/);
    let line = "";
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        y += lineHeight;
        line = word;
      } else {
        line = test;
      }
    });
    if (line) ctx.fillText(line, x, y);
  }

  function drawVerticalBlock(ctx, label, text, x, y, size, step, color, maxHeight) {
    drawVerticalText(ctx, label, x, y, size + 2, step, color, true, maxHeight);
    drawVerticalText(ctx, text, x - 42, y, size, step, color, false, maxHeight);
  }

  function drawVerticalText(ctx, text, x, y, size, step, color, bold = false, maxHeight = 1000) {
    ctx.fillStyle = color;
    ctx.font = `${bold ? "900" : "500"} ${size}px Noto Serif SC, Noto Serif JP, Yu Mincho, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const clean = String(text || "").replace(/\s+/g, "");
    let cx = x;
    let cy = y;
    for (const ch of clean) {
      if (cy + step > y + maxHeight) {
        cx -= step * 1.15;
        cy = y;
      }
      ctx.fillText(ch, cx, cy);
      cy += step;
    }
  }

  function pseudoRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function buildDrawSeed() {
    const count = Math.max(0, state.shakeCount);
    return `${state.sessionSalt}|shakes:${count}|items:${DATA.length}`;
  }

  function pickIndexBySeed(seed, length) {
    if (!length) return 0;
    return Math.floor(seededRandom(seed) * length) % length;
  }

  function seededRandom(seed) {
    let h = 2166136261;
    const text = String(seed);
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h += h << 13; h ^= h >>> 7;
    h += h << 3; h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
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
