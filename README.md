# Rasterizer

Rasterize, stroke and fill lines, rectangles, curves and paths. Even without canvas.

**version: 0.9.8** (25 kB minified)

**What is not supported yet:**

1. `"round"` `lineCap` and `lineJoin` is partially implemented
2. `lineDash/lineDashOffset` (will be implemented)
2. text (`strokeText`, `fillText`, ..)  (will **not** be implemented but can be simulated by drawing the actual curves in the font)


**Test/Demo:**

![line](/line.png)

![gradient thick line](/thicklines.png)

![bevel polyline join](/joinbevel.png)

![miter polyline join](/joinmiter.png)

![gradient arc](/arc.png)

![gradient bezier](/bezier.png)

![gradient fill bezier nonzero](/fill-nonzero.png)

![gradient fill bezier evenodd](/fill-evenodd.png)

![stroke-fill tests](/strokes-fills.png)

![composition tests](/compositions.png)
