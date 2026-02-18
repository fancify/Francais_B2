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

# 所有句子标点（保留撇号 '  '  ' 和连字符 - ，这些在法语中有意义）
_SENTENCE_PUNCT = re.compile(
    r"[.,;:!?¿¡…—–\"""«»''()\[\]{}/\\。，、；：！？（）【】「」\u3000]+"
)

# 内部多余空格
_MULTI_SPACE = re.compile(r"\s+")

# 法语冠词
_ARTICLE_RE = re.compile(
    r"^(le|la|l[''']|les|un|une|des|du)\s+",
    re.IGNORECASE,
)


def _normalize_whitespace(text: str) -> str:
    """去掉首尾空格，压缩内部多余空格。"""
    return _MULTI_SPACE.sub(" ", text.strip())


def _strip_trailing_punct(text: str) -> str:
    """去掉句末标点。"""
    return _TRAILING_PUNCT.sub("", text).rstrip()


def _strip_all_punct(text: str) -> str:
    """去掉所有句子标点（保留撇号和连字符）。"""
    result = _SENTENCE_PUNCT.sub(" ", text)
    return _MULTI_SPACE.sub(" ", result).strip()


def _strip_accents(text: str) -> str:
    """NFD 分解后去掉所有组合用变音符号。"""
    nfd = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in nfd if unicodedata.category(ch) != "Mn")


def _split_article(text: str) -> tuple[str, str]:
    """分离开头的法语冠词，返回 (article, rest)。无冠词返回 ("", text)。"""
    text = text.strip()
    m = _ARTICLE_RE.match(text)
    if m:
        article = m.group(1)
        rest = text[m.end():].strip()
        return article, rest
    return "", text


def _normalize_apostrophe(text: str) -> str:
    """统一各种撇号为 ASCII '。"""
    return text.replace("\u2019", "'").replace("\u2018", "'").replace("\u02BC", "'")


def _strip_pronoun(text: str, person: str) -> str:
    """去掉开头的法语主语代词（仅当匹配指定 person 时）。"""
    text = text.strip()
    person_lower = person.strip().lower()

    # person → 可能的代词列表
    pronoun_map = {
        "je": ["je", "j'"],
        "tu": ["tu"],
        "il": ["il"],
        "elle": ["elle"],
        "on": ["on"],
        "nous": ["nous"],
        "vous": ["vous"],
        "ils": ["ils"],
        "elles": ["elles"],
    }

    pronouns = pronoun_map.get(person_lower, [])
    text_lower = _normalize_apostrophe(text.lower())

    for p in pronouns:
        if p == "j'" and text_lower.startswith("j'"):
            # j' 后面紧跟，无空格
            raw = _normalize_apostrophe(text)
            return raw[2:].strip()
        elif text_lower.startswith(p + " "):
            return text[len(p):].strip()

    return text


# ---------------------------------------------------------------------------
# 基础匹配
# ---------------------------------------------------------------------------
def match_answer(user_answer: str, expected: str) -> tuple[bool, str]:
    """
    比较用户答案和期望答案。

    返回 (is_correct, feedback_hint)。
    feedback_hint 在不完全正确时给出提示，完全正确时为空字符串。

    匹配规则（按优先级）：
    1. 完全匹配
    2. casefold 后匹配（大小写不算错）
    3. 标准化空格 + casefold 后匹配
    4. 去掉所有句子标点后匹配（不仅是句末）
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

    # 4. 去掉所有句子标点后匹配
    user_no_punct = _strip_all_punct(user_norm)
    expected_no_punct = _strip_all_punct(expected_norm)
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


# ---------------------------------------------------------------------------
# 词汇匹配（支持可选冠词）
# ---------------------------------------------------------------------------
def match_vocab_answer(
    user_answer: str, expected: str, article: str = "",
) -> tuple[bool, str]:
    """
    词汇匹配：支持可选冠词。

    - expected: 期望的词（不含冠词），如 "gaspillage"
    - article: 正确的冠词，如 "le"、"la"、"l'"（空表示无冠词）
    - 用户写冠词且 article 非空 → 验证冠词是否正确
    - 用户不写冠词 → 只验证拼写
    """
    user_article, user_word = _split_article(user_answer.strip())

    # 如果用户写了冠词，且该词有正确冠词
    if user_article and article:
        ua = _normalize_apostrophe(user_article.casefold())
        ea = _normalize_apostrophe(article.casefold())
        if ua != ea:
            # 冠词错误（阴阳性搞错了）
            return False, f"Vérifiez l'article ! ({article} {expected})"

    # 验证词本身
    return match_answer(user_word, expected)


# ---------------------------------------------------------------------------
# 动词变位匹配（允许可选主语代词）
# ---------------------------------------------------------------------------
def match_conj_answer(
    user_answer: str, expected: str, person: str,
) -> tuple[bool, str]:
    """
    动词变位匹配：允许用户可选地加上主语代词。

    例如 expected="protège", person="il"：
    - "protège" → 正确
    - "il protège" → 正确（去掉 il 后匹配）
    """
    # 先直接匹配
    is_correct, hint = match_answer(user_answer.strip(), expected.strip())
    if is_correct:
        return True, ""

    # 尝试去掉主语代词后匹配
    stripped = _strip_pronoun(user_answer.strip(), person)
    if stripped != user_answer.strip():
        is_correct2, hint2 = match_answer(stripped, expected.strip())
        if is_correct2:
            return True, ""
        # 如果去掉代词后更接近，用那个 hint
        if hint2:
            return False, hint2

    return is_correct, hint


# ---------------------------------------------------------------------------
# 表达匹配（支持多种答案 + 包含检测）
# ---------------------------------------------------------------------------
def match_expr_answer(
    user_answer: str,
    expected: str,
    alternatives: list[str] | None = None,
) -> tuple[bool, str]:
    """
    表达匹配：
    1. 直接匹配（7 级容差）
    2. 检查期望表达是否包含在用户答案中（用户写了完整句子）
    3. 支持多个可接受答案（alternatives 列表）
    """
    all_expected = [expected]
    if alternatives:
        all_expected.extend(alternatives)

    user_stripped = user_answer.strip()

    # 第一轮：直接匹配
    for exp in all_expected:
        is_correct, _ = match_answer(user_stripped, exp.strip())
        if is_correct:
            return True, ""

    # 第二轮：包含检测（用户写了完整句子，但包含了正确的表达）
    user_norm = _strip_all_punct(_normalize_whitespace(user_answer).casefold())

    for exp in all_expected:
        exp_norm = _strip_all_punct(_normalize_whitespace(exp).casefold())

        if exp_norm in user_norm:
            return True, ""

        # 去口音后检测包含
        exp_no_accent = _strip_accents(exp_norm)
        user_no_accent = _strip_accents(user_norm)
        if exp_no_accent in user_no_accent:
            return False, "Presque ! Vérifiez les accents."

    # 返回主答案的 hint
    _, hint = match_answer(user_stripped, expected.strip())
    return False, hint
