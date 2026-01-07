import unittest
from pathlib import Path

from jp_pyglet_nav.fs_graph import clamp, node_radius, project, short_path
from jp_pyglet_nav.types import Camera


class TestFsGraph(unittest.TestCase):
    def test_clamp(self) -> None:
        self.assertEqual(clamp(1.0, 2.0, 3.0), 2.0)
        self.assertEqual(clamp(4.0, 2.0, 3.0), 3.0)
        self.assertEqual(clamp(2.5, 2.0, 3.0), 2.5)

    def test_project_center(self) -> None:
        cam = Camera(yaw=0.0, pitch=0.0, dist=5.0, fov=1.0)
        pr = project((0.0, 0.0, 0.0), cam, (800.0, 600.0))
        self.assertIsNotNone(pr)
        x, y, z = pr  # type: ignore[misc]
        self.assertAlmostEqual(x, 400.0, places=4)
        self.assertAlmostEqual(y, 300.0, places=4)
        self.assertGreater(z, 0.0)

    def test_node_radius(self) -> None:
        self.assertGreater(node_radius(2.0, True), node_radius(12.0, True))

    def test_short_path(self) -> None:
        p = Path("/very/long/path/" + ("x" * 200))
        s = short_path(p, 30)
        self.assertTrue(s.startswith("…"))
        self.assertLessEqual(len(s), 30)


if __name__ == "__main__":
    unittest.main()
