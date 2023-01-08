/**
*   Rasterizer
*   class to rasterize and draw lines and curves on bitmaps
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

var HAS = Object.prototype.hasOwnProperty, def = Object.defineProperty,
    stdMath = Math, PI = stdMath.PI, TWO_PI = 2*PI, HALF_PI = PI/2, EPS = 1e-6,
    ImArray = 'undefined' !== typeof Uint8ClampedArray ? Uint8ClampedArray : ('undefined' !== typeof Uint8Array ? Uint8Array : Array);


function Rasterizer(width, height, set_rgba_at, get_rgba_at)
{
    var self = this;
    if (!(self instanceof Rasterizer)) return new Rasterizer(width, height, set_rgba_at, get_rgba_at);

    self.drawLine = function(x0, y0, x1, y1, lineWidth) {
        if (null == lineWidth) lineWidth = 1;
        draw_line(stdMath.round(x0), stdMath.round(y0), stdMath.round(x1), stdMath.round(y1), stdMath.max(0, stdMath.round(lineWidth)), 0, 0, width - 1, height - 1, set_rgba_at, get_rgba_at);
        return self;
    };
}
Rasterizer.prototype = {
    constructor: Rasterizer,
    drawLine: null
};
Rasterizer.createImageData = function(width, height) {
    return {
        data: new ImArray((width*height) << 2),
        width: width,
        height: height
    };
};
Rasterizer.getRGBAFrom = function(R, G, B, A) {
    var r = R, g = G, b = B, a = 3 < arguments.length ? A : 255;
    return function(x, y) {
        return [r, g, b, a];
    };
};
Rasterizer.setRGBATo = function(imgData) {
    var width = imgData.width, height = imgData.height;
    return function(x, y, r, g, b, a) {
        if (0 <= x && x < width && 0 <= y && y < height)
        {
            var index = (x + width*y) << 2;
            imgData.data[index  ] = r;
            imgData.data[index+1] = g;
            imgData.data[index+2] = b;
            imgData.data[index+3] = a;
        }
    };
};

// utilities
function clamp(x, min, max)
{
    return stdMath.min(stdMath.max(x, min), max);
}

// https://en.wikipedia.org/wiki/Liang%E2%80%93Barsky_algorithm
function clip(x1, y1, x2, y2, xmin, ymin, xmax, ymax)
{
    var p1 = -(x2 - x1),
        p2 = -p1,
        p3 = -(y2 - y1),
        p4 = -p3,
        q1 = x1 - xmin,
        q2 = xmax - x1,
        q3 = y1 - ymin,
        q4 = ymax - y1,
        rn2 = 1, rn1 = 0,
        r1, r2, r3, r4,
        xn1, yn1, xn2, yn2;

    if ((p1 === 0 && q1 < 0) || (p2 === 0 && q2 < 0) || (p3 === 0 && q3 < 0) || (p4 === 0 && q4 < 0))
    {
        // parallel to edge and outside of viewport
        return;
    }
    if (p1 !== 0)
    {
        r1 = q1 / p1; r2 = q2 / p2;
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
        r3 = q3 / p3; r4 = q4 / p4;
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

    xn1 = x1 + p2 * rn1;
    yn1 = y1 + p4 * rn1;
    xn2 = x1 + p2 * rn2;
    yn2 = y1 + p4 * rn2;
    return [xn1, yn1, xn2, yn2];
}

// adapted from https://zingl.github.io/bresenham.html
function draw_line(x0, y0, x1, y1, width, xmin, ymin, xmax, ymax, set_rgba_at, get_rgba_at)
{
    var xm = stdMath.min(x0, x1), xM = stdMath.max(x0, x1),
        ym = stdMath.min(y0, y1), yM = stdMath.max(y0, y1);
    // if at least part of line is inside viewport
    if (xM > xmin && xm < xmax && yM > ymin && ym < ymax)
    {
        // clip it to viewport if needed
        if (xm < xmin || xM > xmax || ym < ymin || yM > ymax)
        {
            var clipped = clip(x0, y0, x1, y1, xmin, ymin, xmax, ymax);
            if (!clipped) return;
            x0 = stdMath.round(clipped[0]);
            y0 = stdMath.round(clipped[1]);
            x1 = stdMath.round(clipped[2]);
            y1 = stdMath.round(clipped[3]);
        }

        var dx = stdMath.abs(x1-x0), dy = stdMath.abs(y1-y0),
            sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1,
            err = dx-dy, e2, x2, y2, wd = (width >>> 1),
            ed = dx+dy === 0 ? 1 : stdMath.sqrt(dx*dx+dy*dy),
            c, a, ew, s, xx, yy, m = (width & 1);

        // drawing loop
        for (;;)
        {
            if (m)
            {
                c = get_rgba_at(x0, y0);
                a = 1 < wd ? 1 : clamp(stdMath.abs(err-dx+dy)/ed+1-wd, 0, 1);
                set_rgba_at(x0, y0, c[0], c[1], c[2], clamp(stdMath.round(a*c[3]), 0, 255));
            }
            e2 = err;
            xx = x0;
            yy = y0;
            x2 = x0;
            if (2*e2 >= -dx)
            {
                for (ew = ed*wd, e2 += dy, s = 0, y2 = y0; e2 < ew && (y1 !== y2 || dx > dy); e2 += dx)
                {
                    s += sy;
                    a = clamp(stdMath.abs(e2)/ed+1-wd, 0, 1);
                    y2 = yy - s;
                    c = get_rgba_at(x0, y2);
                    set_rgba_at(x0, y2, c[0], c[1], c[2], clamp(stdMath.round(a*c[3]), 0, 255));
                    y2 = yy + s;
                    c = get_rgba_at(x0, y2);
                    set_rgba_at(x0, y2, c[0], c[1], c[2], clamp(stdMath.round(a*c[3]), 0, 255));
                }
                if (x0 === x1) break;
                e2 = err; err -= dy; x0 += sx;
            }
            if (2*e2 <= dy)
            {
                for (ew = ed*wd, e2 = dx-e2, s = 0; e2 < ew && (x1 !== x2 || dx < dy); e2 += dy)
                {
                    s += sx;
                    a = clamp(stdMath.abs(e2)/ed+1-wd, 0, 1);
                    x2 = xx - s;
                    c = get_rgba_at(x2, y0);
                    set_rgba_at(x2, y0, c[0], c[1], c[2], clamp(stdMath.round(a*c[3]), 0, 255));
                    x2 = xx + s;
                    c = get_rgba_at(x2, y0);
                    set_rgba_at(x2, y0, c[0], c[1], c[2], clamp(stdMath.round(a*c[3]), 0, 255));
                }
                if (y0 === y1) break;
                err += dx; y0 += sy;
            }
        }
    }
}

// export it
return Rasterizer;
});
