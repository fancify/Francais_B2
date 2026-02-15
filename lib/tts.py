"""
TTS 法语语音合成 — 使用 edge-tts（免费 Microsoft Neural）。
修复：用 nest_asyncio 避免 Streamlit 事件循环冲突。
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import streamlit as st


def tts_french(text: str) -> bytes | None:
    """将法语文本转为 MP3 音频。"""
    try:
        import asyncio

        import edge_tts
        import nest_asyncio

        nest_asyncio.apply()

        async def _generate() -> bytes:
            communicate = edge_tts.Communicate(
                text, voice="fr-FR-DeniseNeural", rate="-10%"
            )
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
                await communicate.save(tmp.name)
                return Path(tmp.name).read_bytes()

        loop = asyncio.get_event_loop()
        return loop.run_until_complete(_generate())
    except Exception as e:
        st.error(f"TTS 生成失败: {e}")
        return None
