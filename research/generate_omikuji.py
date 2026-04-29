#!/usr/bin/env python3
"""
100 签 AI 生成脚本 — 用 nvhub Claude Opus 4.7，10 签/批 × 10 批，并发 5 路。
输出: ~/dev/omikuji/data/omikuji.json
"""
import json, os, sys, time, concurrent.futures, pathlib, random
from openai import OpenAI

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)

# 读 key
cfg = json.load(open(os.path.expanduser("~/.openclaw/openclaw.json")))
KEY = cfg["models"]["providers"]["nvhub"]["apiKey"]
BASE = cfg["models"]["providers"]["nvhub"]["baseUrl"]

client = OpenAI(base_url=BASE, api_key=KEY)
MODEL = "azure/anthropic/claude-opus-4-7"

# 加载分配表
assignments = json.load(open(DATA / "fortune_assignment.json"))

SYSTEM_PROMPT = """あなたは日本の伝統的な御神籤（おみくじ）の創作専門家です。浅草寺の元三大師百籤のスタイルを忠実に模倣してください。

【生成する御神籤の仕様】
- 形式：五言絶句（四句、各句五字の漢詩）、古典中国語で書かれる（元三大師百籤の伝統形式）
- 各句の意味は運勢レベルに合致すること
- 読み下し文（日本語訳）と意味解説を添えること
- 七項目の具体的な運勢：願事、恋愛、仕事、健康、旅行、失物、待人
- 運勢レベルの重さ：大吉＞吉＞半吉＞小吉＞末小吉＞末吉＞凶
- 凶の場合は暗い内容、大吉の場合は明るい内容、真面目で古風な文体で

【出力形式】厳密な JSON 配列のみ。前後に説明やマークダウンを付けず、JSON のみ出力。
"""

BATCH_TEMPLATE = """以下 {n} 個の御神籤を生成してください。それぞれの番号と運勢は指定通り：

{spec}

各御神籤について、以下の JSON スキーマで出力：
{{
  "number": <番号>,
  "fortune": "<指定された運勢>",
  "poem_ja": "五言絶句の漢詩原文（漢字 20 字、全角スペース無し、例：'花開春又盡 月缺夜還明 ...' のような四句）",
  "poem_reading": "日本語の読み下し文",
  "meaning_ja": "詩の意味解説（日本語、100-150 字）",
  "meaning_zh": "诗的意思解说（简体中文，100-150 字）",
  "meaning_en": "Poem meaning explanation (English, 80-120 words)",
  "details": {{
    "願事": {{"ja":"（願いごとについて 30-50 字）", "zh":"（愿望 20-35 字）", "en":"(wishes, 15-25 words)"}},
    "恋愛": {{"ja":"（恋愛について 30-50 字）", "zh":"（恋爱 20-35 字）", "en":"(love, 15-25 words)"}},
    "仕事": {{"ja":"（仕事について 30-50 字）", "zh":"（工作 20-35 字）", "en":"(work, 15-25 words)"}},
    "健康": {{"ja":"（健康について 30-50 字）", "zh":"（健康 20-35 字）", "en":"(health, 15-25 words)"}},
    "旅行": {{"ja":"（旅行について 30-50 字）", "zh":"（旅行 20-35 字）", "en":"(travel, 15-25 words)"}},
    "失物": {{"ja":"（失せ物について 30-50 字）", "zh":"（失物 20-35 字）", "en":"(lost items, 15-25 words)"}},
    "待人": {{"ja":"（待ち人について 30-50 字）", "zh":"（等人 20-35 字）", "en":"(awaited person, 15-25 words)"}}
  }}
}}

【重要】JSON 配列のみ出力。コードブロックや説明を付けない。指定された番号・運勢を厳守。
"""

def build_batch_prompt(batch):
    spec = "\n".join(f"- 第{a['number']}番 — {a['fortune']}" for a in batch)
    return BATCH_TEMPLATE.format(n=len(batch), spec=spec)

def call_llm(batch, attempt=1, max_attempts=3):
    prompt = build_batch_prompt(batch)
    try:
        r = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=8000,
        )
        raw = r.choices[0].message.content.strip()
        # 剥掉可能的 ```json
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip("` \n")
        data = json.loads(raw)
        # 校验
        assert isinstance(data, list), "not a list"
        assert len(data) == len(batch), f"expected {len(batch)} got {len(data)}"
        expected_nums = {a["number"] for a in batch}
        got_nums = {d["number"] for d in data}
        assert expected_nums == got_nums, f"number mismatch: {expected_nums} vs {got_nums}"
        for d, a in zip(sorted(data, key=lambda x: x["number"]),
                        sorted(batch, key=lambda x: x["number"])):
            assert d["fortune"] == a["fortune"], f"#{d['number']} fortune mismatch"
            for k in ["poem_ja", "poem_reading", "meaning_ja", "meaning_zh", "meaning_en", "details"]:
                assert k in d, f"#{d['number']} missing {k}"
            for dk in ["願事","恋愛","仕事","健康","旅行","失物","待人"]:
                assert dk in d["details"], f"#{d['number']} missing detail {dk}"
                for lang in ["ja","zh","en"]:
                    assert lang in d["details"][dk], f"#{d['number']} {dk} missing {lang}"
        return data
    except Exception as e:
        print(f"[batch {batch[0]['number']}-{batch[-1]['number']}] attempt {attempt} failed: {e}", flush=True)
        if attempt < max_attempts:
            time.sleep(2 ** attempt)
            return call_llm(batch, attempt+1, max_attempts)
        raise

def main():
    # 已生成的缓存（断点续跑）
    cache_file = DATA / "omikuji_nvhub_cache.jsonl"
    done_nums = set()
    if cache_file.exists():
        with open(cache_file) as f:
            for line in f:
                try:
                    d = json.loads(line)
                    done_nums.add(d["number"])
                except Exception:
                    pass
        print(f"Resume: {len(done_nums)}/100 already generated", flush=True)

    # 分批（每批 10 签）
    remaining = [a for a in assignments if a["number"] not in done_nums]
    batches = [remaining[i:i+10] for i in range(0, len(remaining), 10)]
    print(f"Batches to run: {len(batches)} × ~10", flush=True)

    # 并发 5 路
    with open(cache_file, "a", encoding="utf-8") as cache:
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
            futs = {ex.submit(call_llm, b): b for b in batches}
            for fut in concurrent.futures.as_completed(futs):
                b = futs[fut]
                try:
                    data = fut.result()
                    for d in data:
                        cache.write(json.dumps(d, ensure_ascii=False) + "\n")
                    cache.flush()
                    print(f"  ✅ batch #{b[0]['number']}-#{b[-1]['number']} ({len(data)} signs)", flush=True)
                except Exception as e:
                    print(f"  ❌ batch #{b[0]['number']}-#{b[-1]['number']} — {e}", flush=True)

    # 从缓存组装最终 JSON
    all_signs = []
    with open(cache_file) as f:
        for line in f:
            try:
                all_signs.append(json.loads(line))
            except Exception:
                pass
    # 去重（按 number 取最新）
    seen = {}
    for s in all_signs:
        seen[s["number"]] = s
    final = [seen[i] for i in sorted(seen.keys())]
    print(f"\nFinal count: {len(final)}/100", flush=True)
    with open(DATA / "omikuji_nvhub.json", "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=2)
    print(f"Saved to {DATA / 'omikuji_nvhub.json'}", flush=True)
    return len(final)

if __name__ == "__main__":
    n = main()
    sys.exit(0 if n == 100 else 1)
