"""
AI 评分与生成函数 — 口语/写作评分、模考题目生成。
使用 OpenRouter API 调用 LLM。
"""

from __future__ import annotations

import json

import streamlit as st
from openai import OpenAI

# ---------------------------------------------------------------------------
# API 配置
# ---------------------------------------------------------------------------
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "google/gemini-2.0-flash-001"


# ---------------------------------------------------------------------------
# API 基础设施
# ---------------------------------------------------------------------------
def get_client() -> OpenAI | None:
    """获取 OpenRouter 客户端，未配置 API Key 时返回 None。"""
    api_key = (
        st.session_state.get("openrouter_api_key", "")
        or st.secrets.get("OPENROUTER_API_KEY", "")
    )
    if not api_key:
        return None
    return OpenAI(
        api_key=api_key,
        base_url=OPENROUTER_BASE_URL,
        default_headers={
            "HTTP-Referer": "http://localhost:8501",
            "X-Title": "Francais-B2",
        },
    )


def call_gpt(
    system: str,
    user: str,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.7,
) -> str | None:
    """调用 LLM，返回文本响应；失败时返回 None 并显示错误。"""
    client = get_client()
    if client is None:
        st.warning("请先在侧边栏输入 OpenRouter API Key。")
        return None
    try:
        resp = client.chat.completions.create(
            model=model,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return resp.choices[0].message.content
    except Exception as e:
        st.error(f"API 调用失败: {e}")
        return None


def parse_json_response(raw: str | None) -> dict | list | None:
    """从 LLM 响应中提取 JSON，自动去除 markdown 围栏。"""
    if raw is None:
        return None
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        st.error("JSON 解析失败，请重试。")
        return None


# ---------------------------------------------------------------------------
# 口语评分
# ---------------------------------------------------------------------------
def grade_oral(text: str, unit: dict) -> str | None:
    """DELF B2 口语评分（25 分制）。"""
    system = f"""You are a DELF B2 oral examiner. The student was asked to present an oral argument on the theme: "{unit['theme']}".

The following text was transcribed from speech via speech-to-text (STT):
\"\"\"{text}\"\"\"

IMPORTANT — STT tolerance rules (do NOT penalize these):
- Missing accents (e.g. "ecole" instead of "école", "a" instead of "à") — STT often drops diacritics. Ignore accent errors entirely.
- Repeated words or stuttering (e.g. "je je pense que", "le le problème") — this is normal in spoken French and also a common STT artifact. Do not count repetitions as errors.
- Minor punctuation or capitalization issues — STT output has unreliable punctuation.

Focus your evaluation ONLY on:
- The quality of ideas, argumentation, and relevance to the theme
- Vocabulary richness and appropriateness (judge the word choices, not the spelling)
- Grammatical structures used (tenses, agreement, syntax) — but forgive accent-related spelling

Grade out of 25 points:
1. Fluency and Coherence — logical flow, discourse structure, use of connectors (out of 8)
2. Range of Vocabulary — richness, precision, idiomatic usage relevant to the theme (out of 8)
3. Grammatical Accuracy — syntax, verb tenses, agreement, sentence complexity (out of 9)

Provide:
- A score for each criterion
- A TOTAL score out of 25
- Specific feedback in French with concrete examples from the text
- Corrected sentences where real grammatical errors (not STT artifacts) are found
- 2-3 actionable suggestions for improvement

Format your response clearly with headers."""
    return call_gpt(system, text)


# ---------------------------------------------------------------------------
# 写作评分
# ---------------------------------------------------------------------------
def grade_writing(text: str, unit: dict) -> str | None:
    """DELF B2 写作评分（25 分制）。"""
    system = f"""You are a DELF B2 written production examiner. The writing task theme is: "{unit['theme']}".

Here is the student's text:
\"\"\"{text}\"\"\"

Grade this written production out of 25 points using the official DELF B2 rubric:
1. Task Fulfillment / Respect de la consigne (out of 5)
2. Argumentation / Capacité à argumenter (out of 5)
3. Coherence and Cohesion / Cohérence et cohésion (out of 5)
4. Vocabulary Range / Compétence lexicale (out of 5)
5. Grammatical Accuracy / Compétence grammaticale (out of 5)

CRITICAL: For criterion 1 (Respect de la consigne), you MUST check whether the text actually addresses the assigned theme "{unit['theme']}". If the text is off-topic or completely unrelated to the theme, score criterion 1 as 0/5 and cap the total at a maximum of 10/25 regardless of language quality. A well-written text on the wrong topic is still a failure.

Provide:
- A score for each criterion
- A TOTAL score out of 25
- Detailed feedback in French with specific examples
- Corrected sentences where errors are found
- 2-3 suggestions for improvement

Format your response clearly with headers."""
    return call_gpt(system, text)


# ---------------------------------------------------------------------------
# 模考听力题生成
# ---------------------------------------------------------------------------
def generate_exam_co(unit: dict) -> dict | None:
    """生成 DELF B2 听力理解模考题（含文本 transcript + 6 道选择题）。"""
    system = f"""You are a DELF B2 exam creator. Generate a "Compréhension de l'oral" section for the theme: "{unit['theme']}".

Since this is a digital app without audio, simulate the listening by providing a WRITTEN TRANSCRIPT of a realistic French radio interview or debate (~200 words) related to the theme.

Then generate 6 comprehension questions in this JSON format:
{{
  "transcript": "<the full transcript text in French>",
  "source_description": "<e.g. 'Extrait d'une émission de radio France Inter'>",
  "questions": [
    {{
      "id": 1,
      "question": "<question in French>",
      "options": ["A. <answer>", "B. <answer>", "C. <answer>", "D. <answer>"],
      "correct": "A"
    }}
  ]
}}

Requirements:
- The transcript should sound natural, like a real radio broadcast or interview
- Questions should test: general understanding (2), detailed comprehension (2), implicit meaning/opinion (2)
- All in French. Difficulty: DELF B2
- Return ONLY valid JSON, no markdown fences."""
    raw = call_gpt(system, f"Theme: {unit['theme']}", temperature=0.8)
    return parse_json_response(raw)


# ---------------------------------------------------------------------------
# 模考阅读题生成
# ---------------------------------------------------------------------------
def generate_exam_ce(unit: dict) -> dict | None:
    """生成 DELF B2 阅读理解模考题（含文章 + 6 道选择题）。"""
    system = f"""You are a DELF B2 exam creator. Generate a "Compréhension des écrits" section for the theme: "{unit['theme']}".

Create a realistic French article or opinion piece (~300 words) related to the theme, then generate 6 comprehension questions.

JSON format:
{{
  "article": "<the full article text in French>",
  "source_description": "<e.g. 'Article paru dans Le Monde, 2024'>",
  "questions": [
    {{
      "id": 1,
      "question": "<question in French>",
      "options": ["A. <answer>", "B. <answer>", "C. <answer>", "D. <answer>"],
      "correct": "B"
    }}
  ]
}}

Requirements:
- The article should read like a real newspaper/magazine piece with a clear argumentative structure
- Questions should test: main idea (1), detail retrieval (2), vocabulary in context (1), author's opinion/tone (1), inference (1)
- All in French. Difficulty: DELF B2
- Return ONLY valid JSON, no markdown fences."""
    raw = call_gpt(system, f"Theme: {unit['theme']}", temperature=0.8)
    return parse_json_response(raw)


# ---------------------------------------------------------------------------
# 模考写作评分（50 分制）
# ---------------------------------------------------------------------------
def grade_exam_blanc_writing(text: str, prompt: str) -> str | None:
    """DELF B2 模考写作评分（50 分制，标准分翻倍）。"""
    system = f"""You are a DELF B2 written production examiner. Grade this exam essay.

**Sujet :** {prompt}

**Texte de l'étudiant :**
\"\"\"{text}\"\"\"

Grade out of 50 points using the DELF B2 rubric (doubled from standard 25):
1. Respect de la consigne (out of 10)
2. Capacité à argumenter (out of 10)
3. Cohérence et cohésion (out of 10)
4. Compétence lexicale (out of 10)
5. Compétence grammaticale (out of 10)

CRITICAL: For criterion 1 (Respect de la consigne), you MUST verify that the text actually answers the given "Sujet". If the text is off-topic or unrelated to the prompt, score criterion 1 as 0/10 and cap the total at a maximum of 20/50. A well-written text on the wrong topic is still a failure.

Provide:
- A score for each criterion
- A TOTAL score out of 50
- Detailed feedback in French with specific examples from the text
- Corrected sentences where errors are found
- 3 concrete suggestions for improvement

Format with clear headers. Be rigorous — this simulates a real DELF B2 exam.
End your response with exactly this line:
SCORE_TOTAL: [number]/50"""
    return call_gpt(system, text)
