#!/usr/bin/env python3
"""
Generate 100 omikuji signs using nvhub Claude Opus 4.7.
Each sign: 汉诗4句7言 + 吉凶断 + 现代中文白话 + 日文原文(候文风) + 英文译 + 7项分野(愿望/生意/恋爱/旅行/病気/失物/争事)。
Follows Sensō-ji 元三大师百签 structure.
Parallel with ThreadPoolExecutor (10 workers).
Resumable — caches each sign as JSONL line.
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
ASSIGN_FILE = DATA / "fortune_assignment.json"
CACHE_FILE = DATA / "omikuji_nvhub_cache.jsonl"
OUT_FILE = DATA / "omikuji.json"

# Load API key
with open(os.path.expanduser("~/.openclaw/openclaw.json")) as f:
    KEY = json.load(f)["models"]["providers"]["nvhub"]["apiKey"]

BASE = "https://inference-api.nvidia.com/v1"
MODEL = "azure/anthropic/claude-opus-4-7"

# Theme pool — to give variety across the 100 signs
THEMES = [
    "事业升迁", "婚姻缘分", "财运横财", "学业考试", "行旅远门", "疾病康复",
    "失物寻回", "官司诉讼", "添丁求子", "搬迁筑宅", "田产买卖", "求职面试",
    "人际和睦", "亲子关系", "创业初立", "合伙投资", "转职抉择", "旧识重逢",
    "求道修行", "风波止息",
]

SYSTEM_PROMPT = """你是一位熟悉日本浅草寺元三大师百签（観音百籤 / 元三大師御籤）的签文作者。
你要生成一首完全符合传统形制的签文，遵循以下规则：

1. **汉诗**：标准七言绝句（4句×7字），押韵、合平仄、起承转合。用意要贴合指定的签号寓意和吉凶判。
2. **日文原文**：古典候文风格（〜なり／〜べし／〜まじ），短小庄重，不用现代日文口语。
3. **英文翻译**：庄重诗体英文（不是白话），押韵可选，能传递签文氛围。
4. **现代中文白话**：一句话点出此签核心寓意（20-40字）。
5. **七项分野**：愿望(願事)/生意(商売)/恋爱(恋愛)/旅行(旅行)/病気(病気)/失物(失物)/争事(争事)——每项一句话判断（10-25字），要和总体吉凶一致。

输出严格 JSON，不要任何前后说明文字。结构：
{
  "poem_zh": ["七言第一句。", "七言第二句。", "七言第三句。", "七言第四句。"],
  "poem_ja": "候文一两句",
  "poem_en": "Poetic English rendering.",
  "summary_zh": "现代中文白话一句话",
  "aspects": {
    "wish": "…", "business": "…", "love": "…", "travel": "…",
    "health": "…", "lost": "…", "dispute": "…"
  }
}"""

def prompt_for(number: int, fortune: str, theme: str) -> str:
    return f"""生成浅草寺元三大师百签的第 {number} 签。

**吉凶判**：{fortune}
**主题倾向**：{theme}

吉凶对应氛围：
- 大吉 = 极佳，万事顺遂，喜从天降
- 吉 = 良好，持正可得
- 半吉 = 利弊参半，需守正
- 小吉 = 小利，不宜大举
- 末吉 = 先苦后甜，终有转机
- 末小吉 = 微末之利，守静为上
- 凶 = 不利，宜戒慎，静待时机

严格输出 JSON，无其他文字。"""

def call_one(number: int, fortune: str, max_retries=3):
    theme = THEMES[(number - 1) % len(THEMES)]
    body = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt_for(number, fortune, theme)},
        ],
        "max_tokens": 1500,
    }
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(
                f"{BASE}/chat/completions",
                data=json.dumps(body).encode(),
                headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=120) as r:
                resp = json.loads(r.read())
            content = resp["choices"][0]["message"]["content"].strip()
            # Strip possible fencing
            if content.startswith("```"):
                content = content.split("```", 2)[1]
                if content.lstrip().startswith("json"):
                    content = content.lstrip()[4:]
                content = content.rsplit("```", 1)[0].strip()
            data = json.loads(content)
            # Validate
            assert "poem_zh" in data and len(data["poem_zh"]) == 4
            assert "poem_ja" in data and "poem_en" in data
            assert "aspects" in data and len(data["aspects"]) >= 5
            return {"number": number, "fortune": fortune, "theme": theme, **data}
        except Exception as e:
            if attempt == max_retries - 1:
                return {"number": number, "fortune": fortune, "theme": theme, "_error": str(e)}
            time.sleep(2 ** attempt)

def load_cache():
    done = {}
    if CACHE_FILE.exists():
        for line in CACHE_FILE.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                if "_error" not in rec:
                    done[rec["number"]] = rec
            except Exception:
                pass
    return done

def main():
    assignments = json.load(ASSIGN_FILE.open())
    done = load_cache()
    print(f"[gen] total={len(assignments)} cached={len(done)}", flush=True)

    todo = [a for a in assignments if a["number"] not in done]
    print(f"[gen] todo={len(todo)}", flush=True)

    t0 = time.time()
    completed = len(done)
    with CACHE_FILE.open("a") as cache_fh:
        with ThreadPoolExecutor(max_workers=10) as ex:
            futures = {ex.submit(call_one, a["number"], a["fortune"]): a for a in todo}
            for fut in as_completed(futures):
                res = fut.result()
                cache_fh.write(json.dumps(res, ensure_ascii=False) + "\n")
                cache_fh.flush()
                completed += 1
                if "_error" in res:
                    print(f"[gen] ❌ #{res['number']} ({res['fortune']}) — {res['_error'][:80]}", flush=True)
                else:
                    first_line = res["poem_zh"][0]
                    print(f"[gen] ✅ {completed}/100  #{res['number']:3d} {res['fortune']:3s}  {first_line}", flush=True)

    # Reload cache + write final omikuji.json
    final = []
    done = load_cache()
    for a in assignments:
        n = a["number"]
        if n in done:
            final.append(done[n])
        else:
            # Shouldn't happen but guard
            final.append({"number": n, "fortune": a["fortune"], "_missing": True})

    # Sort by number
    final.sort(key=lambda x: x["number"])
    OUT_FILE.write_text(json.dumps(final, ensure_ascii=False, indent=2))
    elapsed = time.time() - t0
    ok = sum(1 for x in final if "_error" not in x and "_missing" not in x)
    print(f"[gen] DONE in {elapsed:.1f}s — {ok}/100 succeeded, saved to {OUT_FILE}", flush=True)

if __name__ == "__main__":
    main()
