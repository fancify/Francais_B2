"""
Session state 管理 — 初始化、重置、弱点操作。
"""

from __future__ import annotations

import streamlit as st


# ---------------------------------------------------------------------------
# 初始化
# ---------------------------------------------------------------------------
def init_state():
    """设置所有 session_state 默认值。"""
    defaults = {
        "openrouter_api_key": "",
        "current_page": "home",
        "current_unit": None,
        "scores": {},               # {unit_number: [pct, pct, ...]}
        "weak_points": [],           # [{"type", "unit", "key", "item", "fail_count"}, ...]
        "quiz_questions": [],
        "quiz_answers": {},
        "quiz_submitted": False,
        "quiz_results": None,
        "oral_grade": None,
        "writing_grade": None,
        "exam_co_data": None,
        "exam_co_audio": None,
        "exam_ce_data": None,
        "exam_co_submitted": False,
        "exam_ce_submitted": False,
        "exam_co_score": None,
        "exam_ce_score": None,
        "exam_pe_grade": None,
        "exam_po_grade": None,
        "exam_blanc_data": None,
        "exam_blanc_start_time": None,
        "exam_blanc_submitted": False,
        "exam_blanc_results": None,
        "exam_blanc_writing_grade": None,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v


# ---------------------------------------------------------------------------
# 重置单元状态
# ---------------------------------------------------------------------------
def reset_unit_state():
    """切换单元时清空当前做题状态。"""
    for key in [
        "quiz_questions", "quiz_answers", "quiz_submitted", "quiz_results",
        "oral_grade", "writing_grade",
        "exam_co_data", "exam_co_audio", "exam_ce_data",
        "exam_co_submitted", "exam_ce_submitted",
        "exam_co_score", "exam_ce_score", "exam_pe_grade", "exam_po_grade",
    ]:
        val = st.session_state.get(key)
        if isinstance(val, (list, dict)):
            st.session_state[key] = type(val)()
        else:
            st.session_state[key] = None
    st.session_state["quiz_submitted"] = False
    st.session_state["exam_co_submitted"] = False
    st.session_state["exam_ce_submitted"] = False


# ---------------------------------------------------------------------------
# 弱点管理 — 升级版（带去重 + fail_count）
# ---------------------------------------------------------------------------
def _wp_key(wp: dict) -> tuple:
    """弱点唯一标识。"""
    return (wp.get("type", ""), wp.get("unit", 0), wp.get("key", ""))


def add_weak_point(wp_type: str, unit: int, key: str, item: str):
    """添加弱点，已存在则 fail_count +1。"""
    for wp in st.session_state.weak_points:
        if _wp_key(wp) == (wp_type, unit, key):
            wp["fail_count"] = wp.get("fail_count", 1) + 1
            return
    st.session_state.weak_points.append({
        "type": wp_type,
        "unit": unit,
        "key": key,
        "item": item[:80],
        "fail_count": 1,
    })


def reduce_weak_point(wp_type: str, unit: int, key: str):
    """做对时减少 fail_count，归零则移除。"""
    target_key = (wp_type, unit, key)
    for i, wp in enumerate(st.session_state.weak_points):
        if _wp_key(wp) == target_key:
            wp["fail_count"] = wp.get("fail_count", 1) - 1
            if wp["fail_count"] <= 0:
                st.session_state.weak_points.pop(i)
            return


def get_weak_items_for_unit(unit: int) -> list[dict]:
    """获取指定单元的弱点列表（按 fail_count 降序）。"""
    items = [wp for wp in st.session_state.weak_points if wp.get("unit") == unit]
    items.sort(key=lambda w: w.get("fail_count", 0), reverse=True)
    return items
