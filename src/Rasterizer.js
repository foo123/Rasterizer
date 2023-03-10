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
    stdMath = Math, INF = Infinity, EPS = 1e-6, EMPTY_ARR = [],
    ImArray = 'undefined' !== typeof Uint8ClampedArray ? Uint8ClampedArray : ('undefined' !== typeof Uint8Array ? Uint8Array : Array);

function Rasterizer(width, height, set_rgba_at, get_rgba_at)
{
    var self = this, set_pixel;
    if (!(self instanceof Rasterizer)) return new Rasterizer(width, height, set_rgba_at, get_rgba_at);

    set_pixel = function set_pixel(x, y, i) {
        if (0 <= x && x < width && 0 <= y && y < height && 0 < i)
        {
            var c = get_rgba_at(x, y),
                a0 = 3 < c.length ? c[3] : 1.0,
                a1 = i, ao;
            if (0 < a0)
            {
                ao = a0*a1; //a1 + a0*(1.0 - a1);
                set_rgba_at(x, y, c[0], c[1], c[2], ao);
            }
        }
    };
    self.drawLine = function(x1, y1, x2, y2, lineWidth, lineDash) {
        if (null == lineWidth) lineWidth = 1;
        if (0 < lineWidth)
        {
            if (!lineDash) lineDash = EMPTY_ARR;
            if (lineDash.length & 1) lineDash = lineDash.concat(lineDash);
            draw_line(set_pixel, x1, y1, x2, y2, lineWidth, lineDash, 0, 0, width - 1, height - 1);
        }
        return self;
    };
    self.fillRect = function(x, y, w, h) {
        if (1 <= w && 1 <= h)
        {
            fill_rectangular(set_pixel, x, y, x + w - 1, y + h - 1, 0, 0, width - 1, height - 1);
        }
        return self;
    };
}
Rasterizer.VERSION = '1.0.0';
Rasterizer.prototype = {
    constructor: Rasterizer,
    drawLine: null,
    fillRect: null
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
        var c = [R, G, B, 3 < arguments.length ? A/255 : 1.0];
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

function draw_line(set_pixel, x1, y1, x2, y2, lw, ld, xmin, ymin, xmax, ymax)
{
    if (0 >= lw) return; // if no width return

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

    var x, y, dx, dy, sx, sy, r, n,
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
        r = dx/dy;
        //n = stdMath.abs(dy)*stdMath.sqrt(1 + r*r);
        dk = stdMath.min(stdMath.abs(y2 - y1), dl ? ld[k] : INF);
        for (;;)
        {
            y = y1 + sy*dk;
            x = x1 + (y - y1)*r;
            if (on_line) wu_thick_line(set_pixel, x1, y1, x, y, lw);
            x1 = x;
            y1 = y;
            if (stdMath.abs(y2 - y1) < 0.5) return;
            k = k+1 < dl ? (k+1) : 0;
            dk = stdMath.min(stdMath.abs(y2 - y1), dl ? ld[k] : INF);
            on_line = 1 - (k&1);
        }
    }
    else
    {
        r = dy/dx;
        //n = stdMath.abs(dx)*stdMath.sqrt(1 + r*r);
        dk = stdMath.min(stdMath.abs(x2 - x1), dl ? ld[k] : INF);
        for (;;)
        {
            x = x1 + sx*dk;
            y = y1 + (x - x1)*r;
            if (on_line) wu_thick_line(set_pixel, x1, y1, x, y, lw);
            x1 = x;
            y1 = y;
            if (stdMath.abs(x2 - x1) < 0.5) return;
            k = k+1 < dl ? (k+1) : 0;
            dk = stdMath.min(stdMath.abs(x2 - x1), dl ? ld[k] : INF);
            on_line = 1 - (k&1);
        }
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
        r1, r2, r3, r4,
        xn1, yn1, xn2, yn2;

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

    xn1 = x1 + p2*rn1;
    yn1 = y1 + p4*rn1;
    xn2 = x1 + p2*rn2;
    yn2 = y1 + p4*rn2;
    return [xn1, yn1, xn2, yn2];
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
    p.endx = p.x + p.sx*p.dx;
    p.endy = p.y + p.sy*p.dy;

    var xs = stdMath.round(p.x),
        ys = stdMath.round(p.y),
        xe = stdMath.round(p.endx),
        ye = stdMath.round(p.endy);

    p.steep = stdMath.abs(p.dy) > stdMath.abs(p.dx);
    if (p.steep)
    {
        p.gradient = p.sx*(p.dy ? p.dx/p.dy : 1.0);
        p.intersect = p.x + p.gradient;
        p.gap1 = 1 - (p.y + 0.5 - ys);
        p.gap2 = 1 - (p.endy + 0.5 - ye);
        p.fpart = p.x - xs;
        p.rfpart = 1 - p.fpart;
        p.end = function() {return p.y === p.endy;};
    }
    else
    {
        p.gradient = p.sy*(p.dx ? p.dy/p.dx : 1.0);
        p.intersect = p.y + p.gradient;
        p.gap1 = 1 - (p.x + 0.5 - xs);
        p.gap2 = 1 - (p.endx + 0.5 - xe);
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
    var dx = xe - xs, dy = ye - ys, p;

    if (0 === dx || 0 === dy)
    {
        fill_rect(set_pixel, stdMath.round(xs), stdMath.round(ys), stdMath.round(xe), stdMath.round(ye));
    }
    p = wu_step_init({
        x: xs,
        y: ys,
        dx: stdMath.abs(dx),
        dy: stdMath.abs(dy),
        sx: sign(dx),
        sy: sign(dy)
    });
    if (p.steep)
    {
        for (;;)
        {
            if (0 < p.rfpart) set_pixel(p.x, p.y, p.rfpart);
            if (0 < p.fpart) set_pixel(p.x + p.sx, p.y, p.fpart);
            if (p.end()) return;
            wu_step(p);
        }
    }
    else
    {
        for (;;)
        {
            if (0 < p.rfpart) set_pixel(p.x, p.y, p.rfpart);
            if (0 < p.fpart) set_pixel(p.x, p.y + p.sy, p.fpart);
            if (p.end()) return;
            wu_step(p);
        }
    }
}

function wu_thick_line(set_pixel, xs, ys, xe, ye, w)
{
    if (1 >= w) return wu_line(set_pixel, xs, ys, xe, ye);

    // Wu's line algorithm adjusted for thick lines
    var l, r, dx, dy, n, m, sx, sy, sgn, wx, wy, wx2, wy2, wsx, wsy, wsx2, wsy2;

    dx = stdMath.abs(xe - xs);
    dy = stdMath.abs(ye - ys);

    if (0 === dx)
    {
        fill_rect(set_pixel, stdMath.round(xs - w/2), stdMath.round(ys), stdMath.round(xe + w/2), stdMath.round(ye));
    }
    if (0 === dy)
    {
        fill_rect(set_pixel, stdMath.round(xs), stdMath.round(ys - w/2), stdMath.round(xe), stdMath.round(ye + w/2));
    }
/*
      wx      .
    +-----.(s)  .
wy  |.   |  .     .
       . |    .     .
 dy      |.     .     .
         |  .     .     .
         |    .     .(e)
         +----- .----
             dx
*/
    sx = xs > xe ? -1 : 1;
    sy = ys > ye ? -1 : 1;
    n = stdMath.sqrt(dx*dx + dy*dy);
    m = dy/dx;
    wx2 = (n/dy)*w;
    wy2 = (n/dx)*w;
    wx = wx2/2;
    wy = wy2/2;
    wsx = sx*wx;
    wsy = sy*wy;
    wsx2 = sx*wx2;
    wsy2 = sy*wy2;

    if (dy > dx)
    {
        // upper edge
        l = {dx:wy2*m, dy:wy2, sx:sx, sy:-sy, x:xs - wsx, y:ys + wsy};
        r = {dx:wy2/m, dy:wy2, sx:-sx, sy:-sy, x:l.x + wsx2, y:l.y};
        sgn = l.x > r.x ? -1 : 1;
        wu_step_init(l); wu_step_init(r);
        for (;;)
        {
            if (0 > sgn*(r.x - l.x) || l.end()) break;
            if (0 < l.rfpart) set_pixel(l.x, l.y, l.rfpart);
            if (1 < sgn*(r.x - l.x)) fill_rect(set_pixel, l.x + sx, l.y, r.x - sx, r.y);
            if (0 < r.fpart) set_pixel(r.x, r.y, r.fpart);
            wu_step(l); wu_step(r);
        }
        // main line body
        l = {dx:dx, dy:dy, sx:sx, sy:sy, x:xs - wsx, y:ys + wsy};
        r = {dx:dx, dy:dy, sx:sx, sy:sy, x:l.x + wsx2, y:l.y};
        sgn = l.x > r.x ? -1 : 1;
        wu_step_init(l); wu_step_init(r);
        for (;;)
        {
            if (0 < l.rfpart) set_pixel(l.x, l.y, l.rfpart);
            if (1 < sgn*(r.x - l.x)) fill_rect(set_pixel, l.x + sx, l.y, r.x - sx, r.y);
            if (0 < r.fpart) set_pixel(r.x, r.y, r.fpart);
            if (stdMath.abs(l.y + wsy - ye) < 1 || l.end()) break;
            wu_step(l); wu_step(r);
        }
        // lower edge
        l = {dx:wy2/m, dy:wy2, sx:sx, sy:sy, x:l.x, y:l.y};
        r = {dx:wy2*m, dy:wy2, sx:-sx, sy:sy, x:l.x + wsx2, y:l.y};
        sgn = l.x > r.x ? -1 : 1;
        wu_step_init(l); wu_step_init(r);
        for (;;)
        {
            if (0 > sgn*(r.x - l.x) || l.end()) break;
            if (0 < l.rfpart) set_pixel(l.x, l.y, l.rfpart);
            if (1 < sgn*(r.x - l.x)) fill_rect(set_pixel, l.x + sx, l.y, r.x - sx, r.y);
            if (0 < r.fpart) set_pixel(r.x, r.y, r.fpart);
            wu_step(l); wu_step(r);
        }
    }
    else
    {
        // left edge
        l = {dx:wy2*m, dy:wy2, sx:-sx, sy:sy, x:xs + wsx, y:ys - wsy};
        r = {dx:wy2/m, dy:wy2, sx:-sx, sy:-sy, x:l.x, y:l.y + wsy2};
        sgn = l.y > r.y ? -1 : 1;
        wu_step_init(l); wu_step_init(r);
        for (;;)
        {
            if (0 < l.rfpart) set_pixel(l.x, l.y, l.rfpart);
            if (1 < sgn*(r.y - l.y)) fill_rect(set_pixel, l.x, l.y + sy, r.x, r.y - sy);
            if (0 < r.fpart) set_pixel(r.x, r.y, r.fpart);
            if (0 > sgn*(r.y - l.y) || l.end()) break;
            wu_step(l); wu_step(r);
        }
        // main line body
        l = {dx:dx, dy:dy, sx:sx, sy:sy, x:xs + wsx, y:ys - wsy};
        r = {dx:dx, dy:dy, sx:sx, sy:sy, x:l.x, y:l.y + wsy2};
        sgn = l.y > r.y ? -1 : 1;
        wu_step_init(l); wu_step_init(r);
        for (;;)
        {
            if (0 < l.rfpart) set_pixel(l.x, l.y, l.rfpart);
            if (1 < sgn*(r.y - l.y)) fill_rect(set_pixel, l.x, l.y + sy, r.x, r.y - sy);
            if (0 < r.fpart) set_pixel(r.x, r.y, r.fpart);
            if (stdMath.abs(l.x + wsx - xe) < 1 || l.end()) break;
            wu_step(l); wu_step(r);
        }
        // right edge
        l = {dx:wy2/m, dy:wy2, sx:sx, sy:sy, x:l.x, y:l.y};
        r = {dx:wy2*m, dy:wy2, sx:sx, sy:-sy, x:l.x, y:l.y + wsy2};
        sgn = l.y > r.y ? -1 : 1;
        wu_step_init(l); wu_step_init(r);
        for (;;)
        {
            if (0 < l.rfpart) set_pixel(l.x, l.y, l.rfpart);
            if (1 < sgn*(r.y - l.y)) fill_rect(set_pixel, l.x, l.y + sy, r.x, r.y - sy);
            if (0 < r.fpart) set_pixel(r.x, r.y, r.fpart);
            if (0 > sgn*(r.y - l.y) || l.end()) break;
            wu_step(l); wu_step(r);
        }
    }
}

// export it
return Rasterizer;
});
