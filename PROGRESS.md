# Omikuji 项目进度 & 交接

**最后更新**: 2026-11-12
**GitHub**: https://github.com/haohlin/omikuji
**Live URL**: https://haohlin.github.io/omikuji/

## 项目目标

日式寺庙摇签 Web 体验，面向普通用户：鸟居 → 签筒摇动 → 抽出签棒 → 展开签纸。中 / 日 / 英三语，纯静态页面，GitHub Pages 发布（main 分支，根目录）。

## 已完成

### 数据

- `data/omikuji.json` — 100 签源数据，由 `scripts/gen_batch.py` 逐签生成（样板为 `data/omikuji_seed.json`，吉凶分配为 `data/fortune_assignment.json`）
- `data/omikuji.js` — 前端实际加载的文件，内容是 `window.OMIKUJI = <omikuji.json 的单行 JSON>;`
- 字段：`number, fortune, poem_ja, poem_reading, meaning_ja, meaning_zh, meaning_en, details`
- `details` 含 7 个分野（願事 / 恋愛 / 仕事 / 健康 / 旅行 / 失物 / 待人），`app.js` 再按签号和吉凶补出 方角 / 勝負，页面共显示 9 项
- 吉凶分布：吉 35，凶 30，大吉 17，末吉 6，半吉 5，小吉 4，末小吉 3

改动 `omikuji.json` 后，用下面的命令重新生成 `omikuji.js`：

```bash
python3 -c "import json;d=json.load(open('data/omikuji.json',encoding='utf-8'));open('data/omikuji.js','w',encoding='utf-8').write('window.OMIKUJI = '+json.dumps(d,ensure_ascii=False)+';')"
```

### 前端

- `index.html` — 四个 stage：intro（鸟居）→ shake（签筒）→ stick（签棒）→ paper（签纸）
- `style.css` — 全部视觉；签纸有两种版式：`reference`（稻荷纸签）和 `card`（卡片版，默认）
- `app.js` — 单文件，按段落组织：启动与事件 / 语言、版式与 stage / 摇签与抽签 / 调试选签 / 签文文本 / 签纸渲染 / 分享与图片导出 / Canvas 基础绘制 / 音效 / 樱花
- 摇签：`devicemotion` 或点击签筒；抽签结果由会话盐值和摇动次数决定
- 分享：Canvas 生成签纸 PNG，优先走系统分享，否则下载图片，最后退回复制链接
- 音效全部用 Web Audio 合成，无音频文件

发布时同步修改 `index.html` 里 `style.css` 和 `app.js` 的 `?v=` 参数，避免浏览器缓存旧文件。

## 未完成

- [ ] README 加截图 / GIF
- [ ] `.paper-inner` 引用的 `paperOpen` 动画没有对应的 `@keyframes`，签纸展开动画目前不生效

## 数据生成脚本

- `scripts/gen_batch.py` — 生成现有 `data/omikuji.json` 的脚本
- `scripts/test_one.py` — 单签测试
- `research/generate_omikuji.py`、`research/gen_omikuji_final.py`、`research/scrape_real_100.py` — 早期尝试，未产出现有数据。`gen_omikuji_final.py` 的输出路径是 `data/omikuji.json` 且字段结构不同，运行会覆盖现有数据

## 设计参考

- 参考：元三大師おみくじ（比叡山・延暦寺）、浅草寺観音百籤
- 主色：朱红 `#b8241d`（鸟居）、墨色 `#1a1714`（正文）、`#111`（签纸文字）
- 字体：Noto Serif SC（中文）、Noto Serif JP（日文）、Georgia（英文），前两者经 Google Fonts 加载

## 文件树

```
omikuji/
├── index.html
├── style.css
├── app.js
├── README.md
├── PROGRESS.md
├── .gitignore
├── .nojekyll
├── data/
│   ├── omikuji.js              ← 前端加载
│   ├── omikuji.json            ← 源数据
│   ├── omikuji_seed.json
│   └── fortune_assignment.json
├── scripts/
│   ├── gen_batch.py
│   └── test_one.py
└── research/                   (SPEC.md、早期脚本、参考页面抓取)
```
