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


def darken(color: RGBA, factor: float) -> RGBA:
    """Darken a color by a factor (0.0 to 1.0)"""
    r, g, b, a = color
    return (int(r * factor), int(g * factor), int(b * factor), a)


def lighten(color: RGBA, factor: float) -> RGBA:
    """Lighten a color by a factor (1.0+)"""
    r, g, b, a = color
    return (min(255, int(r * factor)), min(255, int(g * factor)), min(255, int(b * factor)), a)


def draw_3d_box(batch: pyglet.graphics.Batch, x: float, y: float, 
                width: float, height: float, depth_offset: float,
                base_color: RGBA) -> None:
    """Draw a pseudo-3D box with shading to give depth"""
    depth_x = depth_offset * 0.5
    depth_y = depth_offset * 0.3
    
    # Draw back/side faces first (for depth illusion)
    # Right side face (darker)
    right_color = darken(base_color, 0.6)
    right_x = x + width/2
    pyglet.shapes.Rectangle(
        right_x, y, depth_x, height,
        color=right_color, batch=batch
    )
    
    # Top face (medium brightness)
    top_color = base_color
    top_y = y + height
    pyglet.shapes.Rectangle(
        x - width/2, top_y, width, depth_y,
        color=top_color, batch=batch
    )
    
    # Top-right corner fill
    pyglet.shapes.Rectangle(
        right_x, top_y, depth_x, depth_y,
        color=darken(base_color, 0.8), batch=batch
    )
    
    # Front face (brightest) - main visible surface
    front_color = lighten(base_color, 1.3)
    pyglet.shapes.Rectangle(
        x - width/2, y, width, height,
        color=front_color, batch=batch
    )
    
    # Outline for definition
    outline_color = (255, 255, 255, 100)  # Semi-transparent white
    # Front rectangle outline
    pyglet.shapes.Line(x - width/2, y, x + width/2, y, 
                      thickness=1, color=outline_color, batch=batch)
    pyglet.shapes.Line(x + width/2, y, x + width/2, y + height,
                      thickness=1, color=outline_color, batch=batch)
    pyglet.shapes.Line(x + width/2, y + height, x - width/2, y + height,
                      thickness=1, color=outline_color, batch=batch)
    pyglet.shapes.Line(x - width/2, y + height, x - width/2, y,
                      thickness=1, color=outline_color, batch=batch)


def draw_pedestal(batch: pyglet.graphics.Batch, x: float, y: float,
                  width: float, height: float, depth: float, color: RGBA) -> None:
    """Draw a 3D pedestal (for directories)"""
    draw_3d_box(batch, x, y - height/2, width, height, depth, color)


def draw_file_box(batch: pyglet.graphics.Batch, x: float, y: float,
                  size: float, depth: float, color: RGBA) -> None:
    """Draw a small 3D box (for files)"""
    draw_3d_box(batch, x, y, size, size * 0.7, depth, color)


def draw_wire(batch: pyglet.graphics.Batch, x1: float, y1: float,
              x2: float, y2: float, color: RGBA) -> None:
    """Draw a connecting wire between nodes"""
    pyglet.shapes.Line(x1, y1, x2, y2, thickness=2, color=color, batch=batch)


def draw_node(batch: pyglet.graphics.Batch, p: ScreenPoint,
              fill: RGBA, outline: RGBA, width: float, is_dir: bool) -> None:
    """Draw a node as either a pedestal (directory) or file box"""
    if is_dir:
        # Draw as a tall pedestal - taller rectangular structure
        pedestal_width = p.r * 1.4
        pedestal_height = p.r * 2.2
        depth = p.r * 0.7
        draw_pedestal(batch, p.x, p.y, pedestal_width, pedestal_height, depth, fill)
        
        # Add highlight on hover
        if width > 1.5:
            highlight = lighten(fill, 1.5)
            pyglet.shapes.Rectangle(
                p.x - pedestal_width/2 + 2, p.y - pedestal_height/2 + 2,
                4, pedestal_height - 4,
                color=highlight, batch=batch
            )
    else:
        # Draw as a smaller box - files are smaller cubes
        box_size = p.r * 1.0
        depth = p.r * 0.5
        draw_file_box(batch, p.x, p.y, box_size, depth, fill)
        
        # Add highlight on hover
        if width > 1.5:
            highlight = lighten(fill, 1.5)
            pyglet.shapes.Rectangle(
                p.x - box_size/2 + 1, p.y + 1,
                3, 3,
                color=highlight, batch=batch
            )
