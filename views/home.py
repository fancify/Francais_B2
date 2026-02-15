"""
首页 — 指标概览 + 12 个单元卡片网格。
"""

from __future__ import annotations

import streamlit as st

from lib.state import reset_unit_state


# ---------------------------------------------------------------------------
# 首页渲染
# ---------------------------------------------------------------------------
def render_home(units: list[dict]) -> None:
    """渲染首页：顶部 4 个 metric + 12 个单元卡片（2 列网格）。"""

    scores = st.session_state.scores
    total_quizzes = sum(len(v) for v in scores.values())
    all_scores = [s for v in scores.values() for s in v]
    avg_score = round(sum(all_scores) / max(total_quizzes, 1)) if total_quizzes else 0
    units_done = len(scores)
    wp_count = len(st.session_state.weak_points)

    st.caption("Édito B2 -- Cahier d'exercices dynamique")

    # -- 顶部指标卡片 --
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Quiz complétés", total_quizzes)
    c2.metric("Score moyen", f"{avg_score}%" if total_quizzes else "--")
    c3.metric("Unités", f"{units_done}/12")
    c4.metric("Points faibles", wp_count)

    st.markdown("")
    st.markdown("### Choisissez une unité")

    # -- 单元卡片网格（每行 2 个） --
    for row_start in range(0, 12, 2):
        row_units = [units[i] for i in range(row_start, min(row_start + 2, 12))]
        cols = st.columns(2)
        for col_idx, u in enumerate(row_units):
            n = u["unit_number"]

            # 最高分标注
            best_score_html = ""
            if n in scores:
                best_score_html = (
                    f'<div style="font-size:0.78rem; color:#007AFF; margin-top:0.15rem;">'
                    f"Meilleur : {max(scores[n])}%</div>"
                )

            grammar_text = ", ".join(u["grammar_focus"][:2])

            with cols[col_idx]:
                # 卡片 HTML
                st.markdown(
                    f'<div class="unit-card">'
                    f"<div>"
                    f'<div style="font-weight:700; font-size:0.95rem; color:#1D1D1F;">Unité {n}</div>'
                    f'<div style="font-style:italic; color:#3C3C43; font-size:0.88rem; '
                    f'margin:0.15rem 0 0.25rem;">{u["theme"]}</div>'
                    f'<div style="font-size:0.75rem; color:#8E8E93;">Grammaire : {grammar_text}</div>'
                    f"{best_score_html}"
                    f"</div>"
                    f'<div class="card-action">Ouvrir &rarr;</div>'
                    f"</div>",
                    unsafe_allow_html=True,
                )
                # 透明按钮覆盖卡片实现点击
                if st.button("\u3164", key=f"home_unit_{n}", use_container_width=True):
                    st.session_state.current_page = "unit"
                    st.session_state.current_unit = n
                    reset_unit_state()
                    st.rerun()
