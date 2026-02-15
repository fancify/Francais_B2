"""
进度仪表盘 — Plotly Gauge + Radar + 弱点列表。
"""

from __future__ import annotations

import streamlit as st


# ---------------------------------------------------------------------------
# 进度页渲染
# ---------------------------------------------------------------------------
def render_progress() -> None:
    """渲染完整的进度仪表盘。"""
    import plotly.graph_objects as go

    st.title("Tableau de Bord")

    scores = st.session_state.scores
    weak = st.session_state.weak_points

    # -- 基础指标计算 --
    total_quizzes = sum(len(v) for v in scores.values())
    all_scores = [s for v in scores.values() for s in v]
    avg_score = round(sum(all_scores) / max(total_quizzes, 1)) if total_quizzes else 0
    units_done = len(scores)

    # -- B2 进度公式：40 + (Current_B2_Progress * 0.6) --
    # Current_B2_Progress = 覆盖率(50%) + 平均分(50%)，范围 0-100
    current_b2_progress = (
        (units_done / 12 * 50 + avg_score / 100 * 50) if total_quizzes else 0
    )
    readiness_pct = round(40 + current_b2_progress * 0.6, 1)

    # -- 雷达维度 (0-10) --
    vocab_wps = sum(1 for w in weak if w.get("type") == "vocabulary")
    gram_wps = sum(1 for w in weak if w.get("type") == "grammar")

    if total_quizzes:
        base = avg_score / 10  # 0-10
        vocab_score = round(max(0, min(10, base + 1 - vocab_wps * 1.5)), 1)
        grammar_score = round(max(0, min(10, base + 0.5 - gram_wps * 1.5)), 1)
        oral_score = round(max(0, min(10, base - 0.5)), 1)
        writing_score = round(max(0, min(10, base - 0.3)), 1)
    else:
        vocab_score = grammar_score = oral_score = writing_score = 0

    # -- 顶部指标行 --
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Quiz complétés", total_quizzes)
    c2.metric("Score moyen", f"{avg_score}%" if total_quizzes else "--")
    c3.metric("Unités", f"{units_done}/12")
    c4.metric("Points faibles", len(weak))

    st.markdown("")

    # -- 图表区域：Gauge + Radar 并排 --
    gauge_col, radar_col = st.columns(2)

    # -- 1. B2 Readiness Gauge --
    with gauge_col:
        if readiness_pct >= 75:
            bar_color = "#34C759"
        elif readiness_pct >= 55:
            bar_color = "#007AFF"
        else:
            bar_color = "#FF9F0A"

        fig_gauge = go.Figure(go.Indicator(
            mode="gauge+number",
            value=readiness_pct,
            number={
                "suffix": "%",
                "font": {
                    "size": 44,
                    "family": "Inter, -apple-system, sans-serif",
                    "color": "#1D1D1F",
                    "weight": 700,
                },
            },
            gauge={
                "axis": {
                    "range": [0, 100],
                    "tickwidth": 1,
                    "tickcolor": "#E5E5EA",
                    "dtick": 20,
                    "tickfont": {
                        "size": 11, "color": "#8E8E93",
                        "family": "Inter, -apple-system, sans-serif",
                    },
                },
                "bar": {"color": bar_color, "thickness": 0.25},
                "bgcolor": "rgba(0,0,0,0.02)",
                "borderwidth": 0,
                "steps": [
                    {"range": [0, 40], "color": "rgba(0,122,255,0.06)"},
                    {"range": [40, 100], "color": "rgba(0,0,0,0.015)"},
                ],
                "threshold": {
                    "line": {"color": "#FF9F0A", "width": 3},
                    "thickness": 0.85,
                    "value": 40,
                },
            },
        ))
        fig_gauge.update_layout(
            title={
                "text": "B2 Readiness", "x": 0.5, "xanchor": "center",
                "font": {
                    "size": 16, "color": "#1D1D1F",
                    "family": "Inter, -apple-system, sans-serif", "weight": 600,
                },
            },
            height=330,
            margin={"l": 30, "r": 30, "t": 60, "b": 30},
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font={"family": "Inter, -apple-system, sans-serif"},
        )
        st.plotly_chart(fig_gauge, use_container_width=True, config={"displayModeBar": False})

    # -- 2. Dual-Layer Radar --
    with radar_col:
        categories = ["Vocabulaire", "Grammaire", "Oral", "Écriture"]

        fig_radar = go.Figure()

        # Layer 1 — B1 Core（固定 4/10）
        b1_vals = [4, 4, 4, 4]
        fig_radar.add_trace(go.Scatterpolar(
            r=b1_vals + [b1_vals[0]],
            theta=categories + [categories[0]],
            fill="toself",
            fillcolor="rgba(0,122,255,0.07)",
            line={"color": "rgba(0,122,255,0.3)", "width": 1.5, "dash": "dot"},
            name="B1 Acquis",
            hovertemplate="B1: %{r}/10<extra></extra>",
        ))

        # Layer 2 — Live B2 Progrèss
        live_vals = [vocab_score, grammar_score, oral_score, writing_score]
        fig_radar.add_trace(go.Scatterpolar(
            r=live_vals + [live_vals[0]],
            theta=categories + [categories[0]],
            fill="toself",
            fillcolor="rgba(0,122,255,0.18)",
            line={"color": "#007AFF", "width": 2.5},
            marker={"size": 7, "color": "#007AFF"},
            name="B2 Progrès",
            hovertemplate="B2: %{r:.1f}/10<extra></extra>",
        ))

        fig_radar.update_layout(
            title={
                "text": "Compétences", "x": 0.5, "xanchor": "center",
                "font": {
                    "size": 16, "color": "#1D1D1F",
                    "family": "Inter, -apple-system, sans-serif", "weight": 600,
                },
            },
            polar={
                "radialaxis": {
                    "visible": True, "range": [0, 10],
                    "tickvals": [2, 4, 6, 8, 10],
                    "tickfont": {"size": 10, "color": "#8E8E93"},
                    "gridcolor": "#E5E5EA", "linecolor": "#E5E5EA",
                },
                "angularaxis": {
                    "gridcolor": "#E5E5EA", "linecolor": "#E5E5EA",
                    "tickfont": {
                        "size": 13, "color": "#1D1D1F",
                        "family": "Inter, -apple-system, sans-serif",
                    },
                },
                "bgcolor": "rgba(0,0,0,0)",
            },
            showlegend=True,
            legend={
                "orientation": "h", "yanchor": "bottom", "y": -0.3,
                "xanchor": "center", "x": 0.5,
                "font": {
                    "size": 11, "color": "#8E8E93",
                    "family": "Inter, -apple-system, sans-serif",
                },
            },
            margin={"l": 55, "r": 55, "t": 60, "b": 70},
            height=330,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font={"family": "Inter, -apple-system, sans-serif"},
        )
        st.plotly_chart(fig_radar, use_container_width=True, config={"displayModeBar": False})

    # -- 3. Weak Points — Top 3 --
    st.markdown("---")
    st.markdown("##### Points faibles")

    if weak:
        _type_map = {
            "vocabulary": ("Vocabulaire", "wp-vocab"),
            "grammar": ("Grammaire", "wp-gram"),
            "expression": ("Expression", "wp-expr"),
            "conjugation": ("Conjugaison", "wp-expr"),
        }
        for wp in weak[:3]:
            label, css_cls = _type_map.get(wp.get("type", ""), ("Autre", "wp-other"))

            # 失败次数标注
            fail_count = wp.get("fail_count", 1)
            count_html = ""
            if fail_count > 1:
                count_html = (
                    f' <span style="font-size:0.7rem;color:#FF3B30;">'
                    f"\u00d7{fail_count}</span>"
                )

            st.markdown(
                f'<div class="weak-point-item">'
                f'<span class="wp-badge {css_cls}">{label}{count_html}</span>'
                f'<span class="wp-text">{wp["item"]}</span>'
                f'<span class="wp-unit">U{wp["unit"]}</span>'
                f"</div>",
                unsafe_allow_html=True,
            )

        if len(weak) > 3:
            st.caption(f"+ {len(weak) - 3} autre(s) point(s) faible(s)")
    else:
        st.success("Aucun point faible identifié -- continuez comme ca !")
