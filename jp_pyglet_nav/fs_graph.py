from __future__ import annotations

import math
from pathlib import Path
from typing import List, Optional, Sequence, Tuple

from .types import Camera, Node, ScreenPoint, Vec2, Vec3


def clamp(v: float, lo: float, hi: float) -> float:
    return lo if v < lo else hi if v > hi else v


def safe_children(root: Path, limit: int) -> List[Path]:
    try:
        items = sorted(root.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
    except OSError:
        return []
    return items[: max(0, limit)]


def spiral_positions(n: int, radius: float, z_step: float) -> List[Vec3]:
    pts: List[Vec3] = []
    for i in range(n):
        a = i * 0.72
        r = radius * (0.35 + 0.65 * (i / max(1, n - 1)))
        x = math.cos(a) * r
        y = math.sin(a) * r
        z = -i * z_step
        pts.append((x, y, z))
    return pts


def make_nodes(root: Path, parent: Optional[Path], limit: int) -> List[Node]:
    children = safe_children(root, limit)
    pos = spiral_positions(len(children), radius=3.5, z_step=0.25)  # Increased radius, reduced z-step
    return [
        Node(
            path=p,
            name=p.name or str(p),
            is_dir=p.is_dir(),
            pos=pos[i],
            parent=parent,
        )
        for i, p in enumerate(children)
    ]


def rot_y(p: Vec3, a: float) -> Vec3:
    x, y, z = p
    ca, sa = math.cos(a), math.sin(a)
    return (x * ca + z * sa, y, -x * sa + z * ca)


def rot_x(p: Vec3, a: float) -> Vec3:
    x, y, z = p
    ca, sa = math.cos(a), math.sin(a)
    return (x, y * ca - z * sa, y * sa + z * ca)


def camera_space(p: Vec3, cam: Camera) -> Vec3:
    p1 = rot_y(p, cam.yaw)
    p2 = rot_x(p1, cam.pitch)
    x, y, z = p2
    return (x, y, z + cam.dist)


def project(p: Vec3, cam: Camera, size: Vec2) -> Optional[Tuple[float, float, float]]:
    x, y, z = camera_space(p, cam)
    if z <= 0.08:
        return None
    w, h = size
    s = (0.5 * w) / math.tan(cam.fov * 0.5)
    sx = (x * s) / z + w * 0.5
    sy = (-y * s) / z + h * 0.5
    return (sx, sy, z)


def node_radius(z: float, is_dir: bool) -> float:
    base = 45.0 if is_dir else 35.0  # Increased from 24/18
    return clamp(base * (2.8 / clamp(z, 0.3, 40.0)), 15.0, 80.0)  # Increased min/max


def screen_points(nodes: Sequence[Node], cam: Camera, size: Vec2) -> List[ScreenPoint]:
    pts: List[ScreenPoint] = []
    for n in nodes:
        pr = project(n.pos, cam, size)
        if pr is None:
            continue
        x, y, z = pr
        pts.append(ScreenPoint(x=x, y=y, z=z, r=node_radius(z, n.is_dir), node=n))
    pts.sort(key=lambda p: p.z, reverse=True)
    return pts


def hit_test(pts: Sequence[ScreenPoint], x: float, y: float) -> Optional[ScreenPoint]:
    for p in pts:
        dx, dy = x - p.x, y - p.y
        if dx * dx + dy * dy <= p.r * p.r:
            return p
    return None


def short_path(p: Path, max_len: int = 52) -> str:
    s = str(p)
    if len(s) <= max_len:
        return s
    return "…" + s[-(max_len - 1):]
