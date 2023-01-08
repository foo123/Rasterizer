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


function Rasterizer(vx0, vy0, vx1, vy1, set_pixel, get_color_at)
{
    var self = this;
    if (!(self instanceof Rasterizer)) return new Rasterizer(vx0, vy0, vx1, vy1, set_pixel, get_color_at);

    self.drawLine = function(x0, y0, x1, y1, width) {
        if (null == width) width = 2;
        drawLine(stdMath.round(x0), stdMath.round(y0), stdMath.round(x1), stdMath.round(y1), width-1, vx0, vy0, vx1, vy1, set_pixel, get_color_at);
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
Rasterizer.fixedColor = function(R, G, B, A) {
    var r = R, g = G, b = B, a = 3 < arguments.length ? A : 255;
    return function(x, y) {
        return [r, g, b, a];
    };
};
Rasterizer.setBitmapPixel = function(imgData) {
    var width = imgData.width, height = imgData.height;
    return function(x, y, c) {
        if (0 <= x && x < width && 0 <= y && y < height)
        {
            var index = (x + width*y) << 2;
            imgData.data[index  ] = c[0];
            imgData.data[index+1] = c[1];
            imgData.data[index+2] = c[2];
            imgData.data[index+3] = c.length > 3 ? c[3] : 255;
        }
    };
};

// utilities
function clamp(x, min, max)
{
    return stdMath.max(stdMath.min(x, max), min);
}

// adapted from https://zingl.github.io/bresenham.html
function drawLine(x0, y0, x1, y1, width, vx0, vy0, vx1, vy1, set_pixel, get_color_at)
{
    // if at least part of line is inside viewbox
    if (
        stdMath.max(x0, x1) > vx0 &&
        stdMath.min(x0, x1) < vx1 &&
        stdMath.max(y0, y1) > vy0 &&
        stdMath.min(y0, y1) < vy1
    )
    {
        var dx = stdMath.abs(x1-x0), sx = x0 < x1 ? 1 : -1,
            dy = stdMath.abs(y1-y0), sy = y0 < y1 ? 1 : -1,
            err = dx-dy, e2, x2, y2, wd = (width+1)/2,
            ed = dx+dy === 0 ? 1 : stdMath.sqrt(dx*dx+dy*dy),
            c, a, ew;
        // clip it to view box
        x0 = clamp(x0, vx0, vx1);
        x1 = clamp(x1, vx0, vx1);
        y0 = clamp(y0, vy0, vy1);
        y1 = clamp(y1, vy0, vy1);
        // drawing loop
        for (;;)
        {
            c = get_color_at(x0, y0);
            a = clamp(stdMath.abs(err-dx+dy)/ed-wd+1, 0, 1);
            set_pixel(x0, y0, [c[0], c[1], c[2], clamp(stdMath.round(a*c[3]), 0, 255)]);
            e2 = err; x2 = x0;
            if (2*e2 >= -dx)
            {
                for (ew = ed*wd, e2 += dy, y2 = y0; e2 < ew && (y1 !== y2 || dx > dy); e2 += dx)
                {
                    y2 += sy;
                    c = get_color_at(x0, y2);
                    a = clamp(stdMath.abs(e2)/ed-wd+1, 0, 1);
                    set_pixel(x0, y2, [c[0], c[1], c[2], clamp(stdMath.round(a*c[3]), 0, 255)]);
                }
                if (x0 === x1) break;
                e2 = err; err -= dy; x0 += sx;
            }
            if (2*e2 <= dy)
            {
                for (ew = ed*wd, e2 = dx-e2; e2 < ew && (x1 !== x2 || dx < dy); e2 += dy)
                {
                    x2 += sx;
                    c = get_color_at(x2, y0);
                    a = clamp(stdMath.abs(e2)/ed-wd+1, 0, 1);
                    set_pixel(x2, y0, [c[0], c[1], c[2], clamp(stdMath.round(a*c[3]), 0, 255)]);
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
