"""
单元页 — Quiz / Oral / Écriture / Examen B2 四个 tab。
"""

from __future__ import annotations

import re

import streamlit as st

from lib.components import render_accent_bar, render_word_counter
from lib.grading import (
    generate_exam_ce,
    generate_exam_co,
    grade_oral,
    grade_writing,
)
from lib.matching import match_answer, match_conj_answer, match_expr_answer, match_vocab_answer
from lib.prompts import (
    EXAM_ORAL_PROMPTS,
    EXAM_WRITING_PROMPTS,
    ORAL_PROMPTS,
    WRITING_PROMPTS,
)
from lib.quiz import generate_unit_quiz
from lib.state import add_weak_point, reduce_weak_point
from lib.storage import save_scores
from lib.tts import tts_french


# ---------------------------------------------------------------------------
# 辅助
# ---------------------------------------------------------------------------
def get_unit(units: list[dict], n: int) -> dict | None:
    """按 unit_number 查找单元。"""
    return next((u for u in units if u["unit_number"] == n), None)


# ---------------------------------------------------------------------------
# 单元页入口
# ---------------------------------------------------------------------------
def render_unit(units: list[dict]) -> None:
    """渲染单元页面：Quiz / Oral / Écriture / Examen B2。"""
    unit = get_unit(units, st.session_state.current_unit)
    if unit is None:
        st.error("Unité introuvable.")
        return

    st.subheader(f"Unité {unit['unit_number']}")
    st.caption(unit["theme"])

    tab_quiz, tab_oral, tab_writing, tab_exam = st.tabs(
        ["Quiz", "Oral", "Écriture", "Examen B2"]
    )

    with tab_quiz:
        _render_quiz(unit, units)
    with tab_oral:
        _render_oral(unit)
    with tab_writing:
        _render_writing(unit)
    with tab_exam:
        _render_exam(unit)


# ---------------------------------------------------------------------------
# Quiz tab
# ---------------------------------------------------------------------------
def _render_quiz(unit: dict, units: list[dict]) -> None:
    """Quiz 练习：40 道题，含 fuzzy matching 和弱点追踪。"""

    # -- 生成题目 --
    if not st.session_state.quiz_questions:
        quiz = generate_unit_quiz(unit, units, st.session_state.weak_points)
        nv = len(quiz["vocab"])
        ne = len(quiz["expr"])
        nc = len(quiz["conj"])
        nt = len(quiz["trans"])
        st.markdown(
            f"**40 questions** -- "
            f"Vocabulaire ({nv}) \u00b7 Expressions ({ne}) \u00b7 "
            f"Conjugaison ({nc}) \u00b7 Réécriture ({nt})"
        )
        st.caption("Correspondance exacte avec accents \u00b7 Pas de verification individuelle")

        if st.button("Commencer le quiz", type="primary"):
            st.session_state.quiz_questions = quiz
            st.session_state.quiz_answers = {}
            st.session_state.quiz_submitted = False
            st.session_state.quiz_results = None
            st.rerun()
        return

    quiz = st.session_state.quiz_questions
    vocab_qs = quiz["vocab"]
    expr_qs = quiz["expr"]
    conj_qs = quiz["conj"]
    trans_qs = quiz["trans"]
    total_q = len(vocab_qs) + len(expr_qs) + len(conj_qs) + len(trans_qs)

    # -- 口音栏 --
    if not st.session_state.quiz_submitted:
        render_accent_bar()

    # -- 表单 --
    if not st.session_state.quiz_submitted:
        with st.form("quiz_form"):
            # 1. Vocabulaire
            with st.expander(f"Vocabulaire ({len(vocab_qs)} questions)", expanded=True):
                for i, q in enumerate(vocab_qs):
                    st.markdown(f"**{i + 1}.** {q['prompt']}")
                    if q["qtype"] == "mcq":
                        st.radio(
                            f"V-MCQ {i + 1}", q["options"], key=f"qv_{i}",
                            index=None, label_visibility="collapsed",
                        )
                    else:
                        st.text_input(
                            f"Vocab {i + 1}", key=f"qv_{i}",
                            placeholder="Tapez le mot exact\u2026",
                            label_visibility="collapsed",
                        )

            # 2. Expressions
            with st.expander(f"Expressions ({len(expr_qs)} questions)", expanded=True):
                # Référence : liste de toutes les expressions à utiliser
                ref_text = " · ".join(f"`{q['answer']}`" for q in expr_qs)
                st.markdown(f"**Expressions à utiliser :** {ref_text}")
                st.markdown("---")

                expr_options = ["—"] + [q["answer"] for q in expr_qs]
                for i, q in enumerate(expr_qs):
                    # Blank the expression in the example sentence
                    hint = q.get("hint", "")
                    if hint:
                        blanked = re.sub(
                            re.escape(q["answer"]), "`___`", hint, flags=re.IGNORECASE
                        )
                    else:
                        blanked = q["prompt"]

                    st.markdown(f"**{i + 1}.** *{q['prompt']}*")
                    st.markdown(f"> {blanked}")
                    st.selectbox(
                        f"Expr {i + 1}", options=expr_options, key=f"qe_{i}",
                        index=0, label_visibility="collapsed",
                    )

            # 3. Conjugaison
            with st.expander(f"Conjugaison ({len(conj_qs)} questions)", expanded=True):
                for i, q in enumerate(conj_qs):
                    st.markdown(f"**{i + 1}.** {q['prompt']}")
                    st.text_input(
                        f"Conj {i + 1}", key=f"qc_{i}",
                        placeholder="Tapez la forme conjuguée\u2026",
                        label_visibility="collapsed",
                    )

            # 4. Réécriture
            with st.expander(f"Réécriture ({len(trans_qs)} questions)", expanded=True):
                for i, q in enumerate(trans_qs):
                    st.markdown(f"**{i + 1}.** *{q['transform_type']}*")
                    st.markdown(f"> {q['source']}")
                    st.text_input(
                        f"Trans {i + 1}", key=f"qt_{i}",
                        placeholder="Écrivez la phrase transformée\u2026",
                        label_visibility="collapsed",
                    )

            submitted = st.form_submit_button(
                "Soumettre", type="primary", use_container_width=True,
            )

        if submitted:
            _grade_quiz(unit, vocab_qs, expr_qs, conj_qs, trans_qs, total_q)

    # -- 结果展示 --
    if st.session_state.quiz_submitted and st.session_state.quiz_results:
        _show_quiz_results(total_q)


def _grade_quiz(
    unit: dict,
    vocab_qs: list[dict],
    expr_qs: list[dict],
    conj_qs: list[dict],
    trans_qs: list[dict],
    total_q: int,
) -> None:
    """评分并记录弱点（含 fuzzy matching）。"""
    results: dict[str, list] = {"vocab": [], "expr": [], "conj": [], "trans": []}

    # -- 评分各类题目 --
    for i, q in enumerate(vocab_qs):
        user_ans = st.session_state.get(f"qv_{i}", "")
        if q["qtype"] == "mcq":
            is_correct = (user_ans == q["answer"])
            hint = ""
        else:
            is_correct, hint = match_vocab_answer(
                user_ans.strip(), q["answer"].strip(), q.get("article", ""),
            )
        results["vocab"].append({**q, "user_answer": user_ans, "correct": is_correct, "hint": hint})

    for i, q in enumerate(expr_qs):
        user_ans = st.session_state.get(f"qe_{i}", "").strip()
        if user_ans == "—":
            user_ans = ""
        is_correct, hint = match_expr_answer(user_ans, q["answer"].strip())
        results["expr"].append({**q, "user_answer": user_ans, "correct": is_correct, "hint": hint})

    for i, q in enumerate(conj_qs):
        user_ans = st.session_state.get(f"qc_{i}", "").strip()
        is_correct, hint = match_conj_answer(
            user_ans, q["answer"].strip(), q.get("person", ""),
        )
        results["conj"].append({**q, "user_answer": user_ans, "correct": is_correct, "hint": hint})

    for i, q in enumerate(trans_qs):
        user_ans = st.session_state.get(f"qt_{i}", "").strip()
        is_correct, hint = match_answer(user_ans, q["answer"].strip())
        results["trans"].append({**q, "user_answer": user_ans, "correct": is_correct, "hint": hint})

    # -- 弱点追踪 --
    cat_label_map = [
        ("vocab", "vocabulary"),
        ("expr", "expression"),
        ("conj", "conjugation"),
        ("trans", "grammar"),
    ]
    for cat_key, cat_label in cat_label_map:
        for r in results[cat_key]:
            if not r["correct"] and r.get("user_answer"):
                add_weak_point(
                    cat_label, unit["unit_number"],
                    r.get("_key", ""),
                    (r.get("prompt") or r.get("source", ""))[:80],
                )
            elif r["correct"] and r.get("_key"):
                reduce_weak_point(
                    cat_label, unit["unit_number"],
                    r.get("_key", ""),
                )

    # -- 记录分数 --
    total_correct = sum(r["correct"] for cat in results.values() for r in cat)
    pct = round(total_correct / total_q * 100)

    st.session_state.quiz_submitted = True
    st.session_state.quiz_results = results

    unit_num = unit["unit_number"]
    if unit_num not in st.session_state.scores:
        st.session_state.scores[unit_num] = []
    st.session_state.scores[unit_num].append(pct)

    # 持久化
    save_scores(st.session_state.scores, st.session_state.weak_points)
    st.rerun()


def _show_quiz_results(total_q: int) -> None:
    """展示 Quiz 结果（含 hint 信息）。"""
    results = st.session_state.quiz_results
    total_correct = sum(r["correct"] for cat in results.values() for r in cat)
    pct = round(total_correct / total_q * 100)

    st.toast(f"Score : {total_correct}/{total_q} ({pct}%)")

    score_cols = st.columns([2, 1])
    with score_cols[0]:
        if pct >= 80:
            st.success(f"Excellent ! **{total_correct}/{total_q}** ({pct}%)")
        elif pct >= 50:
            st.warning(f"Pas mal ! **{total_correct}/{total_q}** ({pct}%)")
        else:
            st.error(f"Continuez ! **{total_correct}/{total_q}** ({pct}%)")
    with score_cols[1]:
        if st.button("Nouveau quiz", use_container_width=True):
            st.session_state.quiz_questions = {}
            st.session_state.quiz_answers = {}
            st.session_state.quiz_submitted = False
            st.session_state.quiz_results = None
            st.rerun()

    # 分类分数面板
    cat_meta = [
        ("vocab", "Vocabulaire"),
        ("expr", "Expressions"),
        ("conj", "Conjugaison"),
        ("trans", "Réécriture"),
    ]
    mc = st.columns(4)
    for col, (key, label) in zip(mc, cat_meta):
        cat_correct = sum(1 for r in results[key] if r["correct"])
        col.metric(label, f"{cat_correct}/{len(results[key])}")

    # 详细结果
    for key, label in cat_meta:
        cat_results = results[key]
        cat_correct = sum(1 for r in cat_results if r["correct"])
        with st.expander(f"{label} -- {cat_correct}/{len(cat_results)}", expanded=False):
            for i, r in enumerate(cat_results):
                icon = "\u2705" if r["correct"] else "\u274c"
                if r.get("qtype") == "mcq":
                    st.markdown(f"{icon} **{i + 1}.** {r['prompt']}")
                elif r.get("qtype") == "rewrite":
                    st.markdown(
                        f"{icon} **{i + 1}.** *{r.get('transform_type', '')}* "
                        f"-- {r.get('source', '')}"
                    )
                else:
                    st.markdown(f"{icon} **{i + 1}.** {r.get('prompt', '')}")

                if not r["correct"]:
                    hint_text = f" -- *{r['hint']}*" if r.get("hint") else ""
                    st.markdown(
                        f"&nbsp;&nbsp;&nbsp;Votre réponse : "
                        f"`{r['user_answer'] or '--'}` "
                        f"\u2192 Attendu : `{r['answer']}`{hint_text}"
                    )


# ---------------------------------------------------------------------------
# Oral tab
# ---------------------------------------------------------------------------
def _render_oral(unit: dict) -> None:
    """口语练习：语音转文字 + AI 评分。"""
    oral_prompt = ORAL_PROMPTS.get(
        unit["unit_number"],
        f"Parlez du theme : \u00ab {unit['theme']} \u00bb. Donnez votre opinion avec des arguments.",
    )

    st.markdown(f"**Consigne :** {oral_prompt}")
    st.caption("Utilisez la dictee vocale de votre iPad (touche \U0001f399) \u00b7 Visez 250-400 mots (~3 min)")

    with st.expander("Critères d'évaluation", expanded=False):
        st.markdown("""
        | Critere | Points |
        |---------|--------|
        | Fluidité et cohérence | /8 |
        | Richesse du vocabulaire | /8 |
        | Correction grammaticale | /9 |
        | **Total** | **/25** |
        """)

    with st.form(f"oral_form_{unit['unit_number']}"):
        oral_text = st.text_area(
            "Votre réponse orale (dictée) :", height=220,
            placeholder="Appuyez sur \U0001f399 pour dicter votre réponse\u2026",
            key=f"oral_text_{unit['unit_number']}",
        )
        render_word_counter(oral_text)
        oral_submitted = st.form_submit_button(
            "Évaluer", type="primary", use_container_width=True,
        )

    if oral_submitted and oral_text.strip():
        with st.spinner("Évaluation en cours\u2026"):
            grade = grade_oral(oral_text, unit)
        if grade:
            st.session_state.oral_grade = grade
            st.toast("Évaluation terminée !")

    if st.session_state.oral_grade:
        with st.expander("Évaluation orale", expanded=True):
            st.markdown(st.session_state.oral_grade)


# ---------------------------------------------------------------------------
# Écriture tab
# ---------------------------------------------------------------------------
def _render_writing(unit: dict) -> None:
    """写作练习：AI 评分。"""
    prompt_text = WRITING_PROMPTS.get(
        unit["unit_number"],
        f"Rédigez un essai argumenté sur le theme \u00ab {unit['theme']} \u00bb. (250 mots minimum)",
    )

    st.markdown(f"**Sujet :** {prompt_text}")

    with st.expander("Critères d'évaluation", expanded=False):
        st.markdown("""
        | Critere | Points |
        |---------|--------|
        | Respect de la consigne | /5 |
        | Capacite a argumenter | /5 |
        | Cohérence et cohésion | /5 |
        | Compétence lexicale | /5 |
        | Compétence grammaticale | /5 |
        | **Total** | **/25** |
        """)

    user_text = st.text_area(
        "Votre texte :", height=280,
        placeholder="Écrivez votre production ici\u2026",
        key=f"writing_{unit['unit_number']}",
    )

    render_word_counter(user_text)

    if user_text.strip() and st.button(
        "Évaluer", type="primary", key=f"eval_writing_{unit['unit_number']}",
    ):
        word_count = len(user_text.split()) if user_text.strip() else 0
        if word_count < 50:
            st.warning("Texte trop court -- visez au moins 250 mots.")
        else:
            with st.spinner("Évaluation en cours\u2026"):
                grade = grade_writing(user_text, unit)
            if grade:
                st.session_state.writing_grade = grade
                st.toast("Évaluation terminée !")

    if st.session_state.writing_grade:
        with st.expander("Évaluation écrite", expanded=True):
            st.markdown(st.session_state.writing_grade)


# ---------------------------------------------------------------------------
# Examen B2 tab
# ---------------------------------------------------------------------------
def _render_exam(unit: dict) -> None:
    """模拟 DELF B2 考试：CO / CE / PE / PO 四部分。"""
    st.markdown("Simulez un examen **DELF B2** complet -- 4 épreuves, 100 points.")

    # 顶部分数面板
    co_score = st.session_state.exam_co_score["score"] if st.session_state.exam_co_score else None
    ce_score = st.session_state.exam_ce_score["score"] if st.session_state.exam_ce_score else None

    ec1, ec2, ec3, ec4 = st.columns(4)
    ec1.metric("CO", f"{co_score}/25" if co_score is not None else "--")
    ec2.metric("CE", f"{ce_score}/25" if ce_score is not None else "--")
    ec3.metric("PE", "\u2713" if st.session_state.exam_pe_grade else "--")
    ec4.metric("PO", "\u2713" if st.session_state.exam_po_grade else "--")

    remaining = []
    if co_score is None:
        remaining.append("CO")
    if ce_score is None:
        remaining.append("CE")
    if not st.session_state.exam_pe_grade:
        remaining.append("PE")
    if not st.session_state.exam_po_grade:
        remaining.append("PO")

    if remaining:
        st.caption(f"Restant : {', '.join(remaining)}")
    else:
        st.success("Toutes les épreuves sont terminées !")

    st.markdown("---")

    # -- 1. CO --
    _render_exam_co(unit)
    st.markdown("---")

    # -- 2. CE --
    _render_exam_ce(unit)
    st.markdown("---")

    # -- 3. PE --
    _render_exam_pe(unit)
    st.markdown("---")

    # -- 4. PO --
    _render_exam_po(unit)


# ---------------------------------------------------------------------------
# CO
# ---------------------------------------------------------------------------
def _render_exam_co(unit: dict) -> None:
    """Compréhension de l'oral。"""
    st.markdown("#### 1. Compréhension de l'oral")

    if st.session_state.exam_co_data is None:
        if st.button("Générer l'épreuve CO", type="primary", key="gen_co"):
            with st.spinner("Génération du document sonore\u2026"):
                data = generate_exam_co(unit)
            if data:
                st.session_state.exam_co_data = data
                st.session_state.exam_co_submitted = False
                st.session_state.exam_co_score = None
                with st.spinner("Synthèse vocale\u2026"):
                    st.session_state.exam_co_audio = tts_french(data["transcript"])
                st.rerun()
        return

    co = st.session_state.exam_co_data

    if st.session_state.exam_co_audio:
        st.audio(st.session_state.exam_co_audio, format="audio/mp3")
        st.caption("Réécoutez autant de fois que nécessaire.")
    else:
        if st.button("Générer l'audio", key="regen_co_audio"):
            with st.spinner("Synthèse vocale\u2026"):
                st.session_state.exam_co_audio = tts_french(co["transcript"])
            st.rerun()

    with st.expander("Transcription (après l'écoute)"):
        st.markdown(co["transcript"])

    with st.form("exam_co_form"):
        for i, q in enumerate(co["questions"]):
            st.markdown(f"**Q{i + 1}.** {q['question']}")
            st.radio(
                "Réponse", q["options"], key=f"eco_{i}",
                index=None, label_visibility="collapsed",
            )
        co_submitted = st.form_submit_button(
            "Soumettre", type="primary", use_container_width=True,
        )

    if co_submitted and not st.session_state.exam_co_submitted:
        st.session_state.exam_co_submitted = True
        correct = 0
        detail = []
        for i, q in enumerate(co["questions"]):
            ans = st.session_state.get(f"eco_{i}")
            is_ok = ans is not None and ans.startswith(q["correct"])
            if is_ok:
                correct += 1
            detail.append({
                "q": q["question"], "ans": ans,
                "correct": q["correct"], "ok": is_ok,
            })
        score = round(correct / len(co["questions"]) * 25, 1)
        st.session_state.exam_co_score = {"score": score, "detail": detail}
        st.toast(f"CO : {score}/25")
        st.rerun()

    if st.session_state.exam_co_score:
        s = st.session_state.exam_co_score
        with st.expander(f"Résultats CO -- {s['score']}/25", expanded=False):
            for i, r in enumerate(s["detail"]):
                icon = "\u2705" if r["ok"] else "\u274c"
                st.markdown(f"{icon} Q{i + 1} : {r['ans'] or '--'} \u2192 correcte : {r['correct']}")


# ---------------------------------------------------------------------------
# CE
# ---------------------------------------------------------------------------
def _render_exam_ce(unit: dict) -> None:
    """Compréhension des écrits。"""
    st.markdown("#### 2. Compréhension des écrits")

    if st.session_state.exam_ce_data is None:
        if st.button("Générer l'épreuve CE", type="primary", key="gen_ce"):
            with st.spinner("Génération de la compréhension écrite\u2026"):
                data = generate_exam_ce(unit)
            if data:
                st.session_state.exam_ce_data = data
                st.session_state.exam_ce_submitted = False
                st.session_state.exam_ce_score = None
                st.rerun()
        return

    ce = st.session_state.exam_ce_data
    with st.expander(ce.get("source_description", "Article"), expanded=True):
        st.markdown(ce["article"])

    with st.form("exam_ce_form"):
        for i, q in enumerate(ce["questions"]):
            st.markdown(f"**Q{i + 1}.** {q['question']}")
            st.radio(
                "Réponse", q["options"], key=f"ece_{i}",
                index=None, label_visibility="collapsed",
            )
        ce_submitted = st.form_submit_button(
            "Soumettre", type="primary", use_container_width=True,
        )

    if ce_submitted and not st.session_state.exam_ce_submitted:
        st.session_state.exam_ce_submitted = True
        correct = 0
        detail = []
        for i, q in enumerate(ce["questions"]):
            ans = st.session_state.get(f"ece_{i}")
            is_ok = ans is not None and ans.startswith(q["correct"])
            if is_ok:
                correct += 1
            detail.append({
                "q": q["question"], "ans": ans,
                "correct": q["correct"], "ok": is_ok,
            })
        score = round(correct / len(ce["questions"]) * 25, 1)
        st.session_state.exam_ce_score = {"score": score, "detail": detail}
        st.toast(f"CE : {score}/25")
        st.rerun()

    if st.session_state.exam_ce_score:
        s = st.session_state.exam_ce_score
        with st.expander(f"Résultats CE -- {s['score']}/25", expanded=False):
            for i, r in enumerate(s["detail"]):
                icon = "\u2705" if r["ok"] else "\u274c"
                st.markdown(f"{icon} Q{i + 1} : {r['ans'] or '--'} \u2192 correcte : {r['correct']}")


# ---------------------------------------------------------------------------
# PE
# ---------------------------------------------------------------------------
def _render_exam_pe(unit: dict) -> None:
    """Production écrite。"""
    st.markdown("#### 3. Production écrite")

    ep_prompt = EXAM_WRITING_PROMPTS.get(
        unit["unit_number"],
        f"Rédigez un essai argumenté sur \u00ab {unit['theme']} \u00bb. (250 mots min.)",
    )
    st.markdown(f"**Sujet :** {ep_prompt}")

    with st.form(f"exam_pe_form_{unit['unit_number']}"):
        exam_pe_text = st.text_area(
            "Votre production :", height=220,
            placeholder="Rédigez ici\u2026",
            key=f"exam_pe_{unit['unit_number']}",
        )
        render_word_counter(exam_pe_text)
        pe_submitted = st.form_submit_button(
            "Évaluer la PE", type="primary", use_container_width=True,
        )

    if pe_submitted and exam_pe_text.strip():
        with st.spinner("Évaluation\u2026"):
            grade = grade_writing(exam_pe_text, unit)
        if grade:
            st.session_state.exam_pe_grade = grade
            st.toast("PE évaluée !")

    if st.session_state.exam_pe_grade:
        with st.expander("Évaluation PE", expanded=True):
            st.markdown(st.session_state.exam_pe_grade)


# ---------------------------------------------------------------------------
# PO
# ---------------------------------------------------------------------------
def _render_exam_po(unit: dict) -> None:
    """Production orale。"""
    st.markdown("#### 4. Production orale")

    eo_prompt = EXAM_ORAL_PROMPTS.get(
        unit["unit_number"],
        f"Présentez votre opinion sur \u00ab {unit['theme']} \u00bb avec des arguments structurés.",
    )
    st.markdown(f"**Sujet :** {eo_prompt}")
    st.caption(
        "Dictez votre réponse \u00b7 Structurez : intro \u2192 pour \u2192 contre "
        "\u2192 conclusion \u00b7 ~300-400 mots"
    )

    with st.form(f"exam_po_form_{unit['unit_number']}"):
        exam_po_text = st.text_area(
            "Votre production orale :", height=220,
            placeholder="Dictez ici\u2026",
            key=f"exam_po_{unit['unit_number']}",
        )
        render_word_counter(exam_po_text)
        po_submitted = st.form_submit_button(
            "Évaluer la PO", type="primary", use_container_width=True,
        )

    if po_submitted and exam_po_text.strip():
        with st.spinner("Évaluation\u2026"):
            grade = grade_oral(exam_po_text, unit)
        if grade:
            st.session_state.exam_po_grade = grade
            st.toast("PO évaluée !")

    if st.session_state.exam_po_grade:
        with st.expander("Évaluation PO", expanded=True):
            st.markdown(st.session_state.exam_po_grade)
