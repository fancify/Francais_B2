"""
可复用 UI 组件 — 口音字符栏、字数统计等。
"""

from __future__ import annotations

import streamlit as st
import streamlit.components.v1 as components

from lib.prompts import ACCENT_CHARS


# ---------------------------------------------------------------------------
# 口音字符快捷输入栏
# ---------------------------------------------------------------------------
def render_accent_bar() -> None:
    """渲染法语口音字符按钮栏（点击复制到剪贴板）。"""
    accent_btns = ""
    for c in ACCENT_CHARS:
        accent_btns += (
            f'<button onclick="'
            f"navigator.clipboard.writeText('{c}').then(function(){{"
            f"this.style.background='#007AFF';this.style.color='#fff';"
            f"var b=this;setTimeout(function(){{b.style.background='#fff';"
            f"b.style.color='#1D1D1F'}},250)"
            f"}}.bind(this)).catch(function(){{}});"
            f'" style="font-size:1.05rem;padding:0.25rem 0.5rem;border:1px solid #D1D1D6;'
            f'border-radius:8px;background:#fff;cursor:pointer;color:#1D1D1F;'
            f'font-family:-apple-system,sans-serif;'
            f'-webkit-tap-highlight-color:transparent;">{c}</button> '
        )
    components.html(
        f'<div style="display:flex;gap:6px;flex-wrap:wrap;padding:2px 0;'
        f'font-family:-apple-system,BlinkMacSystemFont,sans-serif;">'
        f'<span style="font-size:0.7rem;color:#8E8E93;align-self:center;'
        f'margin-right:2px;">Accents</span>'
        f"{accent_btns}</div>",
        height=40,
    )


# ---------------------------------------------------------------------------
# 实时字数统计
# ---------------------------------------------------------------------------
def render_word_counter(text: str, min_words: int = 250) -> None:
    """显示实时字数，颜色随字数变化：红 → 橙 → 绿。"""
    word_count = len(text.split()) if text.strip() else 0

    if word_count < 100:
        color = "#FF3B30"
    elif word_count < min_words:
        color = "#FF9F0A"
    else:
        color = "#34C759"

    st.markdown(
        f'<p style="font-size:0.85rem;color:#8E8E93;margin:0;">'
        f'Nombre de mots : <span style="color:{color};font-weight:600;">'
        f"{word_count}</span> / {min_words} minimum</p>",
        unsafe_allow_html=True,
    )
