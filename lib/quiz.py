"""
Quiz 生成器 — 单元练习 (含间隔重复) 与模拟考试。

从 data.json 中按比例抽取题目，支持弱点优先。
"""

from __future__ import annotations

import math
import random


# ---------------------------------------------------------------------------
# 题目 _key 生成
# ---------------------------------------------------------------------------
def _vocab_key(v: dict) -> str:
    return v["word"]


def _expr_key(e: dict) -> str:
    return e["expression"]


def _conj_key(c: dict) -> str:
    return f"{c['verb']}_{c['tense']}_{c['person']}"


def _trans_key(t: dict) -> str:
    return f"{t['type']}|{t['source'][:30]}"


# ---------------------------------------------------------------------------
# 按比例分配题目数量（保留原始逻辑）
# ---------------------------------------------------------------------------
def _allocate(pool_sizes: dict[str, int], target: int) -> dict[str, int]:
    """
    根据各题库大小按比例分配 target 道题。

    pool_sizes: {"vocab": 50, "expr": 20, ...}
    返回: {"vocab": 16, "expr": 7, ...}
    """
    total_pool = sum(pool_sizes.values())
    if total_pool == 0:
        return {k: 0 for k in pool_sizes}

    # 初始按比例分配，不超过题库上限
    alloc = {
        k: min(round(size / total_pool * target), size)
        for k, size in pool_sizes.items()
    }

    # 补足到 target
    current = sum(alloc.values())
    while current < target:
        best = max(alloc, key=lambda k: pool_sizes[k] - alloc[k])
        if alloc[best] < pool_sizes[best]:
            alloc[best] += 1
            current += 1
        else:
            break

    # 削减到 target
    while current > target:
        best = max(alloc, key=lambda k: alloc[k])
        if alloc[best] > 1:
            alloc[best] -= 1
            current -= 1
        else:
            break

    return alloc


# ---------------------------------------------------------------------------
# 弱点筛选
# ---------------------------------------------------------------------------
def _split_weak_and_normal(
    items: list[dict],
    key_fn,
    weak_keys: set[str],
    quota: int,
    weak_quota: int,
) -> list[dict]:
    """
    从 items 中优先选出弱点题目（最多 weak_quota 道），
    其余从正常题库随机补到 quota。
    """
    weak_items = [it for it in items if key_fn(it) in weak_keys]
    normal_items = [it for it in items if key_fn(it) not in weak_keys]

    # 弱点部分
    n_weak = min(weak_quota, len(weak_items), quota)
    selected_weak = random.sample(weak_items, n_weak) if n_weak > 0 else []

    # 正常部分补满 quota
    n_normal = min(quota - n_weak, len(normal_items))
    selected_normal = random.sample(normal_items, n_normal) if n_normal > 0 else []

    result = selected_weak + selected_normal
    random.shuffle(result)
    return result


# ---------------------------------------------------------------------------
# 生成单元 Quiz（含间隔重复）
# ---------------------------------------------------------------------------
def generate_unit_quiz(
    unit: dict,
    all_units: list[dict],
    weak_points: list[dict] | None = None,
) -> dict:
    """
    从 data.json 的单元数据中按比例分配 40 道题。

    4 类题目：vocab（填空+MCQ）, expr（填空）, conj（填空）, trans（改写）。

    参数:
        unit: 当前单元数据
        all_units: 全部单元列表（用于 MCQ 干扰项）
        weak_points: 弱点列表（可选，用于间隔重复）

    返回:
        {"vocab": [...], "expr": [...], "conj": [...], "trans": [...]}
    """
    vocab = unit.get("vocabulary", [])
    expr = unit.get("expressions", [])
    conj = unit.get("conjugation_list", [])
    transforms = unit.get("grammar_transforms", [])

    total_pool = len(vocab) + len(expr) + len(conj) + len(transforms)
    if total_pool == 0:
        return {"vocab": [], "expr": [], "conj": [], "trans": []}

    TARGET = 40

    alloc = _allocate(
        {"vocab": len(vocab), "expr": len(expr),
         "conj": len(conj), "trans": len(transforms)},
        TARGET,
    )
    n_vocab = alloc["vocab"]
    n_expr = alloc["expr"]
    n_conj = alloc["conj"]
    n_trans = alloc["trans"]

    # ── 收集当前单元的弱点 key ──
    if weak_points is None:
        weak_points = []

    unit_num = unit.get("unit_number")
    unit_weak = [wp for wp in weak_points if wp.get("unit") == unit_num]

    weak_keys_by_type: dict[str, set[str]] = {
        "vocab": set(), "expr": set(), "conj": set(), "trans": set(),
    }
    for wp in unit_weak:
        wp_type = wp.get("type", "")
        if wp_type in weak_keys_by_type:
            weak_keys_by_type[wp_type].add(wp.get("key", ""))

    # 弱点配额：每类占 40%（向上取整）
    def _weak_quota(n: int) -> int:
        return math.ceil(n * 0.4)

    # ── 抽取题目（弱点优先）──
    vocab_qs = _split_weak_and_normal(
        vocab, _vocab_key, weak_keys_by_type["vocab"],
        n_vocab, _weak_quota(n_vocab),
    )
    expr_qs = _split_weak_and_normal(
        expr, _expr_key, weak_keys_by_type["expr"],
        n_expr, _weak_quota(n_expr),
    )
    conj_qs = _split_weak_and_normal(
        conj, _conj_key, weak_keys_by_type["conj"],
        n_conj, _weak_quota(n_conj),
    )
    trans_qs = _split_weak_and_normal(
        transforms, _trans_key, weak_keys_by_type["trans"],
        n_trans, _weak_quota(n_trans),
    )

    # ── 词汇题：~25% 选择题 + 其余填空 ──
    all_defs = [
        v["definition"]
        for u in all_units
        for v in u.get("vocabulary", [])
    ]
    vocab_questions: list[dict] = []
    n_mcq = max(1, n_vocab // 4)
    for i, v in enumerate(vocab_qs):
        key = _vocab_key(v)
        article = v.get("article", "")
        if i < n_mcq:
            correct_def = v["definition"]
            pool = [d for d in all_defs if d != correct_def]
            distractors = random.sample(pool, min(3, len(pool)))
            options = [correct_def] + distractors
            random.shuffle(options)
            vocab_questions.append({
                "qtype": "mcq",
                "prompt": f"Quelle est la définition de « {v['word']} » ?",
                "options": options,
                "answer": correct_def,
                "_key": key,
            })
        else:
            vocab_questions.append({
                "qtype": "fill",
                "prompt": v["definition"],
                "answer": v["answer"],
                "article": article,
                "_key": key,
            })

    # ── 表达题：填空 ──
    expr_questions: list[dict] = []
    for e in expr_qs:
        expr_questions.append({
            "qtype": "fill",
            "prompt": e["usage"],
            "hint": e.get("example", ""),
            "answer": e["expression"],
            "_key": _expr_key(e),
        })

    # ── 变位题：填空 ──
    conj_questions: list[dict] = []
    for c in conj_qs:
        conj_questions.append({
            "qtype": "fill",
            "prompt": f"{c['verb']} — {c['tense']} — {c['person']}",
            "answer": c["answer"],
            "person": c["person"],
            "_key": _conj_key(c),
        })

    # ── 句式转换题：改写 ──
    trans_questions: list[dict] = []
    for t in trans_qs:
        trans_questions.append({
            "qtype": "rewrite",
            "transform_type": t["type"],
            "source": t["source"],
            "answer": t["answer"],
            "_key": _trans_key(t),
        })

    return {
        "vocab": vocab_questions,
        "expr": expr_questions,
        "conj": conj_questions,
        "trans": trans_questions,
    }


# ---------------------------------------------------------------------------
# 模拟考试
# ---------------------------------------------------------------------------
def generate_exam_blanc(
    all_units: list[dict],
    exam_writing_prompts: dict,
) -> dict:
    """
    从全部 12 个单元中随机抽取题目组成模拟考试。

    参数:
        all_units: 全部单元列表
        exam_writing_prompts: {unit_number: prompt_text} 写作题库

    返回:
        {"vocabulary": [...], "grammar": [...], "writing_prompt": str}
    """
    all_vocab: list[dict] = []
    all_transforms: list[dict] = []
    for u in all_units:
        for v in u.get("vocabulary", []):
            all_vocab.append({**v, "_unit": u["unit_number"]})
        for t in u.get("grammar_transforms", []):
            all_transforms.append({**t, "_unit": u["unit_number"]})

    vocab_qs = random.sample(all_vocab, min(20, len(all_vocab)))

    # 从不同单元抽取语法变换题（优先覆盖不同单元）
    random.shuffle(all_transforms)
    grammar_qs: list[dict] = []
    units_used: set[int] = set()
    for t in all_transforms:
        if len(grammar_qs) >= 5:
            break
        if t["_unit"] not in units_used:
            grammar_qs.append(t)
            units_used.add(t["_unit"])
    # 不够 5 道则从剩余中补齐
    for t in all_transforms:
        if len(grammar_qs) >= 5:
            break
        if t not in grammar_qs:
            grammar_qs.append(t)

    writing_prompt = random.choice(list(exam_writing_prompts.values()))

    return {
        "vocabulary": vocab_qs,
        "grammar": grammar_qs,
        "writing_prompt": writing_prompt,
    }
