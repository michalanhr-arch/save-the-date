"""Builds the hand-written "Save the Date" SVG used by index.html.

The glyphs come from Priestacy as filled outlines. To animate them as if written
with a pen, each glyph is rasterised, thinned to its centre line, and the centre
line is traced into pen strokes in writing order. Those strokes become a mask
that main.js draws stroke by stroke, revealing the letters underneath.

Run with a Python that has fonttools, uharfbuzz, scikit-image and numpy:
    python tools/handwriting.py > assets/save-the-date.svg
"""
import sys
from pathlib import Path

import numpy as np
import uharfbuzz as hb
from fontTools.pens.basePen import BasePen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from scipy import ndimage
from skimage.draw import polygon as fill_polygon
from skimage.morphology import skeletonize

TEXT = "Save the Date"
FONT = Path(__file__).resolve().parent.parent / "fonts/english/Priestacy.otf"
RASTER_SCALE = 0.3  # raster pixels per font unit
MIN_STROKE_PX = 14

# Pen-stroke overrides, keyed by component index (left to right): where the pen starts,
# as a fraction of the component's bounding box (0,0 = top-left).
START_HINTS = {}
# Hand corrections to the traced order: (stroke index, new position, reverse direction).
# The D's stem is traced bottom-up after its bowl; a pen draws it top-down first.
MOVES = [(24, 23, True)]


class FlattenPen(BasePen):
    """Collects outline contours as polylines, flattening curves."""

    def __init__(self, glyphset):
        super().__init__(glyphset)
        self.contours, self.cur = [], []

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _curveToOne(self, p1, p2, p3):
        p0 = self.cur[-1]
        for t in np.linspace(0, 1, 12)[1:]:
            mt = 1 - t
            self.cur.append(tuple(mt**3 * np.array(p0) + 3 * mt * mt * t * np.array(p1)
                                  + 3 * mt * t * t * np.array(p2) + t**3 * np.array(p3)))

    def _qCurveToOne(self, p1, p2):
        p0 = self.cur[-1]
        for t in np.linspace(0, 1, 10)[1:]:
            mt = 1 - t
            self.cur.append(tuple(mt * mt * np.array(p0) + 2 * mt * t * np.array(p1) + t * t * np.array(p2)))

    def _closePath(self):
        if self.cur:
            self.contours.append(self.cur)
        self.cur = []

    _endPath = _closePath


def shape(font_path, text):
    blob = hb.Blob.from_file_path(str(font_path))
    font = hb.Font(hb.Face(blob))
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True, "calt": True})
    x, out = 0, []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        out.append((info.codepoint, x + pos.x_offset, pos.y_offset))
        x += pos.x_advance
    return out


def main():
    tt = TTFont(str(FONT))
    order = tt.getGlyphOrder()
    gs = tt.getGlyphSet()
    asc = tt["hhea"].ascent

    svg_pen = SVGPathPen(gs)
    flat = FlattenPen(gs)
    for gid, x, y in shape(FONT, TEXT):
        glyph = gs[order[gid]]
        # Font units have y pointing up; SVG has y pointing down
        m = (1, 0, 0, -1, x, asc - y)
        glyph.draw(TransformPen(svg_pen, m))
        glyph.draw(TransformPen(flat, m))

    pts = np.concatenate([np.array(c) for c in flat.contours])
    minx, miny = pts.min(0) - 40
    maxx, maxy = pts.max(0) + 40
    w, h = int((maxx - minx) * RASTER_SCALE) + 1, int((maxy - miny) * RASTER_SCALE) + 1

    # Even-odd fill: each contour toggles the pixels it covers
    ink = np.zeros((h, w), bool)
    for c in flat.contours:
        c = (np.array(c) - (minx, miny)) * RASTER_SCALE
        rr, cc = fill_polygon(c[:, 1], c[:, 0], (h, w))
        ink[rr, cc] ^= True

    thickness = ndimage.distance_transform_edt(ink).max() * 2
    skel = skeletonize(ink)
    labels, n = ndimage.label(skel, structure=np.ones((3, 3)))

    def neighbours(p, pool):
        y, x = p
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                q = (y + dy, x + dx)
                if q != p and q in pool:
                    yield q

    components = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(labels == i)
        if len(ys) < MIN_STROKE_PX:
            continue
        components.append(set(zip(ys.tolist(), xs.tolist())))
    components.sort(key=lambda s: min(p[1] for p in s))

    strokes = []
    for ci, pool in enumerate(components):
        remaining = set(pool)
        visit_order = []
        ends = [p for p in pool if sum(1 for _ in neighbours(p, pool)) == 1]
        ys = [p[0] for p in pool]
        xs = [p[1] for p in pool]
        if ci in START_HINTS:
            fx, fy = START_HINTS[ci]
            target = (min(ys) + fy * (max(ys) - min(ys)), min(xs) + fx * (max(xs) - min(xs)))
        else:
            target = (np.mean(ys), min(xs))
        cands = ends or list(pool)
        start = min(cands, key=lambda p: (p[0] - target[0]) ** 2 + (p[1] - target[1]) ** 2)

        line = []
        while remaining:
            if start is None:
                # Lift the pen and continue from the earliest branch point that still has ink left
                branch = next((p for p in visit_order if any(True for _ in neighbours(p, remaining))), None)
                if branch is None:
                    start, line = min(remaining, key=lambda p: p[1]), []
                else:
                    start, line = next(neighbours(branch, remaining)), [branch]
            p = start
            remaining.discard(p)
            visit_order.append(p)
            line.append(p)
            while True:
                nxt = list(neighbours(p, remaining))
                if not nxt:
                    break
                if len(line) >= 2:
                    ref = np.array(line[-1]) - np.array(line[max(0, len(line) - 6)])
                    nxt.sort(key=lambda q: -np.dot(ref, np.array(q) - np.array(p))
                             / (np.linalg.norm(ref) + 1e-9) / np.linalg.norm(np.array(q) - np.array(p)))
                else:
                    # Prefer 4-neighbours so the walk does not skip along diagonals
                    nxt.sort(key=lambda q: abs(q[0] - p[0]) + abs(q[1] - p[1]))
                p = nxt[0]
                remaining.discard(p)
                visit_order.append(p)
                line.append(p)
            if len(line) >= MIN_STROKE_PX:
                strokes.append(line)
            start = None

    for index, position, reverse in MOVES:
        stroke = strokes.pop(index)
        strokes.insert(position, stroke[::-1] if reverse else stroke)

    def to_units(p):
        y, x = p
        return x / RASTER_SCALE + minx, y / RASTER_SCALE + miny

    def simplify(line, eps=1.2):
        """Ramer-Douglas-Peucker in raster pixels."""
        pts = np.array(line, float)
        if len(pts) < 3:
            return pts
        a, b = pts[0], pts[-1]
        ab = b - a
        norm = np.linalg.norm(ab)
        if norm == 0:
            d = np.linalg.norm(pts - a, axis=1)
        else:
            d = np.abs(ab[0] * (pts[:, 1] - a[1]) - ab[1] * (pts[:, 0] - a[0])) / norm
        i = int(np.argmax(d))
        if d[i] > eps:
            return np.vstack([simplify(pts[: i + 1], eps)[:-1], simplify(pts[i:], eps)])
        return np.vstack([a, b])

    vb = f"{minx:.0f} {miny:.0f} {maxx - minx:.0f} {maxy - miny:.0f}"
    brush = thickness / RASTER_SCALE * 1.35
    out = [
        f'<svg class="script" viewBox="{vb}" role="img" aria-label="{TEXT}">',
        '  <defs>',
        # The default mask region is measured from 0,0, not from the viewBox, and would crop the glyphs
        f'    <mask id="script-pen" maskUnits="userSpaceOnUse" x="{minx - brush:.0f}" y="{miny - brush:.0f}" '
        f'width="{maxx - minx + 2 * brush:.0f}" height="{maxy - miny + 2 * brush:.0f}">',
        f'      <g fill="none" stroke="#fff" stroke-width="{brush:.0f}" stroke-linecap="round" stroke-linejoin="round">',
    ]
    for line in strokes:
        pts = [to_units(p) for p in simplify(line)]
        d = "M" + " L".join(f"{x:.0f} {y:.0f}" for x, y in pts)
        out.append(f'        <path pathLength="1" d="{d}"/>')
    out += [
        '      </g>',
        '    </mask>',
        '    <pattern id="script-grain" patternUnits="userSpaceOnUse" width="7000" height="7000">',
        '      <image id="script-grain-image" width="7000" height="7000"/>',
        '    </pattern>',
        '  </defs>',
        '  <g class="script__pen" mask="url(#script-pen)">',
        f'    <path id="script-glyphs" class="script__ink" d="{svg_pen.getCommands()}"/>',
        '    <use href="#script-glyphs" fill="url(#script-grain)"/>',
        '  </g>',
        '</svg>',
    ]
    print("\n".join(out))
    print(f"{len(strokes)} strokes, brush {brush:.0f}", file=sys.stderr)


if __name__ == "__main__":
    main()
