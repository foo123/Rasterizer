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
    var self = this, set_pixel;
    if (!(self instanceof Rasterizer)) return new Rasterizer(width, height, set_rgba_at, get_rgba_at);

    set_pixel = function set_pixel(x, y, i) {
        if (0 <= x && x < width && 0 <= y && y < height)
        {
            var c = get_rgba_at(x, y),
                a0 = 3 < c.length ? c[3] : 1.0,
                a1 = i, ao;
            if (0 < a0 && 0 < a1)
            {
                ao = a0*a1; //a1 + a0*(1.0 - a1);
                set_rgba_at(stdMath.round(x), stdMath.round(y), c[0], c[1], c[2], ao);
            }
        }
    };

    self.drawLine = function(x0, y0, x1, y1, lineWidth) {
        if (null == lineWidth) lineWidth = 1;
        draw_line_wu(set_pixel, x0, y0, x1, y1, stdMath.max(0, stdMath.round(lineWidth)), 0, 0, width - 1, height - 1);
        return self;
    };
}
Rasterizer.VERSION = '1.0.0';
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
    if ((1 === arguments.length) && ('function' === typeof R))
    {
        return function(x, y) {
            var c = R(x, y);
            return [c[0], c[1], c[2], 3 < c.length ? c[3]/255 : 1.0];
        };
    }
    else
    {
        var r = R, g = G, b = B, af = 3 < arguments.length ? A/255 : 1.0;
        return function(x, y) {
            return [r, g, b, af];
        };
    }
};
Rasterizer.setRGBATo = function(imgData) {
    if (('function' === typeof imgData))
    {
        return function(x, y, r, g, b, af) {
            imgData(x, y, r, g, b, clamp(stdMath.round(255*af), 0, 255));
        };
    }
    else
    {
        var width = imgData.width, height = imgData.height, bmp = imgData.data;
        return function(x, y, r, g, b, af) {
            if (0 <= x && x < width && 0 <= y && y < height)
            {
                var index = (x + width*y) << 2,
                    r0 = bmp[index  ],
                    g0 = bmp[index+1],
                    b0 = bmp[index+2],
                    a0 = bmp[index+3]/255,
                    a1 = af,
                    ao = a1 + a0*(1 - a1);
                // do alpha composition (over operation)
                if (0 < ao)
                {
                    bmp[index  ] = clamp(stdMath.round((r*a1 + r0*a0*(1 - a1))/ao), 0, 255);
                    bmp[index+1] = clamp(stdMath.round((g*a1 + g0*a0*(1 - a1))/ao), 0, 255);
                    bmp[index+2] = clamp(stdMath.round((b*a1 + b0*a0*(1 - a1))/ao), 0, 255);
                    bmp[index+3] = clamp(stdMath.round(255*ao), 0, 255);
                }
                else
                {
                    bmp[index  ] = 0;
                    bmp[index+1] = 0;
                    bmp[index+2] = 0;
                    bmp[index+3] = 0;
                }
            }
        };
    }
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
function draw_line_bresenham(set_pixel, x0, y0, x1, y1, lw, xmin, ymin, xmax, ymax)
{
    var xm = stdMath.min(x0, x1), xM = stdMath.max(x0, x1),
        ym = stdMath.min(y0, y1), yM = stdMath.max(y0, y1);

    // if at least part of line is inside viewport
    if (!(xM > xmin && xm < xmax && yM > ymin && ym < ymax)) return;

    // clip it to viewport if needed
    if (xm < xmin || xM > xmax || ym < ymin || yM > ymax)
    {
        var clipped = clip(x0, y0, x1, y1, xmin, ymin, xmax, ymax);
        if (!clipped) return;
        x0 = clipped[0];
        y0 = clipped[1];
        x1 = clipped[2];
        y1 = clipped[3];
    }

    var dx = stdMath.abs(x1 - x0), sx = x0 < x1 ? 1 : -1,
        dy = stdMath.abs(y1 - y0), sy = y0 < y1 ? 1 : -1,
        err, e2 = stdMath.sqrt(dx*dx + dy*dy);

    if (0 === e2) return;
    dx = 255*dx/e2;
    dy = 255*dy/e2;
    lw = 255*(lw - 1);

    x0 = stdMath.round(x0);
    y0 = stdMath.round(y0);
    x1 = stdMath.round(x1);
    y1 = stdMath.round(y1);

    if (dx < dy)
    {
        x1 = stdMath.round((e2+lw/2)/dy);
        err = x1*dy-lw/2;
        for (x0 -= x1*sx; ; y0 += sy)
        {
            x1 = x0;
            set_pixel(x1, y0, clamp(err/255, 0, 1));
            for (e2 = dy-err-lw; e2+dy < 255; e2 += dy)
            {
                x1 += sx;
                set_pixel(x1, y0, 1);
            }
            set_pixel(x1 + sx, y0, clamp(e2/255, 0, 1));
            if (y0 === y1) break;
            err += dx;
            if (err > 255)
            {
                err -= dy;
                x0 += sx;
            }
        }
    }
    else
    {
        y1 = stdMath.round((e2+lw/2)/dx);
        err = y1*dx-lw/2;
        for (y0 -= y1*sy; ; x0 += sx)
        {
            y1 = y0;
            set_pixel(x0, y1, clamp(err/255, 0, 1));
            for (e2 = dx-err-lw; e2+dx < 255; e2 += dx)
            {
                y1 += sy;
                set_pixel(x0, y1, 1);
            }
            set_pixel(x0, y1 + sy, clamp(e2/255, 0, 1));
            if (x0 === x1) break;
            err += dy;
            if (err > 255)
            {
                err -= dx;
                y0 += sy;
            }
        }
    }
}
// adapted from https://github.com/jambolo/thick-xiaolin-wu
function draw_line_wu(set_pixel, x0, y0, x1, y1, lw, xmin, ymin, xmax, ymax)
{
    var xm = stdMath.min(x0, x1), xM = stdMath.max(x0, x1),
        ym = stdMath.min(y0, y1), yM = stdMath.max(y0, y1);

    // if at least part of line is inside viewport
    if (!(xM > xmin && xm < xmax && yM > ymin && ym < ymax)) return;

    // clip it to viewport if needed
    if (xm < xmin || xM > xmax || ym < ymin || yM > ymax)
    {
        var clipped = clip(x0, y0, x1, y1, xmin, ymin, xmax, ymax);
        if (!clipped) return;
        x0 = clipped[0];
        y0 = clipped[1];
        x1 = clipped[2];
        y1 = clipped[3];
    }

    var steep = (stdMath.abs(y1 - y0) > stdMath.abs(x1 - x0)), t;

    if (steep)
    {
        t = x0;
        x0 = y0;
        y0 = t;
        t = x1;
        x1 = y1;
        y1 = t;
    }

    if (x0 > x1)
    {
        t = x0;
        x0 = x1;
        x1 = t;
        t = y0;
        y0 = y1;
        y1 = t;
    }

    var dx = x1 - x0, dy = y1 - y0,
        gradient = 0 < dx ? dy/dx : 1.0,
        xend, yend, xgap,
        xpxl1, ypxl1, xpxl2, ypxl2,
        fpart, rfpart, intery,
        x, y, i, j;

    // Rotate lw
    lw *= stdMath.sqrt(1 + (gradient*gradient));

    // Handle first endpoint
    xend = stdMath.round(x0);
    yend = y0 - (lw - 1)*0.5 + gradient*(xend - x0);
    xgap = 1 - (x0 + 0.5 - xend);
    xpxl1 = xend;
    ypxl1 = stdMath.floor(yend);
    fpart = yend - ypxl1;
    rfpart = 1 - fpart;
    if (steep)
    {
        set_pixel(ypxl1, xpxl1, rfpart*xgap);
        for (i=1; i<lw; ++i) set_pixel(ypxl1 + i, xpxl1, 1);
        set_pixel(ypxl1 + lw, xpxl1, fpart*xgap);
    }
    else
    {
        set_pixel(xpxl1, ypxl1, rfpart*xgap);
        for (i=1; i<lw; ++i) set_pixel(xpxl1, ypxl1 + i, 1);
        set_pixel(xpxl1, ypxl1 + lw, fpart*xgap);
    }

    intery = yend + gradient;

    // Handle second endpoint
    xend = stdMath.round(x1);
    yend = y1 - (lw - 1)*0.5 + gradient*(xend - x1);
    xgap = 1 - (x1 + 0.5 - xend);
    xpxl2 = xend;
    ypxl2 = stdMath.floor(yend);
    fpart = yend - ypxl2;
    rfpart = 1 - fpart;
    if (steep)
    {
        set_pixel(ypxl2, xpxl2, rfpart*xgap);
        for (i=1; i<lw; ++i) set_pixel(ypxl2 + i, xpxl2, 1);
        set_pixel(ypxl2 + lw, xpxl2, fpart*xgap);
    }
    else
    {
        set_pixel(xpxl2, ypxl2, rfpart*xgap);
        for (i=1; i<lw; ++i) set_pixel(xpxl2, ypxl2 + i, 1);
        set_pixel(xpxl2, ypxl2 + lw, fpart*xgap);
    }

    // main drawing loop
    if (steep)
    {
        for (j=1,x=j+xpxl1; j<xpxl2; ++j,++x)
        {
            fpart = intery - stdMath.floor(intery);
            rfpart = 1 - fpart;
            y = stdMath.floor(intery);
            set_pixel(y, x, rfpart);
            for (i=1; i<lw; ++i) set_pixel(y + i, x, 1);
            set_pixel(y + lw, x, fpart);
            intery += gradient;
        }
    }
    else
    {
        for (j=1,x=j+xpxl1; j<xpxl2; ++j,++x)
        {
            fpart = intery - stdMath.floor(intery);
            rfpart = 1 - fpart;
            y = stdMath.floor(intery);
            set_pixel(x, y, rfpart);
            for (i=1; i<lw; ++i) set_pixel(x, y + i, 1);
            set_pixel(x, y + lw, fpart);
            intery += gradient;
        }
    }
}

// export it
return Rasterizer;
});
