from __future__ import annotations

from typing import Tuple

import pyglet
import pyglet.shapes
from pyglet import gl

from .types import ScreenPoint

RGBA = Tuple[int, int, int, int]


def clear(bg: RGBA) -> None:
    r, g, b, a = bg
    gl.glClearColor(r / 255.0, g / 255.0, b / 255.0, a / 255.0)
    gl.glClear(gl.GL_COLOR_BUFFER_BIT)


def draw_grid(batch: pyglet.graphics.Batch, w: int, h: int,
              step: int, color: RGBA) -> None:
    # Draw vertical lines
    for x in range(0, w + 1, step):
        pyglet.shapes.Line(x, 0, x, h, thickness=1, color=color, batch=batch)
    # Draw horizontal lines
    for y in range(0, h + 1, step):
        pyglet.shapes.Line(0, y, w, y, thickness=1, color=color, batch=batch)


def circle(batch: pyglet.graphics.Batch, x: float, y: float, r: float,
           fill: RGBA, outline: RGBA, width: float) -> None:
    seg = max(18, min(64, int(r * 1.3)))
    # Draw filled circle
    pyglet.shapes.Circle(x, y, r, segments=seg, color=fill, batch=batch)
    # Draw outline as an arc with full angle
    pyglet.shapes.Arc(x, y, r, segments=seg, angle=360.0, thickness=width,
                      color=outline, batch=batch)


def draw_node(batch: pyglet.graphics.Batch, p: ScreenPoint,
              fill: RGBA, outline: RGBA, width: float) -> None:
    circle(batch, p.x, p.y, p.r, fill=fill, outline=outline, width=width)
