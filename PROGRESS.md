# Omikuji 项目进度 & 交接

**最后更新**: 2026-04-29 11:45 (Haohan Lin + Bear)
**GitHub**: https://github.com/haohlin/omikuji
**Live URL**: https://haohlin.github.io/omikuji/
**本地路径**: `~/dev/omikuji/`

---

## 🎯 项目目标

日式寺庙摇签 Web 体验，面向普通用户（趴趴熊说"就想要一个可以给大家用的抽签工具，内容基于日式抽签的内容"）。

- 100 支签文（元三大师 / 观音百签体系）
- 仪式感 UI：鸟居 → 签筒摇动 → 抽出签棒 → 展开签纸
- 汉诗四句 + 吉凶 + 解签 + 7 分野
- 中 / 日 / 英三语
- Web Audio 合成签筒声/铃声
- 移动端友好
- GitHub Pages 公开分享

---

## ✅ 已完成

### 1. 数据（100% 完成）
- [x] `research/SPEC.md` — 产品规格
- [x] `data/fortune_assignment.json` — 100 签吉凶分布（大吉 16, 吉 30, 中吉/小吉/末吉等）
- [x] `data/omikuji_seed.json` — 第 1 签完整样板（手写）
- [x] `scripts/gen_batch.py` — chipnemo API 批量生成脚本
- [x] `scripts/test_one.py` — 单签测试
- [x] **`data/omikuji.json` (134 KB, 100 签完整)** — 通过 chipnemo 批量生成
- [x] **`data/omikuji.js` (218 KB)** — wrap 成 `window.OMIKUJI = [...]` 供前端直接 `<script>` 引用
- [x] 签文字段：`number, fortune, poem_ja, poem_reading, meaning_ja, meaning_zh, meaning_en, details`

### 2. 骨架 & 仓库
- [x] `index.html` (3.8 KB) — 4-stage 完整骨架：intro(鸟居) → shake(签筒) → stick(抽签) → paper(签纸)
  - 语言切换按钮 (中/日/EN)
  - `data-i18n` 属性齐全
  - 引用 `style.css`, `data/omikuji.js`, `app.js`
  - 字体：Noto Serif JP / Ma Shan Zheng / ZCOOL KuaiLe (Google Fonts)
- [x] `README.md`
- [x] `.gitignore`, `.nojekyll`
- [x] Git repo 初始化 + 首次 commit + push
- [x] GitHub Pages 开启（legacy build, main branch, root）

### 3. 环境
- [x] `assets/{fonts,images,sounds}` 目录结构已建
- [x] 扁平化到 root（不用 `src/` 子目录，Pages 直接指向 root）

---

## ❌ 未完成 / 下一步

### 🔴 立刻要做（核心 UI 缺失，当前 Pages 只有骨架）

- [ ] **`style.css`** — 完整视觉
  - 鸟居（朱红色，柱 + 横梁 + 笠木）
  - 签筒（木纹六角筒 + 摇晃动画）
  - 签棒（细长、刻字）
  - 签纸（米黄纸感 + 毛笔字 + 朱印）
  - 樱花飘落 canvas 背景层
  - 4 stage 切换过渡（fade / slide）
  - 移动端响应式
  - 中日英字体家族切换

- [ ] **`app.js`** — 交互逻辑
  - 语言切换（更新所有 `data-i18n` 文本）
  - Stage 切换
  - 摇签交互：
    - `devicemotion` 监听晃手机
    - 桌面 fallback：点击/连按计数
    - 摇够 N 次（建议 8）→ 显示"抽签"按钮
  - 抽签：从 `window.OMIKUJI` 随机选一支，填入 paper
  - 签纸翻页动画
  - 分享（Web Share API / 复制链接）
  - "再抽"重置流程

- [ ] **Web Audio 音效**（在 app.js 里）
  - 签筒摇晃（竹 + 木撞击合成）
  - 抽出签棒的清脆声
  - 展开签纸的纸响
  - 完成时的铃铛
  - 全部用 `AudioContext` 合成，不用音频文件

- [ ] Push → GitHub Pages 自动部署
- [ ] 测试移动端
- [ ] 更新 README（加截图/GIF）
- [ ] 交付最终分享链接给趴趴熊

---

## 🛠️ 已知坑 & 约束

1. **Slack 响应截断**：当前 session `max_tokens=4096` 不够。已在 `~/.hermes/config.yaml` 把 chipnemo 的 `max_tokens` 加到 `32768`，**但需要重启 gateway 才生效**。新 session 就没这问题。
2. **API key**：`$CHIPNEMO_API_KEY` 环境变量，config 里用 `${CHIPNEMO_API_KEY}` 引用，**不要动**。
3. **chipnemo 参数**：不能传 `temperature`（会 500）。只用 `max_tokens` + `messages`。
4. **GitHub Pages 延迟**：push 后 1-2 分钟才反映，别慌。
5. **`skill_view` 大 skill 会触发截断**：直接用 `gh`/`git` 命令，不要 full-load `github-*` skill。

---

## 🎨 设计参考

- 参考：元三大師おみくじ（比叡山・延暦寺）、浅草寺観音百籤
- 主色：朱红 `#b8241d`（鸟居）、墨黑 `#1a1a1a`（字）、米黄 `#f4ebd0`（纸）、樱粉 `#f8c8d4`（点缀）
- 字体：
  - 日文 → `Noto Serif JP 900`
  - 中文诗句 → `Ma Shan Zheng`（毛笔）
  - 中文普通 → `Noto Serif SC`
  - 英文 → `Cormorant Garamond` 或默认 serif

---

## 📁 当前文件树

```
~/dev/omikuji/
├── .git/
├── .gitignore
├── .nojekyll
├── README.md
├── PROGRESS.md                 ← 这个文件
├── index.html                  ← 3.8 KB，骨架完成
├── assets/
│   ├── fonts/    (空)
│   ├── images/   (空)
│   └── sounds/   (空，改用 Web Audio 合成)
├── data/
│   ├── fortune_assignment.json (4.9 KB)
│   ├── omikuji_seed.json       (2.3 KB)
│   ├── omikuji.json            (134 KB ← 100 签源数据)
│   └── omikuji.js              (218 KB ← window.OMIKUJI wrapper，前端用这个)
├── research/                   (SPEC.md + 参考 HTML 爬取)
└── scripts/
    ├── gen_batch.py
    ├── gen_batch.log
    └── test_one.py
```
