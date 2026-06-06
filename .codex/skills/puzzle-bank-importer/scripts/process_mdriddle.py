"""
Process MDRiddle dataset + hand-crafted puzzles.
Extract, transform, deduplicate, and output puzzles matching the existing schema.
"""
import json
import openpyxl
import os
import random
import re
import sqlite3
import sys

import sys
if len(sys.argv) > 1:
    BASE = sys.argv[1]
else:
    BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXTRACTED = os.path.join(BASE, "mdriddle_data", "extracted", "Classified_annotation_Data")
OUTPUT = os.path.join(BASE, "new_puzzles.json")

# ── Hand-crafted logic and number pattern puzzles ──
HAND_CRAFTED = [
    # Logic puzzles
    {"type": "logic", "difficulty": "easy",
     "question": "小明比小红大2岁，小红比小刚大1岁。小明比小刚大几岁？",
     "answer": "3岁", "acceptedAnswers": ["3岁", "三岁", "3"],
     "explanation": "小明-小红=2，小红-小刚=1，相加得小明-小刚=3岁。"},
    {"type": "logic", "difficulty": "easy",
     "question": "教室里有10盏灯，关了3盏，还剩几盏？",
     "answer": "10盏", "acceptedAnswers": ["10盏", "10", "十盏"],
     "explanation": "灯的数量没有变，仍然有10盏灯。关掉不代表灯消失了。"},
    {"type": "logic", "difficulty": "easy",
     "question": "树上有8只鸟，猎人开枪打死1只，树上还剩几只？",
     "answer": "0只", "acceptedAnswers": ["0只", "0", "零只", "没有"],
     "explanation": "枪声会把其他鸟全部吓飞，所以树上没有鸟了。"},
    {"type": "logic", "difficulty": "medium",
     "question": "3个人3天喝3桶水，9个人9天喝几桶水？",
     "answer": "27桶", "acceptedAnswers": ["27桶", "27", "二十七桶"],
     "explanation": "3人3天3桶，即1人3天1桶，1人9天3桶，9人9天=9*3=27桶。"},
    {"type": "logic", "difficulty": "medium",
     "question": "鸡兔同笼，共有35个头，94只脚。鸡有几只？",
     "answer": "23只", "acceptedAnswers": ["23只", "23", "二十三只"],
     "explanation": "设鸡x只、兔y只：x+y=35，2x+4y=94，解得x=23，y=12。"},
    {"type": "logic", "difficulty": "medium",
     "question": "一个数加上它的一半等于15，这个数是多少？",
     "answer": "10", "acceptedAnswers": ["10", "十"],
     "explanation": "x + x/2 = 15，即1.5x=15，所以x=10。"},
    {"type": "logic", "difficulty": "medium",
     "question": "三个连续自然数的和是27，这三个数分别是什么？",
     "answer": "8、9、10", "acceptedAnswers": ["8、9、10", "8,9,10", "8 9 10"],
     "explanation": "中间数=27/3=9，所以三个数是8、9、10。"},
    {"type": "logic", "difficulty": "hard",
     "question": "有口井深7米，蜗牛白天爬3米，晚上下滑2米。第几天能爬出来？",
     "answer": "5", "acceptedAnswers": ["5", "第五天", "第5天", "五天"],
     "explanation": "前4天净爬4米（每天1米），第5天白天爬3米到7米，当天就出来了。"},
    {"type": "logic", "difficulty": "hard",
     "question": "一根绳子对折3次后，从中间剪断，能剪成几段？",
     "answer": "9段", "acceptedAnswers": ["9段", "9", "九段"],
     "explanation": "对折3次是8层，从中间剪断产生9段（两端各1段+中间7段）。"},
    {"type": "logic", "difficulty": "hard",
     "question": "甲说：乙在说谎。乙说：丙在说谎。丙说：甲和乙都在说谎。请问谁在说真话？",
     "answer": "乙", "acceptedAnswers": ["乙", "乙说真话", "乙在说真话"],
     "explanation": "逐人假设：若甲真则乙假、丙真→矛盾。若乙真则甲假、丙假，丙说假话→甲和乙不都说谎→乙说真话，成立。"},
    # Number pattern puzzles
    {"type": "number", "difficulty": "easy",
     "question": "找规律：1，1，2，3，5，8，下一项是多少？",
     "answer": "13", "acceptedAnswers": ["13", "十三"],
     "explanation": "这是斐波那契数列，每一项是前两项之和：5+8=13。"},
    {"type": "number", "difficulty": "easy",
     "question": "找规律：2，6，12，20，下一项是多少？",
     "answer": "30", "acceptedAnswers": ["30", "三十"],
     "explanation": "1x2=2，2x3=6，3x4=12，4x5=20，所以下一项是5x6=30。"},
    {"type": "number", "difficulty": "medium",
     "question": "找规律：3，5，8，13，21，下一项是多少？",
     "answer": "34", "acceptedAnswers": ["34", "三十四"],
     "explanation": "每一项是前两项之和：13+21=34。"},
    {"type": "number", "difficulty": "medium",
     "question": "找规律：1，4，9，16，25，下一项是多少？",
     "answer": "36", "acceptedAnswers": ["36", "三十六"],
     "explanation": "平方数列：1^2=1，2^2=4，3^2=9，4^2=16，5^2=25，6^2=36。"},
    {"type": "number", "difficulty": "medium",
     "question": "找规律：2，3，5，7，11，下一项是多少？",
     "answer": "13", "acceptedAnswers": ["13", "十三"],
     "explanation": "这是质数数列，11之后的下一个质数是13。"},
    {"type": "number", "difficulty": "hard",
     "question": "找规律：1，3，6，10，15，21，下一项是多少？",
     "answer": "28", "acceptedAnswers": ["28", "二十八"],
     "explanation": "三角形数：每一项加的数递增2，3，4，5，6，下一个加7，21+7=28。"},
    {"type": "number", "difficulty": "hard",
     "question": "找规律：2，5，10，17，26，下一项是多少？",
     "answer": "37", "acceptedAnswers": ["37", "三十七"],
     "explanation": "n^2+1的数列：1^2+1=2，2^2+1=5，3^2+1=10，4^2+1=17，5^2+1=26，6^2+1=37。"},
    {"type": "number", "difficulty": "hard",
     "question": "找规律：1，2，6，24，120，下一项是多少？",
     "answer": "720", "acceptedAnswers": ["720", "七百二十"],
     "explanation": "阶乘数列：1!=1，2!=2，3!=6，4!=24，5!=120，6!=720。"},
]


def load_existing_puzzles():
    """Read existing puzzles from SQLite database."""
    db_path = os.path.join(BASE, "data", "puzzles.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT question, answer FROM puzzles")
    rows = cursor.fetchall()
    conn.close()
    return [(q.strip(), a.strip()) for q, a in rows]


def normalize(text):
    """Normalize text for comparison."""
    if not text:
        return ""
    text = text.strip().lower()
    text = re.sub(r"[，。！？、；：（）【】《》\s]+", "", text)
    return text


def read_excel(filepath):
    """Read an Excel file and return list of rows."""
    wb = openpyxl.load_workbook(filepath, read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    return rows


def generate_explanation(question, answer, ptype):
    """Generate a short explanation based on question and answer."""
    if ptype == "word":
        return f'"{question}" 的答案是 "{answer}"。'
    elif ptype == "number":
        return f'经过推理计算，"{question}" 的正确答案是 "{answer}"。'
    elif ptype == "logic":
        return f'通过逻辑分析可得出答案：{answer}。'
    return f'正确答案是 {answer}。'


def assign_difficulty(question, ptype):
    """Assign difficulty with better distribution."""
    length = len(question)
    # Use a hash-based approach for more randomness
    seed = sum(ord(c) for c in question)
    base = seed % 3  # 0=easy, 1=medium, 2=hard
    # Weight toward medium/easy for word riddles
    if ptype == "word":
        if length > 25:
            return "hard" if base != 0 else "medium"
        elif length > 15:
            return "medium" if base != 2 else "hard"
        return "easy" if base == 0 else "medium"
    elif ptype == "number":
        if length > 18:
            return "hard" if base != 0 else "medium"
        elif length > 10:
            return "medium" if base != 2 else "hard"
        return "easy" if base == 0 else "medium"
    return "medium"


def process_source(rows, existing_norm, count, force_type="word", question_filter=None):
    """Generic processor for MDRiddle Excel data."""
    puzzles = []
    for row in rows[1:]:
        if len(puzzles) >= count:
            break
        question = str(row[0]).strip() if row[0] else ""
        choices = [str(row[i]).strip() for i in range(1, 6) if row[i] is not None]
        label_str = str(row[6]).strip() if row[6] is not None else "0"
        try:
            label = int(label_str)
        except ValueError:
            continue
        if not question or label >= len(choices):
            continue
        answer = choices[label]

        if question_filter and not question_filter(question, answer):
            continue

        norm_q = normalize(question)
        norm_a = normalize(answer)
        if any(norm_q == eq[0] for eq in existing_norm):
            continue

        # Classify number riddles better
        ptype = force_type
        if force_type == "auto":
            num_kw = ["打一数字", "数字"]
            is_num = any(kw in question for kw in num_kw) and len(answer) <= 3
            ptype = "number" if is_num else "word"

        difficulty = assign_difficulty(question, ptype)
        explanation = generate_explanation(question, answer, ptype)

        puzzles.append({
            "id": "", "type": ptype, "difficulty": difficulty,
            "question": question, "answer": answer,
            "acceptedAnswers": [answer] + [c for c in choices if c != answer],
            "explanation": explanation
        })
        existing_norm.append((norm_q, norm_a))
    return puzzles


def main():
    print("Loading existing puzzles from SQLite...")
    existing_norm = [(normalize(q), normalize(a)) for q, a in load_existing_puzzles()]
    print(f"  Found {len(existing_norm)} existing puzzles")

    # Read Excel files
    print("Reading Excel files...")
    bt_rows = read_excel(os.path.join(EXTRACTED, "BT_riddle.xlsx"))
    num_rows = read_excel(os.path.join(EXTRACTED, "number_riddle.xlsx"))
    print(f"  BT_riddle: {len(bt_rows)-1} rows")
    print(f"  number_riddle: {len(num_rows)-1} rows")

    all_puzzles = []

    # 1. Hand-crafted logic + number puzzles first (highest quality)
    print("Adding hand-crafted puzzles...")
    for hp in HAND_CRAFTED:
        norm_q = normalize(hp["question"])
        norm_a = normalize(hp["answer"])
        # Only dedup by question, not answer (different puzzles can have same answer)
        if any(norm_q == eq[0] for eq in existing_norm):
            continue
        all_puzzles.append(dict(hp, id=""))
        existing_norm.append((norm_q, norm_a))
    print(f"  Added {len(all_puzzles)} hand-crafted puzzles")

    # 2. Brain teasers -> word type
    print("Processing brain teasers (target: ~22)...")
    all_puzzles.extend(process_source(bt_rows, existing_norm, 22, "word"))
    print(f"  Total so far: {len(all_puzzles)}")

    # 3. Number riddles -> auto classify
    print("Processing number riddles (target: ~14)...")
    all_puzzles.extend(process_source(num_rows, existing_norm, 14, "auto"))
    print(f"  Total so far: {len(all_puzzles)}")

    # 4. More brain teasers if needed to reach ~64
    target_new = 64
    remaining = target_new - len(all_puzzles)
    if remaining > 0:
        print(f"Processing more brain teasers (target: +{remaining})...")
        all_puzzles.extend(process_source(bt_rows, existing_norm, remaining, "word"))

    # Assign IDs
    counters = {"number": 5, "logic": 5, "word": 6}
    for p in all_puzzles:
        counters[p["type"]] += 1
        p["id"] = f"{p['type']}-{counters[p['type']]:02d}"

    # Stats
    diffs = {}
    types = {}
    for p in all_puzzles:
        diffs[p["difficulty"]] = diffs.get(p["difficulty"], 0) + 1
        types[p["type"]] = types.get(p["type"], 0) + 1
    print(f"\nDifficulty distribution: {diffs}")
    print(f"Type distribution: {types}")

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(all_puzzles, f, ensure_ascii=False, indent=2)

    total = len(existing_norm)
    print(f"\nDone! {len(all_puzzles)} new puzzles -> new_puzzles.json")
    print(f"   Grand total: {total} (= {total - len(all_puzzles)} existing + {len(all_puzzles)} new)")


if __name__ == "__main__":
    main()
