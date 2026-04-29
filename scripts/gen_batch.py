#!/usr/bin/env python3
"""
gen_batch.py - 用 chipnemo 批量生成 omikuji 签文 2-100
- 读 data/fortune_assignment.json 拿每签的 fortune 等级
- 读 data/omikuji_seed.json 作为第 1 签样板（few-shot）
- 每生成 1 签立即写入 data/omikuji.json（逐个 append，断点续跑）
- 每 10 签打印进度
"""
import os, json, sys, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA = ROOT / "data"
OUT = DATA / "omikuji.json"
FORTUNE_FILE = DATA / "fortune_assignment.json"
SEED_FILE = DATA / "omikuji_seed.json"

BASE = "https://chipnemo-models-api.nvidia.com/v1/internal/chipnemo/claude-opus-4-7"
MODEL = "anthropic/claude-opus-4.7"
KEY = os.environ["CHIPNEMO_API_KEY"]

SYSTEM = """你是浅草寺元三大师百签的签文撰写者。输出严格 JSON，无 markdown 代码块，无任何多余文字。

每签包含：
- number: 签号（int）
- fortune: 运势（已给定，照抄）
- poem_ja: 4 句汉诗，繁体字，每句 5 或 7 字，用 \\n 分隔
- poem_reading: 平假名训读（4 段用全角空格　分隔）
- meaning_ja: 文言日文解签（用「べし」「なり」「勿れ」「何となれば」等古典助动词），2-4 句，40-80 字
- meaning_zh: 半文半白中文解签，2-4 句，30-60 字
- meaning_en: 诗意英文解签，2-3 句
- details: 對象為 願事/恋愛/仕事/健康/旅行/失物/待人 共 7 项，每项 {ja, zh, en}，每语一句话 20-30 字

运势基调：
- 大吉: 极好，福禄至
- 吉: 好运但需努力
- 半吉: 先难后易
- 小吉: 小有所得
- 末小吉: 末段小成
- 末吉: 迟吉，耐心
- 凶: 警诫，修身避祸

诗境要古雅，贴近中国古诗意象（山水、花月、舟楫、鸟兽、神佛、草木），每签意象不同，避免重复。"""

def load_seed():
    with open(SEED_FILE) as f:
        return json.load(f)

def load_fortunes():
    with open(FORTUNE_FILE) as f:
        return json.load(f)

def load_existing():
    if OUT.exists():
        with open(OUT) as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save(data):
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def call_chipnemo(messages, max_tokens=2000):
    body = json.dumps({
        "model": MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())["choices"][0]["message"]["content"]

def gen_one(number, fortune, seed_sample):
    user_prompt = f"""參考第 1 籤樣例，生成第 {number} 籤（運勢：{fortune}）。

第 1 籤樣例（輸出格式參照）：
{json.dumps(seed_sample, ensure_ascii=False, indent=2)}

現在請生成第 {number} 籤（運勢：{fortune}）。只輸出 JSON，無 markdown。意象要與樣例不同。"""
    for attempt in range(3):
        try:
            raw = call_chipnemo([
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": user_prompt},
            ])
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()
            obj = json.loads(raw)
            obj["number"] = number
            obj["fortune"] = fortune
            required = {"poem_ja", "poem_reading", "meaning_ja", "meaning_zh", "meaning_en", "details"}
            if not required.issubset(obj.keys()):
                raise ValueError(f"missing keys: {required - obj.keys()}")
            det = obj["details"]
            for k in ["願事","恋愛","仕事","健康","旅行","失物","待人"]:
                if k not in det or not all(lang in det[k] for lang in ["ja","zh","en"]):
                    raise ValueError(f"details.{k} incomplete")
            return obj
        except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError, ValueError) as e:
            print(f"  [签 {number}] attempt {attempt+1} failed: {type(e).__name__}: {str(e)[:120]}")
            time.sleep(2 ** attempt)
    raise RuntimeError(f"签 {number} 生成失败（3 次重试）")

def main():
    seed = load_seed()
    seed_sample = seed[0]
    fortunes = load_fortunes()
    existing = load_existing()
    # 第 1 签用 seed
    if not existing:
        existing = [seed_sample]
    done_nums = {q["number"] for q in existing}
    print(f"已完成：{len(done_nums)} / 100，继续...")

    for f in fortunes:
        n = f["number"]
        if n in done_nums:
            continue
        t0 = time.time()
        try:
            q = gen_one(n, f["fortune"], seed_sample)
        except Exception as e:
            print(f"❌ 签 {n} 彻底失败: {e}")
            break
        existing.append(q)
        existing.sort(key=lambda x: x["number"])
        save(existing)
        elapsed = time.time() - t0
        print(f"✅ 签 {n:3d} [{f['fortune']:4s}] {elapsed:.1f}s  → 累计 {len(existing)}/100")

    print(f"\n完成：{len(existing)}/100")

if __name__ == "__main__":
    main()
