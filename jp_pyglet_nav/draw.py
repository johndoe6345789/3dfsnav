from __future__ import annotations

from typing import Tuple

import pyglet
from pyglet import gl

from .types import ScreenPoint

RGBA = Tuple[int, int, int, int]


def _c(c: RGBA) -> Tuple[int, int, int, int]:
    return c


def clear(bg: RGBA) -> None:
    r, g, b, a = bg
    gl.glClearColor(r / 255.0, g / 255.0, b / 255.0, a / 255.0)
    gl.glClear(gl.GL_COLOR_BUFFER_BIT)


def draw_grid(batch: pyglet.graphics.Batch, w: int, h: int,
              step: int, color: RGBA) -> None:
    verts = []
    for x in range(0, w + 1, step):
        verts.extend([x, 0, x, h])
    for y in range(0, h + 1, step):
        verts.extend([0, y, w, y])
    if not verts:
        return
    batch.add(
        len(verts) // 2,
        gl.GL_LINES,
        None,
        ("v2i", verts),
        ("c4B", list(_c(color)) * (len(verts) // 2)),
    )


def circle(batch: pyglet.graphics.Batch, x: float, y: float, r: float,
           fill: RGBA, outline: RGBA, width: float) -> None:
    seg = max(18, min(64, int(r * 1.3)))
    verts = []
    for i in range(seg):
        a = (i / seg) * 6.283185307179586
        verts.extend([x + r * (__import__('math').cos)(a), y + r * (__import__('math').sin)(a)])
    # Filled
    batch.add(
        seg,
        gl.GL_POLYGON,
        None,
        ("v2f", verts),
        ("c4B", list(_c(fill)) * seg),
    )
    # Outline
    batch.add(
        seg,
        gl.GL_LINE_LOOP,
        None,
        ("v2f", verts),
        ("c4B", list(_c(outline)) * seg),
    )
    # Width (best-effort; depends on backend)
    gl.glLineWidth(width)


def draw_node(batch: pyglet.graphics.Batch, p: ScreenPoint,
              fill: RGBA, outline: RGBA, width: float) -> None:
    circle(batch, p.x, p.y, p.r, fill=fill, outline=outline, width=width)
