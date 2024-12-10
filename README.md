# Rasterizer

Rasterize, stroke and fill lines, rectangles, curves and paths. Even without canvas.

**version: 1.0.0 in progress** (33 kB minified)

**What is not supported:**

1. `lineDash`/`lineDashOffset` (**will be** implemented, in progress)
1. `strokeText`/`fillText`/`measureText` ..  (will **not** be implemented but can be done by drawing the actual curves in the font)
2. `shadow`/`shadowBlur`/`shadowColor` .. (will **not** be implemented but is easy to do)

**note:** extreme unequal scaling (eg `scale_x >> scale_y`) produces some artifacts

**see also:**

* [CanvasLite](https://github.com/foo123/CanvasLite) an html canvas implementation in pure JavaScript
* [Rasterizer](https://github.com/foo123/Rasterizer) stroke and fill lines, rectangles, curves and paths, without canvaσ
* [Gradient](https://github.com/foo123/Gradient) create linear, radial, conic and elliptic gradients and image patterns without canvas
* [Geometrize](https://github.com/foo123/Geometrize) Computational Geometry and Rendering Library for JavaScript
* [Plot.js](https://github.com/foo123/Plot.js) simple and small library which can plot graphs of functions and various simple charts and can render to Canvas, SVG and plain HTML
* [MOD3](https://github.com/foo123/MOD3) 3D Modifier Library in JavaScript
* [HAAR.js](https://github.com/foo123/HAAR.js) image feature detection based on Haar Cascades in JavaScript (Viola-Jones-Lienhart et al Algorithm)
* [HAARPHP](https://github.com/foo123/HAARPHP) image feature detection based on Haar Cascades in PHP (Viola-Jones-Lienhart et al Algorithm)
* [FILTER.js](https://github.com/foo123/FILTER.js) video and image processing and computer vision Library in pure JavaScript (browser and node)
* [css-color](https://github.com/foo123/css-color) simple class to parse and manipulate colors in various formats



**Test/Demo:**

![line](/line.png)

![gradient thick line square](/thicklines.png)

![gradient thick line round](/thicklines2.png)

![bevel polyline join](/joinbevel.png)

![miter polyline join](/joinmiter.png)

![round polyline join](/joinround.png)

![gradient arc](/arc.png)

![gradient bezier](/bezier.png)

![gradient fill bezier nonzero](/fill-nonzero.png)

![gradient fill bezier evenodd](/fill-evenodd.png)

![stroke-fill tests](/strokes-fills.png)

![composition tests](/compositions.png)
