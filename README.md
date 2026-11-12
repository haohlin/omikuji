# おみくじ · Omikuji

日式寺庙摇签 Web 体验 — 100 支签文，中日英三语，鸟居 / 签筒 / 毛笔字 / 樱花。

**体验地址:** https://haohlin.github.io/omikuji/

## 特色

- 🎋 100 支签文（元三大师 / 观音百签体系）
- 🏯 仪式感 UI：鸟居 → 签筒摇动 → 抽出签棒 → 展开签纸
- 🌸 汉诗四句 + 吉凶 + 解签 + 9 分野（愿望/恋爱/事业/健康/旅行/失物/待人/方位/胜负）
- 🖼️ 两种签纸版式（稻荷纸签 / 卡片版），可保存为图片或分享
- 🌏 中 / 日 / 英 三语切换
- 🔊 Web Audio 合成签筒摇晃声 + 铃音
- 📱 移动端友好

## 技术栈

纯静态 HTML/CSS/JS，无构建，无 JS 依赖（字体经 Google Fonts 加载），GitHub Pages 直出。

签文由 NVIDIA chipnemo (Claude Opus 4.7) 基于《元三大師百籤》《觀音百籤》传统体系生成，保留汉诗风格。

## 本地开发

```bash
git clone https://github.com/haohlin/omikuji.git
cd omikuji
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 许可

MIT
