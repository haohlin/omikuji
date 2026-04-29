#!/usr/bin/env python3
"""
Background task: Deep-scrape authentic Sensō-ji 100 omikuji from multiple Japanese sources.
Goal: produce ~/dev/omikuji/data/omikuji_ja_authentic.json with as many real signs as possible.
"""
import re
import json
import time
import urllib.request
import urllib.parse
from pathlib import Path
from html.parser import HTMLParser
from html import unescape

ROOT = Path(__file__).parent
OUT = ROOT.parent / "data" / "omikuji_ja_authentic.json"
LOG = ROOT / "scrape_log.txt"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

def log(msg):
    ts = time.strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG, "a") as f:
        f.write(line + "\n")

def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ja,en;q=0.9"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        for enc in ("shift_jis", "euc-jp", "cp932"):
            try: return raw.decode(enc)
            except: pass
        return raw.decode("utf-8", errors="ignore")

class TextExtract(HTMLParser):
    def __init__(s): super().__init__(); s.t=[]; s.sk=0
    def handle_starttag(s,t,a):
        if t in ("script","style","nav","footer","header"): s.sk += 1
    def handle_endtag(s,t):
        if t in ("script","style","nav","footer","header"): s.sk -= 1
    def handle_data(s,d):
        if not s.sk: s.t.append(d)

def html2text(html):
    p = TextExtract(); p.feed(html)
    text = unescape(" ".join(p.t))
    return re.sub(r"\s+", " ", text).strip()

# ====== Candidate sources for authentic 元三大師百籤 / 浅草寺おみくじ ======
CANDIDATES = [
    # Public-domain Buddhist canon references
    "https://21dzk.l.u-tokyo.ac.jp/SAT/",
    # Known omikuji archive sites (community transcriptions)
    "https://www.daikokusan.or.jp/omikuji/",
    "https://rindou.com/omikuji/",
    "https://www.asakusajinja.jp/omikuji/",
    # Academic/personal transcriptions
    "https://reikigaku.com/ganzandaishi/",
    "https://temple.nichiren.or.jp/omikuji/",
    # Wikisource/Wikimedia potential paths
    "https://ja.wikisource.org/wiki/%E8%A7%80%E9%9F%B3%E7%B1%A4",
    "https://zh.wikisource.org/wiki/%E8%A7%80%E9%9F%B3%E9%9D%88%E7%B1%A4",
    "https://zh.wikisource.org/wiki/%E8%A7%80%E9%9F%B3%E7%B1%A4",
    # Sensō-ji specific
    "https://www.senso-ji.jp/annual_event/",
]

# Search engines (DuckDuckGo HTML — no API needed)
SEARCH_QUERIES = [
    "元三大師百籤 第一番 大吉 全文",
    "浅草寺 おみくじ 100番 凶 全文",
    "観音籤 百番 漢詩 一覧",
    "元三大師御籤本 全文",
]

def ddg_search(q):
    """DuckDuckGo HTML endpoint search — no API key."""
    url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(q)
    try:
        html = fetch(url, timeout=20)
        # extract result URLs
        urls = re.findall(r'href="(https?://[^"]+)"', html)
        # filter out ddg-internal
        urls = [u for u in urls if "duckduckgo" not in u and "google" not in u][:10]
        return urls
    except Exception as e:
        log(f"search failed {q}: {e}")
        return []

def looks_like_omikuji_content(text):
    """Heuristic: does this page contain omikuji content?"""
    markers = ["第一番", "第二番", "第一百番", "大吉", "元三大師", "五言四句", "願事", "待人", "失物"]
    hits = sum(1 for m in markers if m in text)
    return hits >= 3

def main():
    log("=" * 60)
    log("Background scrape started (authentic 100 omikuji)")

    collected = []  # list of dicts {source, text, url}
    seen_urls = set()

    # Step 1: try direct candidates
    log(f"Step 1: trying {len(CANDIDATES)} direct candidates")
    for url in CANDIDATES:
        if url in seen_urls: continue
        seen_urls.add(url)
        try:
            html = fetch(url, timeout=15)
            text = html2text(html)
            if looks_like_omikuji_content(text):
                log(f"HIT: {url} ({len(text)} chars)")
                collected.append({"source": url, "text": text})
            else:
                log(f"skip: {url} (no markers)")
        except Exception as e:
            log(f"fail: {url} — {e}")
        time.sleep(1)

    # Step 2: DuckDuckGo searches
    log(f"Step 2: running {len(SEARCH_QUERIES)} searches")
    for q in SEARCH_QUERIES:
        log(f"  search: {q}")
        urls = ddg_search(q)
        log(f"    got {len(urls)} results")
        for url in urls:
            if url in seen_urls: continue
            seen_urls.add(url)
            try:
                html = fetch(url, timeout=15)
                text = html2text(html)
                if looks_like_omikuji_content(text):
                    log(f"    HIT: {url}")
                    collected.append({"source": url, "text": text})
            except Exception as e:
                pass
            time.sleep(0.5)
        time.sleep(2)

    log(f"Total candidate pages found: {len(collected)}")

    # Step 3: extract per-sign structured data
    # Pattern: 第X番 ... 大吉/吉/... ... 漢詩 ... 解釈 ...
    signs = {}  # {number: {...}}

    number_patterns = [
        r"第\s*([一二三四五六七八九十百壱弐参肆伍陸漆捌玖拾廿卅卌]+|\d+)\s*番",
    ]
    kanji_map = {
        "一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9,"十":10,
        "百":100,"壱":1,"弐":2,"参":3,"拾":10,
    }
    def kanji2num(s):
        if s.isdigit(): return int(s)
        # simple handling up to 100
        if s == "百": return 100
        if "十" in s:
            parts = s.split("十")
            tens = 1 if parts[0] == "" else kanji_map.get(parts[0], 0)
            ones = 0 if parts[1] == "" else kanji_map.get(parts[1], 0)
            return tens * 10 + ones
        if "百" in s:
            return 100  # simplified
        return kanji_map.get(s, -1)

    for page in collected:
        text = page["text"]
        # split by 第N番
        chunks = re.split(r"(第\s*[一二三四五六七八九十百壱弐参肆伍陸漆捌玖拾\d]+\s*番)", text)
        # chunks[0] = preamble, then alternating (marker, body)
        for i in range(1, len(chunks)-1, 2):
            marker = chunks[i]
            body = chunks[i+1][:2000]  # cap
            m = re.search(r"([一二三四五六七八九十百壱弐参肆伍漆捌玖拾\d]+)", marker)
            if not m: continue
            num = kanji2num(m.group(1))
            if num < 1 or num > 100: continue
            fortune_match = re.search(r"(大吉|半吉|末小吉|末吉|小吉|吉|大凶|凶)", body)
            fortune = fortune_match.group(1) if fortune_match else None
            if num not in signs:
                signs[num] = {"number": num, "fortune": fortune, "raw_body": body, "sources": [page["source"]]}
            else:
                signs[num]["sources"].append(page["source"])

    log(f"Extracted signs: {len(signs)}/100")
    log(f"Numbers covered: {sorted(signs.keys())[:20]} ... {sorted(signs.keys())[-5:] if signs else []}")

    # Save
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({
            "meta": {
                "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "total_found": len(signs),
                "source_pages": len(collected),
                "note": "Scraped candidates for authentic Sensō-ji / Ganzan Daishi Hyakusen omikuji. Manual review required.",
            },
            "signs": [signs[k] for k in sorted(signs.keys())],
            "raw_pages": [{"source": p["source"], "preview": p["text"][:1500]} for p in collected],
        }, f, ensure_ascii=False, indent=2)

    log(f"Saved to {OUT}")
    log("Background scrape done")

if __name__ == "__main__":
    main()
