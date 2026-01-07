from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

Vec3 = Tuple[float, float, float]
Vec2 = Tuple[float, float]


@dataclass(frozen=True)
class Node:
    path: Path
    name: str
    is_dir: bool
    pos: Vec3
    parent: Optional[Path]


@dataclass(frozen=True)
class Camera:
    yaw: float
    pitch: float
    dist: float
    fov: float


@dataclass(frozen=True)
class ScreenPoint:
    x: float
    y: float
    z: float
    r: float
    node: Node
