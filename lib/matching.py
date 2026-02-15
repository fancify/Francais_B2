"""
Fuzzy answer matching — 比较用户答案与期望答案，支持多级容差。

只依赖标准库 (difflib, unicodedata)，不需要外部包。
"""

from __future__ import annotations

import re
import unicodedata
from difflib import SequenceMatcher

# 句末标点
_TRAILING_PUNCT = re.compile(r"[.!?]+$")

# 内部多余空格
_MULTI_SPACE = re.compile(r"\s+")


def _normalize_whitespace(text: str) -> str:
    """去掉首尾空格，压缩内部多余空格。"""
    return _MULTI_SPACE.sub(" ", text.strip())


def _strip_trailing_punct(text: str) -> str:
    """去掉句末标点。"""
    return _TRAILING_PUNCT.sub("", text).rstrip()


def _strip_accents(text: str) -> str:
    """NFD 分解后去掉所有组合用变音符号。"""
    nfd = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in nfd if unicodedata.category(ch) != "Mn")


def match_answer(user_answer: str, expected: str) -> tuple[bool, str]:
    """
    比较用户答案和期望答案。

    返回 (is_correct, feedback_hint)。
    feedback_hint 在不完全正确时给出提示，完全正确时为空字符串。

    匹配规则（按优先级）：
    1. 完全匹配
    2. casefold 后匹配（大小写不算错）
    3. 标准化空格 + casefold 后匹配
    4. 去掉句末标点后匹配
    5. 去掉口音后匹配 → 提示检查重音
    6. 相似度 >= 0.85 → 提示检查拼写
    7. 其他 → 无提示
    """
    # 1. 完全匹配
    if user_answer == expected:
        return True, ""

    # 2. casefold 匹配
    user_cf = user_answer.casefold()
    expected_cf = expected.casefold()
    if user_cf == expected_cf:
        return True, ""

    # 3. 标准化空格 + casefold
    user_norm = _normalize_whitespace(user_answer).casefold()
    expected_norm = _normalize_whitespace(expected).casefold()
    if user_norm == expected_norm:
        return True, ""

    # 4. 去掉句末标点后匹配
    user_no_punct = _strip_trailing_punct(user_norm)
    expected_no_punct = _strip_trailing_punct(expected_norm)
    if user_no_punct == expected_no_punct:
        return True, ""

    # 5. 去掉口音后匹配
    user_no_accent = _strip_accents(user_no_punct)
    expected_no_accent = _strip_accents(expected_no_punct)
    if user_no_accent == expected_no_accent:
        return False, "Presque ! Vérifiez les accents."

    # 6. 相似度检测
    ratio = SequenceMatcher(None, user_no_punct, expected_no_punct).ratio()
    if ratio >= 0.85:
        return False, "Très proche ! Vérifiez l'orthographe."

    # 7. 不匹配
    return False, ""
