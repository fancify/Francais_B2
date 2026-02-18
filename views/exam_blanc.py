"""
Examen Blanc B2 — 全局模拟考试（Lexique + Grammaire + Production Écrite）。
含 60 分钟倒计时 + 超时自动提交。
"""

from __future__ import annotations

import re
import time

import streamlit as st
import streamlit.components.v1 as components

from lib.components import render_accent_bar, render_word_counter
from lib.grading import grade_exam_blanc_writing
from lib.matching import match_answer, match_vocab_answer
from lib.prompts import EXAM_WRITING_PROMPTS
from lib.quiz import generate_exam_blanc
from lib.storage import save_scores


# ---------------------------------------------------------------------------
# 常量
# ---------------------------------------------------------------------------
EXAM_DURATION = 3600  # 60 分钟（秒）


# ---------------------------------------------------------------------------
# 辅助：强制提交评分
# ---------------------------------------------------------------------------
def _force_submit_exam(exam: dict, units: list[dict]) -> None:
    """评分逻辑（正常提交和超时提交共用）。"""

    # -- 词汇评分（fuzzy matching + 冠词支持） --
    vocab_results = []
    vocab_correct = 0
    for i, v in enumerate(exam["vocabulary"]):
        user_ans = st.session_state.get(f"eb_vocab_{i}", "").strip()
        expected = v["answer"].strip()
        article = v.get("article", "")
        is_correct, hint = match_vocab_answer(user_ans, expected, article)
        if is_correct:
            vocab_correct += 1
        vocab_results.append({
            "definition": v["definition"],
            "user_answer": user_ans,
            "expected": expected,
            "correct": is_correct,
            "hint": hint,
        })
    vocab_score = round(vocab_correct / max(len(exam["vocabulary"]), 1) * 25, 1)

    # -- 语法评分（fuzzy matching） --
    grammar_results = []
    grammar_correct = 0
    for i, g in enumerate(exam["grammar"]):
        user_ans = st.session_state.get(f"eb_gram_{i}", "").strip()
        expected = g["answer"].strip()
        is_correct, hint = match_answer(user_ans, expected)
        if is_correct:
            grammar_correct += 1
        grammar_results.append({
            "type": g["type"],
            "source": g["source"],
            "user_answer": user_ans,
            "expected": expected,
            "correct": is_correct,
            "hint": hint,
        })
    grammar_score = round(grammar_correct / max(len(exam["grammar"]), 1) * 25, 1)

    # -- 保存结果 --
    st.session_state.exam_blanc_submitted = True
    st.session_state.exam_blanc_results = {
        "vocab": vocab_results,
        "vocab_score": vocab_score,
        "grammar": grammar_results,
        "grammar_score": grammar_score,
        "writing_text": st.session_state.get("eb_writing", ""),
    }

    # -- AI 写作评分 --
    writing_text = st.session_state.get("eb_writing", "").strip()
    if writing_text and len(writing_text.split()) >= 30:
        with st.spinner("Évaluation de la production écrite\u2026"):
            grade = grade_exam_blanc_writing(writing_text, exam["writing_prompt"])
        st.session_state.exam_blanc_writing_grade = grade

    # -- 持久化分数 --
    save_scores(st.session_state.scores, st.session_state.weak_points)


# ---------------------------------------------------------------------------
# 页面渲染
# ---------------------------------------------------------------------------
def render_exam_blanc(units: list[dict]) -> None:
    """渲染 Examen Blanc B2 页面。"""
    st.title("Examen Blanc B2")
    st.caption("Simulation DELF B2 -- Lexique \u00b7 Grammaire \u00b7 Production Écrite")

    # -- 超时自动提交检查（在渲染表单前） --
    if (
        st.session_state.exam_blanc_start_time
        and not st.session_state.exam_blanc_submitted
        and st.session_state.exam_blanc_data is not None
    ):
        elapsed = time.time() - st.session_state.exam_blanc_start_time
        if elapsed > EXAM_DURATION:
            _force_submit_exam(st.session_state.exam_blanc_data, units)
            st.rerun()

    # -- 考试未开始 --
    if st.session_state.exam_blanc_data is None:
        _render_start_screen(units)
        return

    exam = st.session_state.exam_blanc_data

    # -- 倒计时 --
    if st.session_state.exam_blanc_start_time and not st.session_state.exam_blanc_submitted:
        _render_timer()

    # -- 口音栏 --
    if not st.session_state.exam_blanc_submitted:
        render_accent_bar()

    # -- 表单 --
    if not st.session_state.exam_blanc_submitted:
        _render_exam_form(exam, units)

    # -- 结果 --
    if st.session_state.exam_blanc_submitted and st.session_state.exam_blanc_results:
        _render_results(exam)


# ---------------------------------------------------------------------------
# 子渲染函数
# ---------------------------------------------------------------------------
def _render_start_screen(units: list[dict]) -> None:
    """考试开始前的说明页面。"""
    st.markdown("""
**Conditions d'examen :**
- 60 minutes chronométrées
- **25 pts** Lexique -- 20 questions, correspondance exacte avec accents
- **25 pts** Grammaire -- 5 transformations de phrases, correspondance exacte
- **50 pts** Production écrite -- évaluation IA, barème officiel DELF B2
- **Mode strict** -- Soumission unique, pas de verification individuelle

> Les accents comptent ! « été » ≠ « ete »
    """)

    if st.button("Démarrer l'examen", type="primary", use_container_width=True):
        data = generate_exam_blanc(units, EXAM_WRITING_PROMPTS)
        st.session_state.exam_blanc_data = data
        st.session_state.exam_blanc_start_time = time.time()
        st.session_state.exam_blanc_submitted = False
        st.session_state.exam_blanc_results = None
        st.session_state.exam_blanc_writing_grade = None
        st.rerun()


def _render_timer() -> None:
    """JavaScript 实时倒计时 + 超时自动刷新。"""
    elapsed = time.time() - st.session_state.exam_blanc_start_time
    remaining = max(0, EXAM_DURATION - elapsed)
    mins = int(remaining // 60)
    secs = int(remaining % 60)
    bar_pct = remaining / EXAM_DURATION * 100

    if remaining > 1200:
        timer_color = "#34C759"
    elif remaining > 300:
        timer_color = "#FF9F0A"
    else:
        timer_color = "#FF3B30"

    components.html(f"""
    <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;
                 background:#fff;border-radius:14px;border:1px solid rgba(0,0,0,0.04);
                 box-shadow:0 2px 8px rgba(0,0,0,0.05);
                 font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
        <span style="font-size:0.75rem;color:#8E8E93;font-weight:600;
                     text-transform:uppercase;letter-spacing:0.5px;">Temps</span>
        <span id="eb-timer" style="font-size:1.3rem;font-weight:700;color:{timer_color};
              font-variant-numeric:tabular-nums;min-width:70px;">{mins:02d}:{secs:02d}</span>
        <div style="flex:1;height:6px;background:#E5E5EA;border-radius:3px;overflow:hidden;">
            <div id="eb-bar" style="height:100%;width:{bar_pct:.1f}%;background:{timer_color};
                 border-radius:3px;transition:width 1s linear;"></div>
        </div>
    </div>
    <script>
    (function() {{
        let r = {int(remaining)};
        const el = document.getElementById('eb-timer');
        const bar = document.getElementById('eb-bar');
        function tick() {{
            if (r <= 0) {{
                el.textContent = "00:00";
                el.style.color = "#FF3B30";
                // 超时：刷新页面让后端检查并自动提交
                window.parent.location.reload();
                return;
            }}
            r--;
            const m = Math.floor(r / 60), s = r % 60;
            el.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
            bar.style.width = (r / {EXAM_DURATION} * 100).toFixed(1) + '%';
            if (r <= 300) {{ el.style.color = '#FF3B30'; bar.style.background = '#FF3B30'; }}
            else if (r <= 1200) {{ el.style.color = '#FF9F0A'; bar.style.background = '#FF9F0A'; }}
            setTimeout(tick, 1000);
        }}
        setTimeout(tick, 1000);
    }})();
    </script>
    """, height=52)


def _render_exam_form(exam: dict, units: list[dict]) -> None:
    """考试表单（严格模式，单次提交）。"""
    with st.form("exam_blanc_form"):
        # Partie 1: Lexique
        with st.expander("Partie 1 -- Lexique (25 points)", expanded=True):
            st.caption("Écrivez le mot correspondant à chaque définition.")
            for i, v in enumerate(exam["vocabulary"]):
                st.markdown(f"**{i + 1}.** {v['definition']}")
                st.text_input(
                    f"Mot {i + 1}", key=f"eb_vocab_{i}",
                    placeholder="Tapez le mot exact\u2026",
                    label_visibility="collapsed",
                )

        # Partie 2: Grammaire
        with st.expander("Partie 2 -- Grammaire (25 points)", expanded=True):
            st.caption("Transformez chaque phrase selon la consigne indiquée.")
            for i, g in enumerate(exam["grammar"]):
                st.markdown(f"**{i + 1}.** *{g['type']}*")
                st.markdown(f"> {g['source']}")
                st.text_input(
                    f"Transformation {i + 1}", key=f"eb_gram_{i}",
                    placeholder="Écrivez la phrase transformée\u2026",
                    label_visibility="collapsed",
                )

        # Partie 3: Production Écrite
        with st.expander("Partie 3 -- Production Écrite (50 points)", expanded=True):
            st.markdown(f"**Sujet :** {exam['writing_prompt']}")
            st.text_area(
                "Production", key="eb_writing",
                height=280,
                placeholder="Rédigez votre essai ici\u2026 (250 mots minimum)",
                label_visibility="collapsed",
            )
            writing_text = st.session_state.get("eb_writing", "")
            render_word_counter(writing_text)

        submitted = st.form_submit_button(
            "Soumettre l'examen", type="primary", use_container_width=True,
        )

    if submitted:
        _force_submit_exam(exam, units)
        st.rerun()


def _render_results(exam: dict) -> None:
    """展示考试结果。"""
    results = st.session_state.exam_blanc_results
    vocab_score = results["vocab_score"]
    grammar_score = results["grammar_score"]

    # 从 AI 回复中提取写作分数
    writing_score = 0
    writing_grade = st.session_state.exam_blanc_writing_grade
    if writing_grade:
        m = re.search(r"SCORE_TOTAL:\s*(\d+)/50", writing_grade)
        if m:
            writing_score = min(int(m.group(1)), 50)
        else:
            m = re.search(r"(\d+)\s*/\s*50", writing_grade)
            if m:
                writing_score = min(int(m.group(1)), 50)

    total_score = round(vocab_score + grammar_score + writing_score, 1)

    st.markdown("---")
    st.markdown("### Résultats")

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Lexique", f"{vocab_score}/25")
    c2.metric("Grammaire", f"{grammar_score}/25")
    c3.metric("Écriture", f"{writing_score}/50")
    c4.metric("TOTAL", f"{total_score}/100")

    # 词汇详情
    vc = sum(1 for r in results["vocab"] if r["correct"])
    with st.expander(f"Lexique -- {vc}/{len(results['vocab'])} correct", expanded=False):
        for i, r in enumerate(results["vocab"]):
            icon = "\u2705" if r["correct"] else "\u274c"
            st.markdown(f"{icon} **{i + 1}.** {r['definition']}")
            if not r["correct"]:
                hint_text = f" -- *{r['hint']}*" if r.get("hint") else ""
                st.markdown(
                    f"&nbsp;&nbsp;&nbsp;Votre réponse : `{r['user_answer'] or '--'}` "
                    f"\u2192 Attendu : `{r['expected']}`{hint_text}"
                )

    # 语法详情
    gc = sum(1 for r in results["grammar"] if r["correct"])
    with st.expander(f"Grammaire -- {gc}/{len(results['grammar'])} correct", expanded=False):
        for i, r in enumerate(results["grammar"]):
            icon = "\u2705" if r["correct"] else "\u274c"
            st.markdown(f"{icon} **{i + 1}.** *{r['type']}*")
            st.markdown(f"> {r['source']}")
            if not r["correct"]:
                hint_text = f" -- *{r['hint']}*" if r.get("hint") else ""
                st.markdown(
                    f"Votre réponse : `{r['user_answer'] or '--'}`{hint_text}"
                )
                st.markdown(f"Attendu : `{r['expected']}`")

    # 写作评分
    if writing_grade:
        display_grade = re.sub(r"\n?SCORE_TOTAL:.*", "", writing_grade).strip()
        with st.expander(f"Production Écrite -- {writing_score}/50", expanded=True):
            st.markdown(display_grade)
    elif results.get("writing_text", "").strip():
        st.info("Production écrite trop courte pour être évaluée (minimum 30 mots).")

    st.markdown("---")
    if st.button("Nouvel examen", type="primary", use_container_width=True):
        st.session_state.exam_blanc_data = None
        st.session_state.exam_blanc_start_time = None
        st.session_state.exam_blanc_submitted = False
        st.session_state.exam_blanc_results = None
        st.session_state.exam_blanc_writing_grade = None
        st.rerun()
