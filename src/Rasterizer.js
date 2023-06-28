/**
*   Rasterizer
*   rasterize, draw and fill lines, rectangles and curves
*
*   @version 1.0.0
*   https://github.com/foo123/Rasterizer
*
**/
!function(root, name, factory) {
"use strict";
if (('object' === typeof module) && module.exports) /* CommonJS */
    module.exports = factory.call(root);
else if (('function' === typeof define) && define.amd && ('function' === typeof require) && ('function' === typeof require.specified) && require.specified(name) /*&& !require.defined(name)*/) /* AMD */
    define(name, ['module'], function(module) {return factory.call(root);});
else if (!(name in root)) /* Browser/WebWorker/.. */
    (root[name] = factory.call(root)||1) && ('function' === typeof(define)) && define.amd && define(function() {return root[name];});
}(  /* current root */          'undefined' !== typeof self ? self : this,
    /* module name */           "Rasterizer",
    /* module factory */        function ModuleFactory__Rasterizer(undef) {
"use strict";

var HAS = Object.prototype.hasOwnProperty,
    def = Object.defineProperty,
    stdMath = Math, INF = Infinity,
    EPS = 1e-6, sqrt2 = stdMath.sqrt(2),
    NUM_POINTS = 20, PIXEL_SIZE = 1,
    PI = stdMath.PI, EMPTY_ARR = [],
    NOOP = function() {},
    ImArray = 'undefined' !== typeof Uint8ClampedArray ? Uint8ClampedArray : ('undefined' !== typeof Uint8Array ? Uint8Array : Array);

function Rasterizer(width, height, set_rgba_at)
{
    var self = this;
    if (!(self instanceof Rasterizer)) return new Rasterizer(width, height, set_rgba_at);

    var get_stroke_at = Rasterizer.getRGBAFrom([0, 0, 0, 1]),
        get_fill_at = Rasterizer.getRGBAFrom([0, 0, 0, 1]),
        stroke_pixel, fill_pixel,
        lineCap = 'butt', lineJoin = 'miter',
        lineWidth = 1, lineDash = [];

    stroke_pixel = function stroke_pixel(x, y, i) {
        if (0 <= x && x < width && 0 <= y && y < height && 0 < i)
        {
            var c = get_stroke_at(x, y),
                a0 = 3 < c.length ? c[3] : 1.0,
                a1 = i, ao;
            if (0 < a0)
            {
                ao = a0*a1; //a1 + a0*(1.0 - a1);
                set_rgba_at(x, y, c[0], c[1], c[2], ao);
            }
        }
    };
    fill_pixel = function fill_pixel(x, y, i) {
        if (0 <= x && x < width && 0 <= y && y < height && 0 < i)
        {
            var c = get_fill_at(x, y),
                a0 = 3 < c.length ? c[3] : 1.0,
                a1 = i, ao;
            if (0 < a0)
            {
                ao = a0*a1; //a1 + a0*(1.0 - a1);
                set_rgba_at(x, y, c[0], c[1], c[2], ao);
            }
        }
    };

    def(self, 'strokeStyle', {
        get: function() {
            return '';
        },
        set: function(c) {
           get_stroke_at = Rasterizer.getRGBAFrom(c);
        }
    });

    def(self, 'fillStyle', {
        get: function() {
            return '';
        },
        set: function(c) {
           get_fill_at = Rasterizer.getRGBAFrom(c);
        }
    });

    def(self, 'lineWidth', {
        get: function() {
            return lineWidth;
        },
        set: function(lw) {
            lineWidth = stdMath.abs((+lw) || 0);
        }
    });

    def(self, 'lineCap', {
        get: function() {
            return lineCap;
        },
        set: function(lc) {
            lc = String(lc).toLowerCase();
            if (-1 !== ['butt', 'square'].indexOf(lc))
            {
                // only 'butt' and 'square' lineCap supported
                lineCap = lc;
            }
        }
    });

    def(self, 'lineJoin', {
        get: function() {
            return lineJoin;
        },
        set: function(lj) {
            lj = String(lj).toLowerCase();
            if (-1 !== ['miter','bevel'].indexOf(lj))
            {
                // only 'miter' and 'bevel' lineJoin supported
                lineJoin = lj;
            }
        }
    });

    def(self, 'lineDash', {
        get: function() {
            return lineDash.slice();
        },
        set: function(ld) {
            ld = [].concat(ld);
            if (ld.length & 1) ld = ld.concat(ld);
            lineDash = ld;
        }
    });
    self.setLineDash = function(ld) {
        self.lineDash = ld;
    };

    self.strokeRect = function(x, y, w, h) {
        if (1 <= w && 1 <= h && 0 < lineWidth)
        {
            draw_line(stroke_pixel, x, y, x + w - 1, y, lineWidth, lineDash, 'butt', 'miter', 0, 0, width - 1, height - 1);
            draw_line(stroke_pixel, x + w - 1, y, x + w - 1, y + h - 1, lineWidth, lineDash, 'butt', 'miter', 0, 0, width - 1, height - 1);
            draw_line(stroke_pixel, x + w - 1, y + h - 1, x, y + h - 1, lineWidth, lineDash, 'butt', 'miter', 0, 0, width - 1, height - 1);
            draw_line(stroke_pixel, x, y + h - 1, x, y, lineWidth, lineDash, 'butt', 'miter', 0, 0, width - 1, height - 1);
        }
        return self;
    };
    self.fillRect = function(x, y, w, h) {
        if (1 <= w && 1 <= h)
        {
            fill_rectangular(fill_pixel, x, y, x + w - 1, y + h - 1, 0, 0, width - 1, height - 1);
        }
        return self;
    };
    self.drawLine = function(x1, y1, x2, y2) {
        if (0 < lineWidth)
        {
            draw_line(stroke_pixel, x1, y1, x2, y2, lineWidth, lineDash, lineCap, lineJoin, 0, 0, width - 1, height - 1);
        }
        return self;
    };
    self.joinLines = function(x1, y1, x2, y2, x3, y3) {
        if (0 < lineWidth)
        {
            join_lines(stroke_pixel, x1, y1, x2, y2, x3, y3, lineWidth, lineJoin);
        }
        return self;
    };
    self.drawArc = function(cx, cy, rx, ry, angle, start, end, fs) {
        if (0 < lineWidth)
        {
            var t0, t1;
            if (fs)
            {
                t0 = -end - PI;
                t1 = start;
            }
            else
            {
                t0 = start;
                t1 = end;
            }
            draw_arc(stroke_pixel, cx, cy, rx, ry, angle, t0, t1, lineWidth, lineDash, lineCap, lineJoin, 0, 0, width - 1, height - 1);
        }
        return self;
    };
    self.drawBezier = function(controls) {
        if (0 < lineWidth && 2 <= controls.length)
        {
            if (2 === controls.length)
            {
                draw_line(stroke_pixel, controls[0].x, controls[0].y, controls[1].x, controls[1].y, lineWidth, lineDash, lineCap, lineJoin, 0, 0, width - 1, height - 1);
            }
            else
            {
                draw_bezier(stroke_pixel, controls, lineWidth, lineDash, lineCap, lineJoin, 0, 0, width - 1, height - 1);
            }
        }
        return self;
    };
}
Rasterizer.VERSION = '1.0.0';
Rasterizer.prototype = {
    constructor: Rasterizer,
    strokeStyle: null,
    fillStyle: null,
    lineWidth: null,
    lineCap: null,
    lineJoin: null,
    setLineDash: null,
    strokeRect: null,
    fillRect: null,
    drawLine: null,
    drawArc: null,
    drawBezier: null
};
Rasterizer.createImageData = function(width, height) {
    return {
        data: new ImArray((width*height) << 2),
        width: width,
        height: height
    };
};
Rasterizer.getRGBAFrom = function(RGBA) {
    if ('function' === typeof RGBA)
    {
        return function(x, y) {
            var c = RGBA(x, y);
            return [c[0], c[1], c[2], 3 < c.length ? c[3]/255 : 1.0];
        };
    }
    else
    {
        var c = [RGBA[0], RGBA[1], RGBA[2], 3 < RGBA.length ? RGBA[3]/255 : 1.0];
        return function(x, y) {
            return c;
        };
    }
};
Rasterizer.setRGBATo = function(IMG) {
    if ('function' === typeof IMG)
    {
        return function(x, y, r, g, b, af) {
            if (0 < af) IMG(x, y, r, g, b, clamp(stdMath.round(255*af), 0, 255));
        };
    }
    else
    {
        var width = IMG.width, height = IMG.height, data = IMG.data;
        return function(x, y, r, g, b, af) {
            if (0 <= x && x < width && 0 <= y && y < height && 0 < af)
            {
                var index = (x + width*y) << 2,
                    r0 = data[index  ],
                    g0 = data[index+1],
                    b0 = data[index+2],
                    a0 = data[index+3]/255,
                    a1 = af,
                    ao = a1 + a0*(1 - a1);
                // do alpha composition (over operation)
                if (0 < ao)
                {
                    data[index  ] = clamp(stdMath.round((r*a1 + r0*a0*(1 - a1))/ao), 0, 255);
                    data[index+1] = clamp(stdMath.round((g*a1 + g0*a0*(1 - a1))/ao), 0, 255);
                    data[index+2] = clamp(stdMath.round((b*a1 + b0*a0*(1 - a1))/ao), 0, 255);
                    data[index+3] = clamp(stdMath.round(255*ao), 0, 255);
                }
            }
        };
    }
};

function fill_rectangular(set_pixel, x1, y1, x2, y2, xmin, ymin, xmax, ymax)
{
    var xm = stdMath.min(x1, x2), xM = stdMath.max(x1, x2),
        ym = stdMath.min(y1, y2), yM = stdMath.max(y1, y2);

    // if rect is outside viewport return
    if (!(xM > xmin && xm < xmax && yM > ymin && ym < ymax)) return;

    // clip it to viewport if needed
    if (xm < xmin || xM > xmax || ym < ymin || yM > ymax)
    {
        xm = stdMath.max(xm, xmin);
        ym = stdMath.max(ym, ymin);
        xM = stdMath.min(xM, xmax);
        yM = stdMath.min(yM, ymax);
    }
    fill_rect(set_pixel, stdMath.round(xm), stdMath.round(ym), stdMath.round(xM), stdMath.round(yM));
}

function draw_line(set_pixel, x1, y1, x2, y2, lw, ld, lc, lj, xmin, ymin, xmax, ymax)
{
    var xm = stdMath.min(x1, x2), xM = stdMath.max(x1, x2),
        ym = stdMath.min(y1, y2), yM = stdMath.max(y1, y2);

    // if line is outside viewport return
    if (!(xM > xmin && xm < xmax && yM > ymin && ym < ymax)) return;

    // clip it to viewport if needed
    if (xm < xmin || xM > xmax || ym < ymin || yM > ymax)
    {
        var clipped = clip(x1, y1, x2, y2, xmin, ymin, xmax, ymax);
        if (!clipped) return;
        x1 = clipped[0];
        y1 = clipped[1];
        x2 = clipped[2];
        y2 = clipped[3];
    }

    var x, y, dx, dy, sx, sy, s, r, n,
        k = 0, dl = ld.length, dk, on_line = 1;

    dx = x2 - x1;
    dy = y2 - y1;
    sx = sign(dx);
    sy = sign(dy);

    if (0 === dx && 0 === dy)
    {
        // degenerates to a point
        set_pixel(stdMath.round(x1), stdMath.round(y1), 1);
    }
    else if (stdMath.abs(dy) > stdMath.abs(dx))
    {
        s = stdMath.abs(dy)/hypot(dx, dy);
        r = dx/dy;
        dk = stdMath.min(stdMath.abs(y2 - y1), dl ? s*ld[k] : INF);
        for (;;)
        {
            y = y1 + sy*dk;
            x = x1 + (y - y1)*r;
            if (on_line) wu_thick_line(set_pixel, x1, y1, x, y, lw, lc, lc);
            x1 = x;
            y1 = y;
            if (stdMath.abs(y2 - y1) < 0.5) return;
            k = k+1 < dl ? (k+1) : 0;
            dk = stdMath.min(stdMath.abs(y2 - y1), dl ? s*ld[k] : INF);
            on_line = 1 - (k&1);
        }
    }
    else
    {
        s = stdMath.abs(dx)/hypot(dx, dy);
        r = dy/dx;
        dk = stdMath.min(stdMath.abs(x2 - x1), dl ? s*ld[k] : INF);
        for (;;)
        {
            x = x1 + sx*dk;
            y = y1 + (x - x1)*r;
            if (on_line) wu_thick_line(set_pixel, x1, y1, x, y, lw, lc, lc);
            x1 = x;
            y1 = y;
            if (stdMath.abs(x2 - x1) < 0.5) return;
            k = k+1 < dl ? (k+1) : 0;
            dk = stdMath.min(stdMath.abs(x2 - x1), dl ? s*ld[k] : INF);
            on_line = 1 - (k&1);
        }
    }
}
function draw_arc(set_pixel, cx, cy, rx, ry, a, t0, t1, lw, ld, lc, lj, xmin, ymin, xmax, ymax)
{
    var n, i, p, q,
        cos = stdMath.cos(a),
        sin = stdMath.sin(a),
        arc = function(t) {
            var p = t0 + t*(t1 - t0),
                x = rx*stdMath.cos(p),
                y = ry*stdMath.sin(p);
            return {
                x: cx + cos*x - sin*y,
                y: cy + sin*x + cos*y
            };
        },
        points = sample_curve(arc, NUM_POINTS, PIXEL_SIZE, true);
    for (i=0,n=points.length-1; i<n; ++i)
    {
        p = points[i];
        q = points[i+1];
        draw_line(set_pixel, p.x, p.y, q.x, q.y, lw, ld, lc, lj, xmin, ymin, xmax, ymax);
    }
}
function draw_bezier(set_pixel, c, lw, ld, lc, lj, xmin, ymin, xmax, ymax)
{
    var n, i, p, q,
        bezier2 = function(t) {
           var t0 = t, t1 = 1 - t, t11 = t1*t1, t10 = 2*t1*t0, t00 = t0*t0;
           return {
               x: t11*c[0].x + t10*c[1].x + t00*c[2].x,
               y: t11*c[0].y + t10*c[1].y + t00*c[2].y
           };
        },
        bezier3 = function(t) {
            var t0 = t, t1 = 1 - t,
                t0t0 = t0*t0, t1t1 = t1*t1,
                t111 = t1t1*t1, t000 = t0t0*t0,
                t110 = 3*t1t1*t0, t100 = 3*t0t0*t1;
           return {
               x: t111*c[0].x + t110*c[1].x + t100*c[2].x + t000*c[3].x,
               y: t111*c[0].y + t110*c[1].y + t100*c[2].y + t000*c[3].y
           };
        },
        points = sample_curve(3 < c.length ? bezier3 : bezier2, NUM_POINTS, PIXEL_SIZE, true);
    for (i=0,n=points.length-1; i<n; ++i)
    {
        p = points[i];
        q = points[i+1];
        draw_line(set_pixel, p.x, p.y, q.x, q.y, lw, ld, lc, lj, xmin, ymin, xmax, ymax);
    }
}

// utilities -----------------------
function clamp(x, min, max)
{
    return stdMath.min(stdMath.max(x, min), max);
}
function sign(x)
{
    return 0 > x ? -1 : 1;
}
function is_almost_equal(a, b)
{
    return stdMath.abs(a - b) < EPS;
}
function is_strictly_equal(a, b)
{
    return stdMath.abs(a - b) < Number.EPSILON;
}
function clip(x1, y1, x2, y2, xmin, ymin, xmax, ymax)
{
    // clip points to viewport
    // https://en.wikipedia.org/wiki/Liang%E2%80%93Barsky_algorithm
    var p1 = -(x2 - x1),
        p2 = -p1,
        p3 = -(y2 - y1),
        p4 = -p3,
        q1 = x1 - xmin,
        q2 = xmax - x1,
        q3 = y1 - ymin,
        q4 = ymax - y1,
        rn2 = 1, rn1 = 0,
        r1, r2, r3, r4;

    if ((p1 === 0 && q1 < 0) || (p2 === 0 && q2 < 0) || (p3 === 0 && q3 < 0) || (p4 === 0 && q4 < 0))
    {
        // parallel to edge and outside of viewport
        return;
    }
    if (p1 !== 0)
    {
        r1 = q1/p1;
        r2 = q2/p2;
        if (p1 < 0)
        {
            if (r1 > rn1) rn1 = r1;
            if (r2 < rn2) rn2 = r2;
        }
        else
        {
            if (r2 > rn1) rn1 = r2;
            if (r1 < rn2) rn2 = r1;
        }
    }
    if (p3 !== 0)
    {
        r3 = q3/p3;
        r4 = q4/p4;
        if (p3 < 0)
        {
            if (r3 > rn1) rn1 = r3;
            if (r4 < rn2) rn2 = r4;
        }
        else
        {
            if (r4 > rn1) rn1 = r4;
            if (r3 < rn2) rn2 = r3;
        }
    }

    // completely outside viewport
    if (rn1 > rn2) return;

    return [
    x1 + p2*rn1, y1 + p4*rn1,
    x1 + p2*rn2, y1 + p4*rn2
    ];
}
function intersect_x(y, m, p1/*, p2*/, n, q1/*, q2*/)
{
    var //m = -(p2.y - p1.y)/(p2.x - p1.x),
        //n = -(q2.y - q1.y)/(q2.x - q1.x),
        xm, xn;
    xm = (p1.y - y)/m + p1.x;
    if (null == n) return xm;
    xn = (q1.y - y)/n + q1.x;
    return xm > xn ? [xn, xm] : [xm, xn];
}
function intersect_y(x, m, p1/*, p2*/, n, q1/*, q2*/)
{
    var //m = -(p2.y - p1.y)/(p2.x - p1.x),
        //n = -(q2.y - q1.y)/(q2.x - q1.x),
        ym, yn;
    ym = p1.y - m*(x - p1.x);
    if (null == n) return ym;
    yn = q1.y - n*(x - q1.x);
    return ym > yn ? [yn, ym] : [ym, yn];
}
function intersect(p1, p2, q1, q2)
{
    var a = p2.y - p1.y, b = p1.x - p2.x, c = p2.x*p1.y - p1.x*p2.y,
        k = q2.y - q1.y, l = q1.x - q2.x, m = q2.x*q1.y - q1.x*q2.y,
        D = a*l - b*k;
    // zero, infinite or one point
    return is_strictly_equal(D, 0) ? false : {x:(b*m - c*l)/D, y:(c*k - a*m)/D};
}
function fill_rect(set_pixel, x1, y1, x2, y2)
{
    // fill a rectangular area between (x1,y1), (x2,y2)
    var x, y;
    if (x1 > x2)
    {
        x = x1;
        x1 = x2;
        x2 = x;
    }
    if (y1 > y2)
    {
        y = y1;
        y1 = y2;
        y2 = y;
    }
    if (y1 === y2)
    {
        for (x=x1; x<=x2; ++x)
        {
            set_pixel(x, y1, 1);
        }
    }
    else if (x1 === x2)
    {
        for (y=y1; y<=y2; ++y)
        {
            set_pixel(x1, y, 1);
        }
    }
    else
    {
        for (y=y1; y<=y2; ++y)
        {
            for (x=x1; x<=x2; ++x)
            {
                set_pixel(x, y, 1);
            }
        }
    }
}
function wu_step_init(p)
{
    // initialize the step used in Wu's algorithm
    p.dx = p.endx - p.x;
    p.dy = p.endy - p.y;
    p.sx = sign(p.dx);
    p.sy = sign(p.dy);
    p.dx = stdMath.abs(p.dx);
    p.dy = stdMath.abs(p.dy);

    var xs = stdMath.round(p.x),
        ys = stdMath.round(p.y),
        xe = stdMath.round(p.endx),
        ye = stdMath.round(p.endy),
        e = 0.5;

    p.steep = p.dy > p.dx;
    if (p.steep)
    {
        p.gradient = p.sx*(p.dy ? p.dx/p.dy : 1.0);
        p.intersect = p.x + p.gradient;
        p.gap1 = 1 - (p.y + e - ys);
        p.gap2 = 1 - (p.endy + e - ye);
        p.fpart = p.x - xs;
        p.rfpart = 1 - p.fpart;
        p.end = function() {return p.y === p.endy;};
    }
    else
    {
        p.gradient = p.sy*(p.dx ? p.dy/p.dx : 1.0);
        p.intersect = p.y + p.gradient;
        p.gap1 = 1 - (p.x + e - xs);
        p.gap2 = 1 - (p.endx + e - xe);
        p.fpart = p.y - ys;
        p.rfpart = 1 - p.fpart;
        p.end = function() {return p.x === p.endx;};
    }
    p.x = xs;
    p.y = ys;
    p.endx = xe;
    p.endy = ye;
    p.fpart *= p.gap1;
    p.rfpart *= p.gap1;
    return p;
}
function wu_step(p)
{
    // the step method in Wu's algorithm
    var i = stdMath.floor(p.intersect);
    p.fpart = p.intersect - i;
    p.rfpart = 1 - p.fpart;
    if (p.steep)
    {
        p.y += p.sy;
        if (p.y === p.endy)
        {
            p.x = p.endx;
            p.fpart *= p.gap2;
            p.rfpart *= p.gap2;
        }
        else
        {
            p.x = i;
        }
    }
    else
    {
        p.x += p.sx;
        if (p.x === p.endx)
        {
            p.y = p.endy;
            p.fpart *= p.gap2;
            p.rfpart *= p.gap2;
        }
        else
        {
            p.y = i;
        }
    }
    p.intersect += p.gradient;
}
function wu_line(set_pixel, xs, ys, xe, ye)
{
    // Wu's line algorithm
    // https://en.wikipedia.org/wiki/Xiaolin_Wu%27s_line_algorithm
    var dx = xe - xs, dy = ye - ys, p, t;

    if (0 === dx || 0 === dy)
    {
        return fill_rect(set_pixel, stdMath.round(xs), stdMath.round(ys), stdMath.round(xe), stdMath.round(ye));
    }
    if (xs > xe)
    {
        t = xs;
        xs = xe;
        xe = t;
        t = ys;
        ys = ye;
        ye = t;
    }
    p = wu_step_init({
        x: xs,
        y: ys,
        endx: xe,
        endy: ye
    });
    if (p.steep)
    {
        for (;;)
        {
            if (0 < p.rfpart) set_pixel(p.x, p.y, p.rfpart);
            if (0 < p.fpart) set_pixel(p.x + 1, p.y, p.fpart);
            if (p.end()) return;
            wu_step(p);
        }
    }
    else
    {
        for (;;)
        {
            if (0 < p.rfpart) set_pixel(p.x, p.y, p.rfpart);
            if (0 < p.fpart) set_pixel(p.x, p.y + 1, p.fpart);
            if (p.end()) return;
            wu_step(p);
        }
    }
}
function wu_thick_line(set_pixel, xs, ys, xe, ye, w, cs, ce)
{
    if (1 >= w) return wu_line(set_pixel, xs, ys, xe, ye);

    var l, r, t, xx, yy,
        dx, dy, n, m, im, e = 0.5,
        sx, sy, cos, sin,
        wx, wy, wsx, wsy,
        a, b, c, d, g, f;

    if (xs > xe)
    {
        n = xs;
        xs = xe;
        xe = n;
        n = ys;
        ys = ye;
        ye = n;
        t = cs;
        cs = ce;
        ce = t;
    }

    dx = stdMath.abs(xe - xs);
    dy = stdMath.abs(ye - ys);
    sx = 1;
    sy = ys > ye ? -1 : 1;
    w -= 1;

    if (0 === dx)
    {
        if ('square' === cs) ys -= sy*w/2;
        if ('square' === ce) ye += sy*w/2;
        return fill_rect(set_pixel, stdMath.round(xs - w/2), stdMath.round(ys), stdMath.round(xe + w/2), stdMath.round(ye));
        return;
    }
    if (0 === dy)
    {
        if ('square' === cs) xs -= sx*w/2;
        if ('square' === ce) xe += sx*w/2;
        return fill_rect(set_pixel, stdMath.round(xs), stdMath.round(ys - w/2), stdMath.round(xe), stdMath.round(ye + w/2));
    }

    n = hypot(dx, dy);
    m = dy/dx;
    cos = dy/n;
    sin = dx/n;
    wx = cos*w/2;
    wy = sin*w/2;
    im = 1/m;// = wy/wx, being the vertical direction to m
    wsx = sx*wx;
    wsy = sy*wy;
    if ('square' === cs) {xs -= sx*wy; ys -= sy*wx;}
    if ('square' === ce) {xe += sx*wy; ye += sy*wx;}

/*
      wx      .b
    +-----.(s)  .
wy  |.a  |  .     . f
       . |    .     .
 dy      |.     .     .
         |  .g    .     . d
         |    .     .(e)
         +----- .----
             dx  c

a: ys + wsy - ys = -(x - xs)/m => x = xs - m*wsy: (xs-wsx, ys+wsy)
b: ys - wsy - ys = -(x - xs)/m => x = xs + m*wsy: (xs+wsx, ys-wsy)
c: ye + wsy - ye = -(x - xe)/m => x = xe - m*wsy: (xe-wsx, ye+wsy)
d: ye - wsy - ye = -(x - xe)/m => x = xe + m*wsy: (xe+wsx, ye-wsy)
f: ys + wsy - (ys-wsy) = -m*(x - (xs+wsx)) => x = xs - 2wsy/m + wsx: (xs - 2wsy/m + wsx, ys+wsy)
g: ye - wsy - (ye+wsy) = -m*(x - (xe-wsx)) => x = xe + 2wsy/m - wsx: (xe + 2wsy/m - wsx, ye-wsy)
*/

    a = {x:xs - wsx, y:ys + wsy};
    b = {x:xs + wsx, y:ys - wsy};
    c = {x:xe - wsx, y:ye + wsy};
    d = {x:xe + wsx, y:ye - wsy};
    f = {x:xs + 2*wsy/m + wsx, y:ys + wsy};
    g = {x:xe - 2*wsy/m - wsx, y:ye - wsy};

    // outline
    wu_line(set_pixel, a.x, a.y, b.x, b.y);
    wu_line(set_pixel, b.x, b.y, d.x, d.y);
    wu_line(set_pixel, d.x, d.y, c.x, c.y);
    wu_line(set_pixel, c.x, c.y, a.x, a.y);

    m *= sy;
    im *= sy;

    // fill
    if (dy > dx)
    {
        for (ys=stdMath.round(b.y)+sy,ye=stdMath.round(a.y); sy*(ye-ys)>0; ys+=sy)
        {
            xx = intersect_x(ys, im, b, -m, b);
            if (0 < xx[1] - xx[0])
            {
                fill_rect(set_pixel, stdMath.round(xx[0] + e), ys, stdMath.round(xx[1] - e), ys);
            }
        }
        for (ys=ye,ye=stdMath.round(g.y); sy*(ye-ys)>0; ys+=sy)
        {
            xx = intersect_x(ys, -m, c, -m, b);
            if (0 < xx[1] - xx[0])
            {
                fill_rect(set_pixel, stdMath.round(xx[0] + e), ys, stdMath.round(xx[1] - e), ys);
            }
        }
        for (ys=ye,ye=stdMath.round(c.y); sy*(ye-ys)>0; ys+=sy)
        {
            xx = intersect_x(ys, -m, c, im, c);
            if (0 < xx[1] - xx[0])
            {
                fill_rect(set_pixel, stdMath.round(xx[0] + e), ys, stdMath.round(xx[1] - e), ys);
            }
        }
    }
    else
    {
        for (xs=stdMath.round(a.x)+1,xe=stdMath.round(b.x); xs<xe; ++xs)
        {
            yy = intersect_y(xs, im, a, -m, a);
            if (0 < yy[1] - yy[0])
            {
                fill_rect(set_pixel, xs, stdMath.round(yy[0] + e), xs, stdMath.round(yy[1] - e));
            }
        }
        for (xs=xe,xe=stdMath.round(c.x); xs<xe; ++xs)
        {
            yy = intersect_y(xs, -m, a, -m, d);
            if (0 < yy[1] - yy[0])
            {
                fill_rect(set_pixel, xs, stdMath.round(yy[0] + e), xs, stdMath.round(yy[1] - e));
            }
        }
        for (xs=xe,xe=stdMath.round(d.x); xs<xe; ++xs)
        {
            yy = intersect_y(xs, im, d, -m, d);
            if (0 < yy[1] - yy[0])
            {
                fill_rect(set_pixel, xs, stdMath.round(yy[0] + e), xs, stdMath.round(yy[1] - e));
            }
        }
    }
}
function join_lines(set_pixel, x1, y1, x2, y2, x3, y3, w, j)
{
    var dx1 = stdMath.abs(x2 - x1), dy1 = stdMath.abs(y2 - y1),
        dx2 = stdMath.abs(x3 - x2), dy2 = stdMath.abs(y3 - y2),
        sx1, sy1, sx2, sy2,
        n1, n2, m1, m2, im1, im2,
        cos1, sin1, cos2, sin2,
        wx1, wy1, wx2, wy2,
        wsx1, wsy1, wsx2, wsy2,
        a1, b1, c1, d1,
        a2, b2, c2, d2,
        x, y, xx, yy, p, q, e = 0.5;

    if (is_almost_equal(dy1*dx2, dy2*dx1)) return;

    w -= 1;
    sx1 = x1 > x2 ? -1 : 1;
    sy1 = y1 > y2 ? -1 : 1;
    sx2 = x2 > x3 ? -1 : 1;
    sy2 = y2 > y3 ? -1 : 1;
    if (0 === dx1)
    {
        n1 = dy1;
        m1 = 1;
        cos1 = 0;
        sin1 = 1;
        im1 = 0;
    }
    else
    {
        n1 = hypot(dx1, dy1);
        m1 = dy1/dx1;
        cos1 = dy1/n1;
        sin1 = dx1/n1;
        im1 = 1/m1;
    }
    wx1 = cos1*w/2;
    wy1 = sin1*w/2;
    wsx1 = sx1*wx1;
    wsy1 = sy1*wy1;
    if (0 === dx2)
    {
        n2 = dy2;
        m2 = 1;
        cos2 = 0;
        sin2 = 1;
        im2 = 0;
    }
    else
    {
        n2 = hypot(dx2, dy2);
        m2 = dy2/dx2;
        cos2 = dy2/n2;
        sin2 = dx2/n2;
        im2 = 1/m2;
    }
    wx2 = cos2*w/2;
    wy2 = sin2*w/2;
    wsx2 = sx2*wx2;
    wsy2 = sy2*wy2;

    a1 = {x:x1 - wsx1, y:y1 + wsy1};
    b1 = {x:x1 + wsx1, y:y1 - wsy1};
    c1 = {x:x2 - wsx1, y:y2 + wsy1};
    d1 = {x:x2 + wsx1, y:y2 - wsy1};

    a2 = {x:x2 - wsx2, y:y2 + wsy2};
    b2 = {x:x2 + wsx2, y:y2 - wsy2};
    c2 = {x:x3 - wsx2, y:y3 + wsy2};
    d2 = {x:x3 + wsx2, y:y3 - wsy2};

    if ('bevel' === j)
    {
        wu_line(set_pixel, c1.x, c1.y, a2.x, a2.y);
        for (y=stdMath.round(y2),yy=stdMath.round(stdMath.max(c1.y, a2.y)); y<=yy; ++y)
        {
            xx = intersect_x(y, im1, c1, im2, a2);
            if (p = intersect({x:xx[0], y:y}, {x:xx[1], y:y}, c1, a2))
            {
                xx[0] = stdMath.max(p.x, xx[0]);
                xx[1] = stdMath.max(p.x, xx[1]);
            }
            fill_rect(set_pixel, stdMath.round(xx[0] + e), y, stdMath.round(xx[1] - e), y);
        }
    }
    else if ('miter' === j)
    {
        q = intersect(a1, c1, a2, c2)
        wu_line(set_pixel, c1.x, c1.y, q.x, q.y);
        wu_line(set_pixel, a2.x, a2.y, q.x, q.y);
        for (y=stdMath.round(y2),yy=stdMath.round(stdMath.max(c1.y, a2.y, q.y)); y<=yy; ++y)
        {
            xx = intersect_x(y, -m1, q, m2, q);
            p = intersect_x(y, im1, c1, -im2, a2);
            xx[0] = stdMath.max(xx[0], p[0]);
            xx[1] = stdMath.min(xx[1], p[1]);
            fill_rect(set_pixel, stdMath.round(xx[0] + e), y, stdMath.round(xx[1] - e), y);
        }
    }
}
function hypot(dx, dy)
{
    dx = stdMath.abs(dx);
    dy = stdMath.abs(dy);
    var r = 0;
    if (is_strictly_equal(dx, 0))
    {
        return dy;
    }
    else if (is_strictly_equal(dy, 0))
    {
        return dx;
    }
    else if (dx > dy)
    {
        r = dy/dx;
        return dx*stdMath.sqrt(1 + r*r);
    }
    else if (dx < dy)
    {
        r = dx/dy;
        return dy*stdMath.sqrt(1 + r*r);
    }
    return dx*sqrt2;
}
function point_line_distance(p0, p1, p2)
{
    var x1 = p1.x, y1 = p1.y,
        x2 = p2.x, y2 = p2.y,
        x = p0.x, y = p0.y,
        dx = x2 - x1, dy = y2 - y1,
        d = hypot(dx, dy)
    ;
    if (is_strictly_equal(d, 0)) return hypot(x - x1, y - y1);
    return stdMath.abs(dx*(y1 - y) - dy*(x1 - x)) / d;
}
function sample_curve(f, n, pixelSize, do_refine)
{
    if (null == n) n = NUM_POINTS;
    if (null == pixelSize) pixelSize = PIXEL_SIZE;
    var i, points = [];
    if (do_refine)
    {
        points.push(f(0));
        for (i=0; i<n; ++i)
        {
            subdivide_curve(points, f, 0 === i ? 0 : i/n, n === i+1 ? 1 : (i+1)/n, pixelSize, null, null);
        }
    }
    else
    {
        for (i=0; i<=n; ++i)
        {
            points.push(f(0 === i ? 0 : (n === i ? 1 : i/n)));
        }
    }
    return points;
}
function subdivide_curve(points, f, l, r, pixelSize, pl, pr)
{
    if ((l >= r) || is_almost_equal(l, r)) return;
    var m = (l + r) / 2, left = pl || f(l), right = pr || f(r), middle = f(m);
    if (point_line_distance(middle, left, right) <= pixelSize)
    {
        // no more refinement
        // return linear interpolation between left and right
        points.push(right);
    }
    else
    {
        // recursively subdivide to refine samples with high enough curvature
        subdivide_curve(points, f, l, m, pixelSize, left, middle);
        subdivide_curve(points, f, m, r, pixelSize, middle, right);
    }
}

// export it
return Rasterizer;
});
