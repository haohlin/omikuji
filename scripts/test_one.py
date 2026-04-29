#!/usr/bin/env python3
"""只生成 1 签测试"""
import sys
sys.path.insert(0, '.')
from scripts.gen_batch import gen_one, load_seed, load_fortunes
seed = load_seed()
fortunes = load_fortunes()
f2 = fortunes[1]  # 第 2 签
print(f"测试生成签 {f2['number']} ({f2['fortune']})...")
q = gen_one(f2["number"], f2["fortune"], seed[0])
import json
print(json.dumps(q, ensure_ascii=False, indent=2))
