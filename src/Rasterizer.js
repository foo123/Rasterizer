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
    err = function(msg) {throw new Error(msg);},
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
            lw = stdMath.abs((+lw) || 0);
            if (0 < lw)
            {
                lineWidth = lw;
            }
        }
    });

    def(self, 'lineCap', {
        get: function() {
            return lineCap;
        },
        set: function(lc) {
            lc = String(lc).toLowerCase();
            if (-1 !== ['butt','square'].indexOf(lc))
            {
                // only 'butt' and 'square' lineCap supported
                lineCap = lc;
            }
            else
            {
                err('"'+lc+'" lineCap is not supported!');
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
            else
            {
                err('"'+lj+'" lineJoin is not supported!');
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
            stroke_polyline(stroke_pixel, [x, y, x + w - 1, y, x + w - 1, y + h - 1, x, y + h - 1, x, y], lineWidth, lineDash, 'butt', 'miter', 0, 0, width - 1, height - 1);
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
    self.strokePolyline = function() {
        if (0 < lineWidth)
        {
            stroke_polyline(stroke_pixel, arguments, lineWidth, lineDash, lineCap, lineJoin, 0, 0, width - 1, height - 1);
        }
        return self;
    };
    self.strokeArc = function(cx, cy, rx, ry, angle, start, end, fs) {
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
            stroke_arc(stroke_pixel, cx, cy, rx, ry, angle, t0, t1, lineWidth, lineDash, lineCap, 'bevel', 0, 0, width - 1, height - 1);
        }
        return self;
    };
    self.strokeBezier = function() {
        if (0 < lineWidth && 4 <= arguments.length)
        {
            if (4 === arguments.length)
            {
                stroke_polyline(stroke_pixel, arguments, lineWidth, lineDash, lineCap, lineJoin, 0, 0, width - 1, height - 1);
            }
            else
            {
                stroke_bezier(stroke_pixel, arguments, lineWidth, lineDash, lineCap, 'bevel', 0, 0, width - 1, height - 1);
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
    lineDash: null,
    setLineDash: null,
    strokeRect: null,
    fillRect: null,
    strokePolyline: null,
    strokeArc: null,
    strokeBezier: null
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
        var c = [RGBA[0], RGBA[1], RGBA[2], 3 < RGBA.length ? clamp(RGBA[3], 0, 1) : 1.0];
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

/*function draw_line(set_pixel, x1, y1, x2, y2, lw, ld, lc, lj, xmin, ymin, xmax, ymax)
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
}*/
function stroke_polyline(set_pixel, points, lw, ld, lc, lj, xmin, ymin, xmax, ymax)
{
    var n = points.length, i,
        x1, y1, x2, y2, xp, yp,
        dx1, dy1, dx2, dy2, w1, w2;
    if (n < 6)
    {
        x1 = points[0];
        y1 = points[1];
        x2 = points[2];
        y2 = points[3];
        dx2 = stdMath.abs(x2 - x1);
        dy2 = stdMath.abs(y2 - y1);
        w2 = ww(lw, dx2, dy2);
        stroke_line(set_pixel, x1, y1, x2, y2, dx2, dy2, w2[0], w2[1], lc, lc, xmin, ymin, xmax, ymax);
    }
    else
    {
        n -= 2;
        for (i=0; i<n; i+=2)
        {
            x1 = points[i];
            y1 = points[i+1];
            x2 = points[i+2];
            y2 = points[i+3];
            dx2 = stdMath.abs(x2 - x1);
            dy2 = stdMath.abs(y2 - y1);
            w2 = ww(lw, dx2, dy2);
            stroke_line(set_pixel, x1, y1, x2, y2, dx2, dy2, w2[0], w2[1], 0 === i ? lc : null, n === i+1 ? lc : null, xmin, ymin, xmax, ymax);
            if (1 < lw && 0 < i)
            {
                join_lines(set_pixel, xp, yp, x1, y1, x2, y2, dx1, dy1, w1[0], w1[1], dx2, dy2, w2[0], w2[1], lj);
            }
            xp = x1;
            yp = y1;
            dx1 = dx2;
            dy1 = dy2;
            w1 = w2;
        }
    }
}
function stroke_line(set_pixel, x1, y1, x2, y2, dx, dy, wx, wy, c1, c2, xmin, ymin, xmax, ymax)
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
        if (!is_almost_equal(x1, clipped[0]) || !is_almost_equal(y1, clipped[1])) c1 = null;
        if (!is_almost_equal(x2, clipped[2]) || !is_almost_equal(y2, clipped[3])) c2 = null;
        x1 = clipped[0];
        y1 = clipped[1];
        x2 = clipped[2];
        y2 = clipped[3];
    }
    if (0 === wx && 0 === wy)
    {
        wu_line(set_pixel, x1, y1, x2, y2, dx, dy);
    }
    else
    {
        wu_thick_line(set_pixel, x1, y1, x2, y2, dx, dy, wx, wy, c1, c2);
    }
}
function stroke_arc(set_pixel, cx, cy, rx, ry, a, t0, t1, lw, ld, lc, lj, xmin, ymin, xmax, ymax)
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
        };
    stroke_polyline(set_pixel, sample_curve(arc, NUM_POINTS, PIXEL_SIZE, true), lw, ld, 'butt', 'bevel', xmin, ymin, xmax, ymax);
}
function stroke_bezier(set_pixel, c, lw, ld, lc, lj, xmin, ymin, xmax, ymax)
{
    var n, i, p, q,
        bezier2 = function(t) {
           var t0 = t, t1 = 1 - t, t11 = t1*t1, t10 = 2*t1*t0, t00 = t0*t0;
           return {
               x: t11*c[0] + t10*c[2] + t00*c[4],
               y: t11*c[1] + t10*c[3] + t00*c[5]
           };
        },
        bezier3 = function(t) {
            var t0 = t, t1 = 1 - t,
                t0t0 = t0*t0, t1t1 = t1*t1,
                t111 = t1t1*t1, t000 = t0t0*t0,
                t110 = 3*t1t1*t0, t100 = 3*t0t0*t1;
           return {
               x: t111*c[0] + t110*c[2] + t100*c[4] + t000*c[6],
               y: t111*c[1] + t110*c[3] + t100*c[5] + t000*c[7]
           };
        };
    stroke_polyline(set_pixel, sample_curve(6 < c.length ? bezier3 : bezier2, NUM_POINTS, PIXEL_SIZE, true), lw, ld, lc, 'bevel', xmin, ymin, xmax, ymax);
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
function ww(w, dx, dy)
{
    if (1 >= w)
    {
        return [0, 0];
    }
    else if (is_strictly_equal(dx, 0))
    {
        return [(w-1)/2, 0];
    }
    else if (is_strictly_equal(dy, 0))
    {
        return [0, (w-1)/2];
    }
    else
    {
        var n = hypot(dx, dy);
        return [dy/n*(w-1)/2, dx/n*(w-1)/2];
    }
}
function intersect_x(y, m, p, n, q)
{
    var xm, xn;
    xm = (p.y - y)/m + p.x;
    if (null == n) return xm;
    xn = (q.y - y)/n + q.x;
    return xm > xn ? [xn, xm] : [xm, xn];
}
function intersect_y(x, m, p, n, q)
{
    var ym, yn;
    ym = p.y - m*(x - p.x);
    if (null == n) return ym;
    yn = q.y - n*(x - q.x);
    return ym > yn ? [yn, ym] : [ym, yn];
}
function intersect_x2(y, p1, p2, q1, q2)
{
    var d1 = p2.x - p1.x,
        f1 = is_almost_equal(d1, 0),
        m = f1 ? INF : -(p2.y - p1.y)/d1,
        d2, f2, n, xm, xn;
    xm = f1 ? p1.x : ((p1.y - y)/m + p1.x);
    if (null == q1) return xm;
    d2 = q2.x - q1.x;
    f2 = is_almost_equal(d2, 0),
    n = f2 ? INF : -(q2.y - q1.y)/d2
    xn = f2 ? q1.x : ((q1.y - y)/n + q1.x);
    return xm > xn ? [xn, xm] : [xm, xn];
}
/*function intersect_y2(x, p1, p2, q1, q2)
{
    var d1 = p2.x - p1.x,
        f1 = is_almost_equal(d1, 0),
        m = f1 ? INF : -(p2.y - p1.y)/d1,
        d2, f2, n, ym, yn;
    ym = f1 ? (is_almost_equal(x, p1.x) ? p1.y : false) : (p1.y - m*(x - p1.x));
    if (null == q1) return ym;
    d2 = q2.x - q1.x;
    f2 = is_almost_equal(d2, 0);
    n = f2 ? INF : -(q2.y - q1.y)/d2;
    yn = f2 ? (is_almost_equal(x, q1.x) ? q1.y : false) : (q1.y - n*(x - q1.x));
    if (false === ym || false === yn) return false;
    return ym > yn ? [yn, ym] : [ym, yn];
}*/
function intersect(x1, y1, x2, y2, x3, y3, x4, y4)
{
    var a = y2 - y1, b = x1 - x2, c = x2*y1 - x1*y2,
        k = y4 - y3, l = x3 - x4, m = x4*y3 - x3*y4,
        D = a*l - b*k;
    // zero, infinite or one point
    return is_almost_equal(D, 0) ? false : {x:(b*m - c*l)/D, y:(c*k - a*m)/D};
}
function fill_rect(set_pixel, x1, y1, x2, y2)
{
    // fill a rectangular area between (x1,y1), (x2,y2) integer coords
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
function wu_line(set_pixel, xs, ys, xe, ye, dx, dy)
{
    if (null == dx)
    {
        dx = stdMath.abs(xe - xs);
        dy = stdMath.abs(ye - ys);
    }

    // Wu's line algorithm
    // https://en.wikipedia.org/wiki/Xiaolin_Wu%27s_line_algorithm
    if (is_strictly_equal(dx, 0) || is_strictly_equal(dy, 0))
    {
        return fill_rect(set_pixel, stdMath.round(xs), stdMath.round(ys), stdMath.round(xe), stdMath.round(ye));
    }

    var x, y, xx, yy,
        sx = 1, sy = 1,
        gradient = 0, intersect = 0,
        fpart = 0, rfpart = 0,
        gap1 = 0, gap2 = 0,
        i = 0, e = 0.5;

    if (xs > xe)
    {
        x = xs;
        xs = xe;
        xe = x;
        y = ys;
        ys = ye;
        ye = y;
    }
    sx = 1;
    sy = ys > ye ? -1 : 1;

    x = xs;
    y = ys;
    xx = xe;
    yy = ye;

    xs = stdMath.round(x);
    ys = stdMath.round(y);
    xe = stdMath.round(xx);
    ye = stdMath.round(yy);

    if (dy > dx)
    {
        gradient = sx*dx/dy;
        intersect = x + gradient;
        gap1 = 1 - (y + e - ys);
        gap2 = 1 - (yy + e - ye);
        fpart = x - xs;
        rfpart = 1 - fpart;
        x = xs;
        y = ys;
        fpart *= gap1;
        rfpart *= gap1;
        for (;;)
        {
            if (0 < rfpart) set_pixel(x, y, rfpart);
            if (0 < fpart) set_pixel(x + 1, y, fpart);
            if (y === ye) return;
            i = stdMath.floor(intersect);
            fpart = intersect - i;
            rfpart = 1 - fpart;
            y += sy;
            if (y === ye)
            {
                x = xe;
                fpart *= gap2;
                rfpart *= gap2;
            }
            else
            {
                x = i;
            }
            intersect += gradient;
        }
    }
    else
    {
        gradient = sy*dy/dx;
        intersect = y + gradient;
        gap1 = 1 - (x + e - xs);
        gap2 = 1 - (xx + e - xe);
        fpart = y - ys;
        rfpart = 1 - fpart;
        x = xs;
        y = ys;
        fpart *= gap1;
        rfpart *= gap1;
        for (;;)
        {
            if (0 < rfpart) set_pixel(x, y, rfpart);
            if (0 < fpart) set_pixel(x, y + 1, fpart);
            if (x === xe) return;
            i = stdMath.floor(intersect);
            fpart = intersect - i;
            rfpart = 1 - fpart;
            x += sx;
            if (x === xe)
            {
                y = ye;
                fpart *= gap2;
                rfpart *= gap2;
            }
            else
            {
                y = i;
            }
            intersect += gradient;
        }
    }
}
function wu_thick_line(set_pixel, xs, ys, xe, ye, dx, dy, wx, wy, cs, ce)
{
    var t, xx, yy,
        m, im, e = 0.5,
        sx, sy, wsx, wsy,
        a, b, c, d, g, f;

    if (xs > xe)
    {
        t = xs;
        xs = xe;
        xe = t;
        t = ys;
        ys = ye;
        ye = t;
        t = cs;
        cs = ce;
        ce = t;
    }

    sx = 1;
    sy = ys > ye ? -1 : 1;

    if (is_strictly_equal(dx, 0))
    {
        if ('square' === cs) ys -= sy*wx;
        if ('square' === ce) ye += sy*wx;
        return fill_rect(set_pixel, stdMath.round(xs - wx), stdMath.round(ys), stdMath.round(xs + wx), stdMath.round(ye));
    }
    if (is_strictly_equal(dy, 0))
    {
        if ('square' === cs) xs -= sx*wy;
        if ('square' === ce) xe += sx*wy;
        return fill_rect(set_pixel, stdMath.round(xs), stdMath.round(ys - wy), stdMath.round(xe), stdMath.round(ys + wy));
    }

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
    f = {x:xs + 2*wsy*dx/dy + wsx, y:ys + wsy};
    g = {x:xe - 2*wsy*dx/dy - wsx, y:ye - wsy};
    m = sy*dy/dx;
    im = sy*dx/dy;

    // outline
    wu_line(set_pixel, a.x, a.y, b.x, b.y);
    wu_line(set_pixel, b.x, b.y, d.x, d.y);
    wu_line(set_pixel, d.x, d.y, c.x, c.y);
    wu_line(set_pixel, c.x, c.y, a.x, a.y);

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
function fill_triangle(set_pixel, a, b, c)
{
    var y, yb, yc, xx, t, e = 0.5;
    if (b.y < a.y) {t = a; a = b; b = t;}
    if (c.y < a.y) {t = a; a = c; c = t;}
    if (c.y < b.y) {t = b; b = c; c = t;}
    for (y=stdMath.round(a.y)+1,yb = stdMath.round(b.y),yc=stdMath.round(c.y); y<yc; ++y)
    {
        xx = y < yb ? intersect_x2(y, a, c, a, b) : intersect_x2(y, a, c, b, c);
        fill_rect(set_pixel, stdMath.round(xx[0] + e), y, stdMath.round(xx[1] - e), y);
    }
}
function join_lines(set_pixel, x1, y1, x2, y2, x3, y3, dx1, dy1, wx1, wy1, dx2, dy2, wx2, wy2, j)
{
    if (is_almost_equal(dy1*dx2, dy2*dx1)) return;

    var sx1, sy1, sx2, sy2,
        wsx1, wsy1, wsx2, wsy2,
        a1, b1, c1, d1,
        a2, b2, c2, d2,
        p, q, t, s;

    if (x1 > x2 && x2 > x3)
    {
        t = x1;
        x1 = x3;
        x3 = t;
        t = y1;
        y1 = y3;
        y3 = t;
        t = dx1;
        dx1 = dx2;
        dx2 = t;
        t = dy1;
        dy1 = dy2;
        dy2 = t;
        t = wx1;
        wx1 = wx2;
        wx2 = t;
        t = wy1;
        wy1 = wy2;
        wy2 = t;
    }

    sx1 = x1 > x2 ? -1 : 1;
    sy1 = y1 > y2 ? -1 : 1;
    sx2 = x2 > x3 ? -1 : 1;
    sy2 = y2 > y3 ? -1 : 1;
    wsx1 = sx1*wx1;
    wsy1 = sy1*wy1;
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
    s = {x:x2, y:y2};

    if (sx1 === sx2)
    {
        if (sy1 === sy2)
        {
            if (0 === dy1)
            {
                p = d1;
                q = b2;
            }
            else
            {
                p = c1;
                q = a2;
            }
        }
        else
        {
            p = c1;
            q = b2;
        }
    }
    else //if (sx1 !== sx2)
    {
        p = d1;
        q = a2;
    }
    if ('bevel' === j)
    {
        wu_line(set_pixel, p.x, p.y, q.x, q.y);
        fill_triangle(set_pixel, s, p, q);
    }
    if ('miter' === j)
    {
        if (sx1 === sx2)
        {
            if (sy1 === sy2)
            {
                if (0 === dy1)
                {
                    t = intersect(b1.x, b1.y, d1.x, d1.y, b2.x, b2.y, d2.x, d2.y);
                }
                else
                {
                    t = intersect(a1.x, a1.y, c1.x, c1.y, a2.x, a2.y, c2.x, c2.y);
                }
            }
            else
            {
                t = intersect(a1.x, a1.y, c1.x, c1.y, b2.x, b2.y, d2.x, d2.y);
            }
        }
        else //if (sx1 !== sx2)
        {
            t = intersect(b1.x, b1.y, d1.x, d1.y, a2.x, a2.y, c2.x, c2.y);
        }
        wu_line(set_pixel, p.x, p.y, t.x, t.y);
        wu_line(set_pixel, q.x, q.y, t.x, t.y);
        fill_triangle(set_pixel, s, p, q);
        fill_triangle(set_pixel, t, p, q);
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
    var i, p, points = [];
    if (do_refine)
    {
        p = f(0);
        points.push(p.x, p.y);
        for (i=0; i<n; ++i)
        {
            subdivide_curve(points, f, 0 === i ? 0 : i/n, n === i+1 ? 1 : (i+1)/n, pixelSize, null, null);
        }
    }
    else
    {
        for (i=0; i<=n; ++i)
        {
            p = f(0 === i ? 0 : (n === i ? 1 : i/n));
            points.push(p.x, p.y);
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
        points.push(right.x, right.y);
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
