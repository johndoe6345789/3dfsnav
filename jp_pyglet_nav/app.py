from __future__ import annotations

import os
import sys
from dataclasses import replace
from pathlib import Path
from typing import List, Optional, Tuple

import pyglet
from pyglet.window import key, mouse

from .draw import clear, draw_grid, draw_node, draw_wire
from .fs_graph import hit_test, make_nodes, screen_points, short_path
from .style import (
    ACCENT,
    BG,
    FG,
    FG_DIM,
    GRID,
    NODE_DIR,
    FILE_NEW,
    FILE_MID,
    FILE_OLD,
    WARN,
    WIRE,
)
from .types import Camera, ScreenPoint


def _home_root() -> Path:
    return Path.home()


def _safe_open(path: Path) -> None:
    try:
        if sys.platform.startswith("win"):
            os.startfile(str(path))  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            os.system(f"open {str(path)!r}")
        else:
            os.system(f"xdg-open {str(path)!r}")
    except Exception:
        return


class NavigatorWindow(pyglet.window.Window):
    def __init__(self) -> None:
        super().__init__(1100, 720, caption="Jurassic UNIX Navigator (pyglet)",
                         resizable=True, vsync=True)
        self.path = _home_root()
        self.limit = 140
        self.nodes = make_nodes(self.path, parent=self.path.parent, limit=self.limit)

        self.cam = Camera(yaw=0.3, pitch=0.4, dist=4.5, fov=1.2)
        self.pts: List[ScreenPoint] = []
        self.hover: Optional[ScreenPoint] = None

        self._drag: Optional[Tuple[int, int]] = None

        self.hud = pyglet.text.Label(
            "",
            font_name="Courier New",
            font_size=10,
            x=10,
            y=10,
            anchor_x="left",
            anchor_y="bottom",
            color=FG_DIM,
        )
        self.head_left = pyglet.text.Label(
            "FSN / Jurassic Mode",
            font_name="Courier New",
            font_size=11,
            weight="bold",
            x=12,
            y=self.height - 18,
            anchor_x="left",
            anchor_y="top",
            color=ACCENT,
        )
        self.head_right = pyglet.text.Label(
            "IT'S A UNIX SYSTEM",
            font_name="Courier New",
            font_size=11,
            weight="bold",
            x=self.width - 12,
            y=self.height - 18,
            anchor_x="right",
            anchor_y="top",
            color=FG_DIM,
        )
        self.hint = pyglet.text.Label(
            "",
            font_name="Courier New",
            font_size=10,
            x=12,
            y=self.height - 44,
            anchor_x="left",
            anchor_y="top",
            color=WARN,
        )
        self._refresh()

    def _refresh(self) -> None:
        self.set_caption(f"Jurassic UNIX Navigator (pyglet) — {self.path}")
        help_text = "Drag=rotate  Enter=open  Backspace=up  Wheel=zoom  Esc=quit"
        self.hud.text = f"{short_path(self.path)}   |   {help_text}"
        self.nodes = make_nodes(self.path, parent=self.path.parent, limit=self.limit)
        self.hover = None
        self._compute()

    def _compute(self) -> None:
        self.pts = screen_points(self.nodes, self.cam, (float(self.width),
                                                       float(self.height)))

    def on_resize(self, width: int, height: int) -> None:
        super().on_resize(width, height)
        self.head_right.x = width - 12
        self.head_left.y = height - 18
        self.head_right.y = height - 18
        self.hint.y = height - 44
        self._compute()

    def on_draw(self) -> None:
        clear(BG)
        batch = pyglet.graphics.Batch()
        draw_grid(batch, self.width, self.height, step=60, color=GRID)

        # Draw connecting wires first (behind nodes)
        for i, p in enumerate(self.pts):
            if p.node.parent and p.node.parent != p.node.path.parent:
                # Find parent node in pts
                for parent_p in self.pts:
                    if parent_p.node.path == p.node.parent:
                        draw_wire(batch, parent_p.x, parent_p.y, p.x, p.y, WIRE)
                        break

        # Draw nodes on top
        for p in self.pts:
            # Use age-based colors for files (simulate with simple variation)
            if p.node.is_dir:
                fill = NODE_DIR
            else:
                # Vary file colors based on name hash for visual variety
                h = hash(p.node.name) % 3
                if h == 0:
                    fill = FILE_NEW
                elif h == 1:
                    fill = FILE_MID
                else:
                    fill = FILE_OLD
            
            is_hover = self.hover and self.hover.node.path == p.node.path
            outline = FG if is_hover else FG_DIM
            width = 2.0 if is_hover else 1.0
            draw_node(batch, p, fill=fill, outline=outline, width=width, is_dir=p.node.is_dir)

        batch.draw()

        self.head_left.draw()
        self.head_right.draw()
        self.hud.draw()
        if self.hover:
            n = self.hover.node
            tag = "dir" if n.is_dir else "file"
            self.hint.text = f"{tag}: {short_path(n.path, 120)}"
            self.hint.draw()

    def _zoom(self, d: float) -> None:
        self.cam = replace(self.cam, dist=max(2.2, min(18.0, self.cam.dist + d)))
        self._compute()

    def _go_up(self) -> None:
        if self.path.parent == self.path:
            return
        self.path = self.path.parent
        self._refresh()

    def _open_selected(self) -> None:
        if not self.hover:
            return
        n = self.hover.node
        if n.is_dir:
            self.path = n.path
            self._refresh()
            return
        _safe_open(n.path)

    def on_mouse_motion(self, x: int, y: int, dx: int, dy: int) -> None:
        h = hit_test(self.pts, float(x), float(y))
        if (h is None) != (self.hover is None):
            self.hover = h
            return
        if h and self.hover and h.node.path != self.hover.node.path:
            self.hover = h

    def on_mouse_press(self, x: int, y: int, button: int, modifiers: int) -> None:
        if button == mouse.LEFT:
            self._drag = (x, y)

    def on_mouse_drag(self, x: int, y: int, dx: int, dy: int,
                      buttons: int, modifiers: int) -> None:
        if not self._drag:
            return
        self.cam = replace(
            self.cam,
            yaw=self.cam.yaw + dx * 0.008,
            pitch=max(-1.2, min(1.2, self.cam.pitch + dy * 0.006)),
        )
        self._compute()

    def on_mouse_release(self, x: int, y: int, button: int,
                         modifiers: int) -> None:
        if button == mouse.LEFT:
            self._drag = None
            h = hit_test(self.pts, float(x), float(y))
            if h:
                self.hover = h
                self._open_selected()

    def on_mouse_scroll(self, x: int, y: int, scroll_x: float,
                        scroll_y: float) -> None:
        self._zoom(-0.5 * float(scroll_y))

    def on_key_press(self, symbol: int, modifiers: int) -> None:
        if symbol == key.ESCAPE:
            self.close()
            return
        if symbol == key.BACKSPACE:
            self._go_up()
            return
        if symbol == key.ENTER:
            self._open_selected()
            return
        if symbol in (key.PLUS, key.NUM_ADD, key.EQUAL):
            self._zoom(-0.4)
            return
        if symbol in (key.MINUS, key.NUM_SUBTRACT):
            self._zoom(0.4)
            return


def main() -> int:
    NavigatorWindow()
    pyglet.app.run()
    return 0
