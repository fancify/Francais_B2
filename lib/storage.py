"""
持久化存储层 — 支持本地文件和 S3 两种后端。
"""

from __future__ import annotations

import json
import os
from abc import ABC, abstractmethod
from pathlib import Path


# ---------------------------------------------------------------------------
# 抽象基类
# ---------------------------------------------------------------------------
class Storage(ABC):
    @abstractmethod
    def load_progress(self) -> dict:
        """加载进度数据。"""

    @abstractmethod
    def save_progress(self, data: dict) -> None:
        """保存进度数据。"""


# ---------------------------------------------------------------------------
# FileStorage — 本地 JSON 文件
# ---------------------------------------------------------------------------
class FileStorage(Storage):
    """读写项目根目录下 data/progress.json。"""

    def __init__(self) -> None:
        root = Path(__file__).resolve().parent.parent
        self._path = root / "data" / "progress.json"

    def load_progress(self) -> dict:
        if not self._path.exists():
            return {}
        with open(self._path, "r", encoding="utf-8") as f:
            return json.load(f)

    def save_progress(self, data: dict) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with open(self._path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# S3Storage — AWS S3 JSON 文件
# ---------------------------------------------------------------------------
class S3Storage(Storage):
    """通过 boto3 读写 S3 中的 JSON 文件。"""

    def __init__(self) -> None:
        import boto3  # noqa: F811 — 延迟导入，仅在 S3 后端时需要

        self._bucket = os.environ["S3_BUCKET"]
        self._key = os.environ.get("S3_KEY", "vibe-francais/progress.json")
        self._client = boto3.client("s3")

    def load_progress(self) -> dict:
        try:
            resp = self._client.get_object(Bucket=self._bucket, Key=self._key)
            return json.loads(resp["Body"].read())
        except self._client.exceptions.NoSuchKey:
            return {}

    def save_progress(self, data: dict) -> None:
        self._client.put_object(
            Bucket=self._bucket,
            Key=self._key,
            Body=json.dumps(data, ensure_ascii=False, indent=2),
            ContentType="application/json",
        )


# ---------------------------------------------------------------------------
# 工厂函数
# ---------------------------------------------------------------------------
def get_storage() -> Storage:
    """根据 STORAGE_BACKEND 环境变量选择后端（默认 FileStorage）。"""
    if os.environ.get("STORAGE_BACKEND") == "s3":
        try:
            return S3Storage()
        except (ImportError, KeyError):
            # boto3 未安装或 S3_BUCKET 未配置，回退到本地文件
            return FileStorage()
    return FileStorage()


# ---------------------------------------------------------------------------
# 便捷函数 — 页面代码直接调用
# ---------------------------------------------------------------------------
def save_scores(scores: dict, weak_points: list) -> None:
    """保存分数和弱点到持久化存储。"""
    storage = get_storage()
    data = storage.load_progress()
    data["scores"] = scores
    data["weak_points"] = weak_points
    storage.save_progress(data)


def load_saved_progress() -> dict:
    """加载已保存的进度，保证返回结构完整。"""
    data = get_storage().load_progress()
    return {
        "scores": data.get("scores", {}),
        "weak_points": data.get("weak_points", []),
    }
