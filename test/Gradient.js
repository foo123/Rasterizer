/**
*   Gradient
*   class to create linear/radial/elliptical/conic gradients as bitmaps even without canvas
*
*   @version 1.2.1
*   https://github.com/foo123/Gradient
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
    /* module name */           "Gradient",
    /* module factory */        function ModuleFactory__Gradient(undef) {
"use strict";

var HAS = Object.prototype.hasOwnProperty, def = Object.defineProperty,
    stdMath = Math, PI = stdMath.PI, TWO_PI = 2*PI, HALF_PI = PI/2, EPS = 1e-6,
    ImArray = 'undefined' !== typeof Uint8ClampedArray ? Uint8ClampedArray : ('undefined' !== typeof Uint8Array ? Uint8Array : Array);

// Gradient Pattern
function Gradient(grad_color_at)
{
    if (
        !(this instanceof Gradient) ||
        ('function' !== typeof grad_color_at) ||
        (5 > grad_color_at.length)
    )
    {
        throw new Error('Gradient: invalid gradient');
    }

    var self = this, transform = new Transform(),
        stops = {'0': [0, [0,0,0,0]], '1': [1, [0,0,0,0]]},
        _stops = null, colorStops
    ;
    colorStops = function() {
        if (null == _stops)
        {
            var o = Object.keys(stops);
            o.sort(function(a, b) {return parseFloat(a) - parseFloat(b);});
            _stops = o.map(function(o) {return stops[o];}).filter(function(s) {return 0 <= s[0] && s[0] <= 1;});
        }
        return _stops;
    };

    def(self, 'transform', {
        get: function() {
            return transform;
        },
        set: function(transform) {
        },
        enumerable: true,
        configurable: false
    });
    self.addColorStop = function(offset, color) {
        _stops = null;
        stops[String(offset)] = [+offset, parseColor(color) || [0,0,0,0]];
    };
    self.getColorAt = function(x, y) {
        var p = transform.imatrix(true).transform(x, y);
        return grad_color_at(p.x, p.y, colorStops(), new ImArray(4), 0);
    };
    self.getBitmap = function(width, height) {
        width = stdMath.round(width);
        height = stdMath.round(height);
        var imatrix = transform.imatrix(true),
            color_stops = colorStops(),
            i, x, y, p,
            size = (width*height) << 2,
            bmp = new ImArray(size);
        for (x=0,y=0,i=0; i<size; i+=4,++x)
        {
            if (x >= width) {x=0; ++y;}
            p = imatrix.transform(x, y);
            grad_color_at(p.x, p.y, color_stops, bmp, i);
        }
        return bmp;
    };
}
Gradient.VERSION = "1.2.1";
Gradient.prototype = {
    constructor: Gradient,
    transform: null,
    addColorStop: null,
    getColorAt: null,
    getBitmap: null
};
Gradient.createLinearGradient = function(x1, y1, x2, y2) {
    x1 = x1 || 0;
    y1 = y1 || 0;
    x2 = x2 || 0;
    y2 = y2 || 0;
    var dx = x2 - x1, dy = y2 - y1,
        vert = is_strictly_equal(dx, 0),
        hor = is_strictly_equal(dy, 0),
        f = 2*dx*dy;
    return new Gradient(function(x, y, stops, pixel, i) {
        var t, px, py, stop1, stop2, sl = stops.length;
        px = x - x1; py = y - y1;
        t = hor && vert ? 0 : (vert ? py/dy : (hor ? px/dx : (px*dy + py*dx)/f));
        if (0 >= t)
        {
            stop1 = stop2 = 0;
            t = 0;
        }
        else if (1 <= t)
        {
            stop1 = stop2 = sl - 1;
            t = 1;
        }
        else
        {
            stop2 = binary_search(t, stops, sl);
            stop1 = 0 === stop2 ? 0 : (stop2 - 1);
        }
        return interpolatePixel(
            pixel, i || 0,
            stops[stop1][1], stops[stop2][1],
            stops[stop2][0] > stops[stop1][0] ? (t - stops[stop1][0])/(stops[stop2][0] - stops[stop1][0]) : t
        );
    });
};
Gradient.createRadialGradient = function(x0, y0, r0, x1, y1, r1) {
    x0 = x0 || 0;
    y0 = y0 || 0;
    r0 = r0 || 0;
    x1 = x1 || 0;
    y1 = y1 || 0;
    r1 = r1 || 0;
    // 0 = (r0+t*(r1-r0))**2 - (x - (x0 + t*(x1-x0)))**2 - (y - (y0 + t*(y1-y0)))**2
    // t^{2} \left(r_{0}^{2} - 2 r_{0} r_{1} + r_{1}^{2} - x_{0}^{2} + 2 x_{0} x_{1} - x_{1}^{2} - y_{0}^{2} + 2 y_{0} y_{1} - y_{1}^{2}\right) + t \left(- 2 r_{0}^{2} + 2 r_{0} r_{1} - 2 x x_{0} + 2 x x_{1} + 2 x_{0}^{2} - 2 x_{0} x_{1} - 2 y y_{0} + 2 y y_{1} + 2 y_{0}^{2} - 2 y_{0} y_{1}\right) - x^{2} + 2 x x_{0} - x_{0}^{2} - y^{2} + 2 y y_{0} - y_{0}^{2}+r_{0}^{2}
    /*px1 = x - cx1; py1 = y - cy1;
    dr1 = sqrt(px1*px1 + py1*py1) - r1;
    px2 = x - cx2; py2 = y - cy2;
    dr2 = r2 - sqrt(px2*px2 + py2*py2);*/
    var a = r0*r0 - 2*r0*r1 + r1*r1 - x0*x0 + 2*x0*x1 - x1*x1 - y0*y0 + 2*y0*y1 - y1*y1,
        b = -2*r0*r0 + 2*r0*r1 + 2*x0*x0 - 2*x0*x1 + 2*y0*y0 - 2*y0*y1,
        c = -x0*x0 - y0*y0 + r0*r0;
    return new Gradient(function(x, y, stops, pixel, i) {
        var t, px, py, pr, s, stop1, stop2, sl = stops.length;
        s = quadratic_roots(a, b - 2*x*x0 + 2*x*x1 - 2*y*y0 + 2*y*y1, c - x*x + 2*x*x0 - y*y + 2*y*y0);
        if (!s)
        {
            t = -1;
        }
        else if (1 < s.length)
        {
            if (0 <= s[0] && s[0] <= 1 && 0 <= s[1] && s[1] <= 1) t = stdMath.min(s[0], s[1]);
            else if (0 <= s[0] && s[0] <= 1) t = s[0];
            else if (0 <= s[1] && s[1] <= 1) t =  s[1];
            else t = stdMath.min(s[0], s[1]);
        }
        else
        {
            t = s[0];
        }
        if (0 > t || t > 1)
        {
            px = x - x0; py = y - y0;
            pr = stdMath.sqrt(px*px + py*py);
            if (pr < r0)
            {
                t = 0;
                stop2 = stop1 = 0;
            }
            else
            {
                t = 1;
                stop2 = stop1 = sl - 1;
            }
        }
        else
        {
            //t = dr1/(dr2 + dr1);
            stop2 = binary_search(t, stops, sl);
            stop1 = 0 === stop2 ? 0 : (stop2 - 1);
        }
        return interpolatePixel(
            pixel, i || 0,
            stops[stop1][1], stops[stop2][1],
            stops[stop2][0] > stops[stop1][0] ? (t - stops[stop1][0])/(stops[stop2][0] - stops[stop1][0]) : t
        );
    });
};
Gradient.createConicGradient = function(angle, cx, cy) {
    angle = angle || 0;
    cx = cx || 0;
    cy = cy || 0;
    return new Gradient(function(x, y, stops, pixel, i) {
        var t, stop1, stop2, sl = stops.length;
        t = stdMath.atan2(y - cy, x - cx) + HALF_PI - angle;
        if (0 > t) t += TWO_PI;
        if (t > TWO_PI) t -= TWO_PI;
        t = clamp(t/TWO_PI, 0, 1);
        stop2 = binary_search(t, stops, sl);
        stop1 = 0 === stop2 ? 0 : (stop2 - 1);
        return interpolatePixel(
            pixel, i || 0,
            stops[stop1][1], stops[stop2][1],
            stops[stop2][0] > stops[stop1][0] ? (t - stops[stop1][0])/(stops[stop2][0] - stops[stop1][0]) : t
        );
    });
};
Gradient.createEllipticGradient = function(cx, cy, rx, ry, angle) {
    cx = cx || 0;
    cy = cy || 0;
    rx = rx || 0;
    ry = ry || 0;
    angle = angle || 0;
    var cos = stdMath.cos(angle), sin = stdMath.sin(angle);
    return new Gradient(function(x, y, stops, pixel, i) {
        var t, px, py, stop1, stop2, sl = stops.length;
        px = (cos*(x - cx) - sin*(y - cy))/rx;
        py = (sin*(x - cx) + cos*(y - cy))/ry;
        t = stdMath.sqrt(px*px + py*py);
        if (1 <= t)
        {
            t = 1;
            stop2 = stop1 = sl - 1;
        }
        else
        {
            stop2 = binary_search(t, stops, sl);
            stop1 = 0 === stop2 ? 0 : (stop2 - 1);
        }
        return interpolatePixel(
            pixel, i || 0,
            stops[stop1][1], stops[stop2][1],
            stops[stop2][0] > stops[stop1][0] ? (t - stops[stop1][0])/(stops[stop2][0] - stops[stop1][0]) : t
        );
    });
};

// Image Pattern
function Pattern(pat_color_at)
{
    if (
        !(this instanceof Pattern) ||
        ('function' !== typeof pat_color_at) ||
        (4 > pat_color_at.length)
    )
    {
        throw new Error('Pattern: invalid pattern');
    }

    var self = this, transform = new Transform();

    def(self, 'transform', {
        get: function() {
            return transform;
        },
        set: function(transform) {
        },
        enumerable: true,
        configurable: false
    });
    self.getColorAt = function(x, y) {
        var p = transform.imatrix(true).transform(x, y);
        return pat_color_at(p.x, p.y, new ImArray(4), 0);
    };
    self.getBitmap = function(width, height) {
        width = stdMath.round(width);
        height = stdMath.round(height);
        var imatrix = transform.imatrix(true),
            i, x, y, p,
            size = (width*height) << 2,
            bmp = new ImArray(size);
        for (x=0,y=0,i=0; i<size; i+=4,++x)
        {
            if (x >= width) {x=0; ++y;}
            p = imatrix.transform(x, y);
            pat_color_at(p.x, p.y, bmp, i);
        }
        return bmp;
    };
}
Pattern.prototype = {
    constructor: Pattern,
    transform: null,
    getColorAt: null,
    getBitmap: null
};
Pattern.createPattern = function(imageData, repetition) {
    if (imageData && imageData.data && imageData.width && imageData.height && (imageData.data.length === 4*imageData.width*imageData.height))
    {
        var width = imageData.width, height = imageData.height;
        switch (repetition)
        {
            case 'no-repeat':
            return new Pattern(function(x, y, pixel, i) {
                x = stdMath.round(x);
                y = stdMath.round(y);
                if (0 <= x && x < width && 0 <= y && y < height)
                {
                    var j = (x + y*width) << 2;
                    pixel[i + 0] = imageData.data[j + 0];
                    pixel[i + 1] = imageData.data[j + 1];
                    pixel[i + 2] = imageData.data[j + 2];
                    pixel[i + 3] = imageData.data[j + 3];
                }
            });
            case 'repeat-x':
            return new Pattern(function(x, y, pixel, i) {
                x = stdMath.round(x);
                y = stdMath.round(y);
                if (0 <= y && y < height)
                {
                    x = x % width;
                    if (0 > x) x += width;
                    var j = (x + y*width) << 2;
                    pixel[i + 0] = imageData.data[j + 0];
                    pixel[i + 1] = imageData.data[j + 1];
                    pixel[i + 2] = imageData.data[j + 2];
                    pixel[i + 3] = imageData.data[j + 3];
                }
            });
            case 'repeat-y':
            return new Pattern(function(x, y, pixel, i) {
                x = stdMath.round(x);
                y = stdMath.round(y);
                if (0 <= x && x < width)
                {
                    y = y % height;
                    if (0 > y) y += height;
                    var j = (x + y*width) << 2;
                    pixel[i + 0] = imageData.data[j + 0];
                    pixel[i + 1] = imageData.data[j + 1];
                    pixel[i + 2] = imageData.data[j + 2];
                    pixel[i + 3] = imageData.data[j + 3];
                }
            });
            case 'repeat':
            default:
            return new Pattern(function(x, y, pixel, i) {
                x = stdMath.round(x);
                y = stdMath.round(y);
                x = x % width;
                if (0 > x) x += width;
                y = y % height;
                if (0 > y) y += height;
                var j = (x + y*width) << 2;
                pixel[i + 0] = imageData.data[j + 0];
                pixel[i + 1] = imageData.data[j + 1];
                pixel[i + 2] = imageData.data[j + 2];
                pixel[i + 3] = imageData.data[j + 3];
            });
        }
    }
    else
    {
        throw new Error('Pattern: invalid image data');
    }
};
Gradient.Pattern = Pattern;
Gradient.createPattern = Pattern.createPattern;

// Transform
function Transform()
{
    var self = this,
        matrix = new Matrix(),
        imatrix = new Matrix(),
        prev = [];

    self.dispose = function() {
        matrix = null;
        imatrix = null;
        prev = null;
    };
    self.matrix = function(orig) {
        return true === orig ? matrix : matrix.clone();
    };
    self.imatrix = function(orig) {
        return true === orig ? imatrix : imatrix.clone();
    };
    self.reset = function() {
        matrix = new Matrix();
        imatrix = new Matrix();
        return self;
    };
    self.save = function() {
        // up to 10 saves
        if (prev.length >= 10) prev.shift();
        prev.push([matrix, imatrix]);
        return self;
    };
    self.restore = function() {
        if (prev.length)
        {
            var p = prev.pop();
            matrix = p[0]; imatrix = p[1];
        }
        return self;
    };
    self.scale = function(sx, sy, ox, oy) {
        matrix = Matrix.scale(sx, sy, ox, oy).mul(matrix);
        imatrix = imatrix.mul(Matrix.scale(1/sx, 1/sy, ox, oy));
        return self;
    };
    self.rotate = function(theta, ox, oy) {
        matrix = Matrix.rotate(theta, ox, oy).mul(matrix);
        imatrix = imatrix.mul(Matrix.rotate(-theta, ox, oy));
        return self;
    };
    self.translate = function(tx, ty) {
        matrix = Matrix.translate(tx, ty).mul(matrix);
        imatrix = imatrix.mul(Matrix.translate(-tx, -ty));
        return self;
    };
    self.reflectX = function(s) {
        matrix = Matrix.reflectX().mul(matrix);
        imatrix = imatrix.mul(Matrix.reflectX());
        return self;
    };
    self.reflectY = function(s) {
        matrix = Matrix.reflectY().mul(matrix);
        imatrix = imatrix.mul(Matrix.reflectY());
        return self;
    };
    self.skewX = function(s) {
        matrix = Matrix.skewX(s).mul(matrix);
        imatrix = imatrix.mul(Matrix.skewX(s).inv());
        return self;
    };
    self.skewY = function(s) {
        matrix = Matrix.skewY(s).mul(matrix);
        imatrix = imatrix.mul(Matrix.skewY(s).inv());
        return self;
    };
}
Transform.prototype = {
    constructor: Transform,
    dispose: null,
    matrix: null,
    imatrix: null,
    reset: null,
    save: null,
    restore: null,
    scale: null,
    rotate: null,
    translate: null,
    reflectX: null,
    reflectY: null,
    skewX: null,
    skewY: null
};

// Homogeneous Transformation Matrix
function Matrix(m00, m01, m02, m10, m11, m12)
{
    var self = this;
    if (arguments.length)
    {
        self.m00 = m00;
        self.m01 = m01;
        self.m02 = m02;
        self.m10 = m10;
        self.m11 = m11;
        self.m12 = m12;
    }
}
Matrix.prototype = {
    constructor: Matrix,
    m00: 1,
    m01: 0,
    m02: 0,
    m10: 0,
    m11: 1,
    m12: 0,
    clone: function() {
        var self = this;
        return new Matrix(
        self.m00, self.m01, self.m02,
        self.m10, self.m11, self.m12
        );
    },
    mul: function(other) {
        var self = this;
        return new Matrix(
        self.m00*other.m00 + self.m01*other.m10,
        self.m00*other.m01 + self.m01*other.m11,
        self.m00*other.m02 + self.m01*other.m12 + self.m02,
        self.m10*other.m00 + self.m11*other.m10,
        self.m10*other.m01 + self.m11*other.m11,
        self.m10*other.m02 + self.m11*other.m12 + self.m12
        );
    },
    inv: function() {
        var self = this,
            a00 = self.m00, a01 = self.m01, a02 = self.m02,
            a10 = self.m10, a11 = self.m11, a12 = self.m12,
            det2 = a00*a11 - a01*a10,
            i00 = 0, i01 = 0, i10 = 0, i11 = 0;

        if (is_strictly_equal(det2, 0)) return null;
        i00 = a11/det2; i01 = -a01/det2;
        i10 = -a10/det2; i11 = a00/det2;
        return new Matrix(
        i00, i01, -i00*a02 - i01*a12,
        i10, i11, -i10*a02 - i11*a12
        );
    },
    transform: function(x, y) {
        if (1 === arguments.length)
        {
            y = x.y;
            x = x.x;
        }
        var self = this;
        return {
            x: self.m00*x + self.m01*y + self.m02,
            y: self.m10*x + self.m11*y + self.m12
        };
    }
};
Matrix.translate = function(tx, ty) {
    return new Matrix(
    1, 0, tx || 0,
    0, 1, ty || 0
    );
};
Matrix.scale = function(sx, sy, ox, oy) {
    ox = ox || 0;
    oy = oy || 0;
    return new Matrix(
    sx, 0,  -sx*ox + ox,
    0,  sy, -sy*oy + oy
    );
};
Matrix.rotate = function(theta, ox, oy) {
    ox = ox || 0;
    oy = oy || 0;
    var cos = stdMath.cos(theta || 0), sin = stdMath.sin(theta || 0);
    return new Matrix(
    cos, -sin, ox - cos*ox + sin*oy,
    sin,  cos, oy - cos*oy - sin*ox
    );
};
Matrix.reflectX = function(s) {
    return new Matrix(
    -1, 0, 0,
     0, 1, 0
    );
};
Matrix.reflectY = function(s) {
    return new Matrix(
    1,  0, 0,
    0, -1, 0
    );
};
Matrix.skewX = function(s) {
    return new Matrix(
    1, s || 0, 0,
    0, 1, 0
    );
};
Matrix.skewY = function(s) {
    return new Matrix(
    1, 0, 0,
    s || 0, 1, 0
    );
};

// utils
function is_strictly_equal(a, b)
{
    return stdMath.abs(a - b) < Number.EPSILON;
}
function is_almost_equal(a, b)
{
    return stdMath.abs(a - b) < EPS;
}
function clamp(x, xmin, xmax)
{
    return stdMath.min(stdMath.max(x, xmin), xmax);
}
function linear_roots(a, b)
{
    return is_strictly_equal(a, 0) ? false : [-b/a];
}
function quadratic_roots(a, b, c)
{
    if (is_strictly_equal(a, 0)) return linear_roots(b, c);
    var D = b*b - 4*a*c, DS = 0;
    if (is_almost_equal(D, 0)) return [-b/(2*a)];
    if (0 > D) return false;
    DS = stdMath.sqrt(D);
    return [(-b-DS)/(2*a), (-b+DS)/(2*a)];
}
function binary_search(x, a, n)
{
    // assume a is sorted ascending
    var l = 0, r = n - 1, m;
    while (l < r)
    {
        if (a[l][0] >= x) return l;
        m = (l + r) >>> 1;
        if (a[m][0] < x) l = m + 1;
        else r = m;
    }
    return l;
}
// color utilities
function interpolatePixel(pixel, index, rgba0, rgba1, t)
{
    pixel[index + 0] = clamp(stdMath.round(rgba0[0] + t*(rgba1[0] - rgba0[0])), 0, 255);
    pixel[index + 1] = clamp(stdMath.round(rgba0[1] + t*(rgba1[1] - rgba0[1])), 0, 255);
    pixel[index + 2] = clamp(stdMath.round(rgba0[2] + t*(rgba1[2] - rgba0[2])), 0, 255);
    pixel[index + 3] = 3 < rgba0.length ? clamp(stdMath.round(255*(rgba0[3] + t*(rgba1[3] - rgba0[3]))), 0, 255) : 255;
    return pixel;
}
var hexRE = /^#([0-9a-fA-F]{3,6})\b/,
    rgbRE = /^(rgba?)\b\s*\(([^\)]*)\)/i,
    hslRE = /^(hsla?)\b\s*\(([^\)]*)\)/i,
    hwbRE = /^(hwba?)\b\s*\(([^\)]*)\)/i,
    sepRE = /\s+|,/gm, aRE = /\/\s*(\d*?\.?\d+%?)/;

function hex2rgb(h)
{
    if (!h || 3 > h.length)
    {
        return [0, 0, 0, 0];
    }
    else if (6 > h.length)
    {
        return [
        clamp(parseInt(h[0]+h[0], 16)||0, 0, 255),
        clamp(parseInt(h[1]+h[1], 16)||0, 0, 255),
        clamp(parseInt(h[2]+h[2], 16)||0, 0, 255),
        1
        ];
    }
    else
    {
        return [
        clamp(parseInt(h[0]+h[1], 16)||0, 0, 255),
        clamp(parseInt(h[2]+h[3], 16)||0, 0, 255),
        clamp(parseInt(h[4]+h[5], 16)||0, 0, 255),
        1
        ];
    }
}
function hsl2rgb(h, s, l, a)
{
    var c, hp, d, x, m, r, g, b;
    s /= 100;
    l /= 100;
    c = (1 - stdMath.abs(2*l - 1))*s;
    hp = h/60;
    d = stdMath.floor(hp / 2);
    x = c*(1 - stdMath.abs(hp - 2*d - 1));
    m = l - c/2;
    if (hp >= 0 && hp < 1)
    {
        r = c + m;
        g = x + m;
        b = 0 + m;
    }
    else if (hp >= 1 && hp < 2)
    {
        r = x + m;
        g = c + m;
        b = 0 + m;
    }
    else if (hp >= 2 && hp < 3)
    {
        r = 0 + m;
        g = c + m;
        b = x + m;
    }
    else if (hp >= 3 && hp < 4)
    {
        r = 0 + m;
        g = x + m;
        b = c + m;
    }
    else if (hp >= 4 && hp < 5)
    {
        r = x + m;
        g = 0 + m;
        b = c + m;
    }
    else //if (hp >= 5 && hp < 6)
    {
        r = c + m;
        g = 0 + m;
        b = x + m;
    }
    return [
    clamp(stdMath.round(r*255), 0, 255),
    clamp(stdMath.round(g*255), 0, 255),
    clamp(stdMath.round(b*255), 0, 255),
    a
    ];
}
function hsv2rgb(h, s, v, a)
{
    v /= 100;
    var l = v*(1 - s/200), lm = stdMath.min(l, 1-l);
    return hsl2rgb(h, 0 === lm ? 0 : 100*(v-l)/lm, 100*l, a);
}
function hwb2rgb(h, w, b, a)
{
    var b1 = 1 - b/100;
    return hsv2rgb(h, 100 - w/b1, 100*b1, a);
}
var TRIM_RE = /^\s+|\s+$/gm;
var trim = String.prototype.trim ? function trim(s) {
    return s.trim()
} : function trim() {
    return s.replace(TRIM_RE, '');
};
function parseColor(s)
{
    var m, hasOpacity;
    s = trim(String(s)).toLowerCase();
    if (m = s.match(hexRE))
    {
        // hex
        return hex2rgb(m[1]);
    }
    if (m = s.match(hwbRE))
    {
        // hwb(a)
        hasOpacity = m[2].match(aRE);
        var col = trim(m[2]).split(sepRE).map(trim),
            h = col[0] ? col[0] : '0',
            w = col[1] ? col[1] : '0',
            b = col[2] ? col[2] : '0',
            a = hasOpacity ? hasOpacity[1] : '1';
        h = parseFloat(h, 10);
        w = '%' === w.slice(-1) ? parseFloat(w, 10) : parseFloat(w, 10)*100/255;
        b = '%' === b.slice(-1) ? parseFloat(b, 10) : parseFloat(b, 10)*100/255;
        a = '%' === a.slice(-1) ? parseFloat(a, 10)/100 : parseFloat(a, 10);
        return hwb2rgb(h, w, b, a);
    }
    if (m = s.match(hslRE))
    {
        // hsl(a)
        hasOpacity = m[2].match(aRE);
        var col = trim(m[2]).split(sepRE).map(trim),
            h = col[0] ? col[0] : '0',
            s = col[1] ? col[1] : '0',
            l = col[2] ? col[2] : '0',
            a = hasOpacity ? hasOpacity[1] : ('hsla' === m[1] && null != col[3] ? col[3] : '1');
        h = parseFloat(h, 10);
        s = '%' === s.slice(-1) ? parseFloat(s, 10) : parseFloat(s, 10)*100/255;
        l = '%' === l.slice(-1) ? parseFloat(l, 10) : parseFloat(l, 10)*100/255;
        a = '%' === a.slice(-1) ? parseFloat(a, 10)/100 : parseFloat(a, 10);
        return hsl2rgb(h, s, l, a);
    }
    if (m = s.match(rgbRE))
    {
        // rgb(a)
        hasOpacity = m[2].match(aRE);
        var col = trim(m[2]).split(sepRE).map(trim),
            r = col[0] ? col[0] : '0',
            g = col[1] ? col[1] : '0',
            b = col[2] ? col[2] : '0',
            a = hasOpacity ? hasOpacity[1] : ('rgba' === m[1] && null != col[3] ? col[3] : '1');
        r = '%' === r.slice(-1) ? parseFloat(r, 10)*2.55 : parseFloat(r, 10);
        g = '%' === g.slice(-1) ? parseFloat(g, 10)*2.55 : parseFloat(g, 10);
        b = '%' === b.slice(-1) ? parseFloat(b, 10)*2.55 : parseFloat(b, 10);
        a = '%' === a.slice(-1) ? parseFloat(a, 10)/100 : parseFloat(a, 10);
        return [r, g, b, a];
    }
    if (HAS.call(keywords, s))
    {
        // keyword
        return keywords[s].slice();
    }
}
var keywords = {
    // https://developer.mozilla.org/en-US/docs/Web/CSS/color_value
    /* extended */
     'transparent'         : [  0,0,0        ,0]
    ,'aliceblue'           : [  240,248,255  ,1]
    ,'antiquewhite'        : [  250,235,215  ,1]
    ,'aqua'                : [  0,255,255    ,1]
    ,'aquamarine'          : [  127,255,212  ,1]
    ,'azure'               : [  240,255,255  ,1]
    ,'beige'               : [  245,245,220  ,1]
    ,'bisque'              : [  255,228,196  ,1]
    ,'black'               : [  0,0,0    ,    1]
    ,'blanchedalmond'      : [  255,235,205  ,1]
    ,'blue'                : [  0,0,255  ,    1]
    ,'blueviolet'          : [  138,43,226   ,1]
    ,'brown'               : [  165,42,42    ,1]
    ,'burlywood'           : [  222,184,135  ,1]
    ,'cadetblue'           : [  95,158,160   ,1]
    ,'chartreuse'          : [  127,255,0    ,1]
    ,'chocolate'           : [  210,105,30   ,1]
    ,'coral'               : [  255,127,80   ,1]
    ,'cornflowerblue'      : [  100,149,237  ,1]
    ,'cornsilk'            : [  255,248,220  ,1]
    ,'crimson'             : [  220,20,60    ,1]
    ,'cyan'                : [  0,255,255    ,1]
    ,'darkblue'            : [  0,0,139  ,    1]
    ,'darkcyan'            : [  0,139,139    ,1]
    ,'darkgoldenrod'       : [  184,134,11   ,1]
    ,'darkgray'            : [  169,169,169  ,1]
    ,'darkgreen'           : [  0,100,0  ,    1]
    ,'darkgrey'            : [  169,169,169  ,1]
    ,'darkkhaki'           : [  189,183,107  ,1]
    ,'darkmagenta'         : [  139,0,139    ,1]
    ,'darkolivegreen'      : [  85,107,47    ,1]
    ,'darkorange'          : [  255,140,0    ,1]
    ,'darkorchid'          : [  153,50,204   ,1]
    ,'darkred'             : [  139,0,0  ,    1]
    ,'darksalmon'          : [  233,150,122  ,1]
    ,'darkseagreen'        : [  143,188,143  ,1]
    ,'darkslateblue'       : [  72,61,139    ,1]
    ,'darkslategray'       : [  47,79,79 ,    1]
    ,'darkslategrey'       : [  47,79,79 ,    1]
    ,'darkturquoise'       : [  0,206,209    ,1]
    ,'darkviolet'          : [  148,0,211    ,1]
    ,'deeppink'            : [  255,20,147   ,1]
    ,'deepskyblue'         : [  0,191,255    ,1]
    ,'dimgray'             : [  105,105,105  ,1]
    ,'dimgrey'             : [  105,105,105  ,1]
    ,'dodgerblue'          : [  30,144,255   ,1]
    ,'firebrick'           : [  178,34,34    ,1]
    ,'floralwhite'         : [  255,250,240  ,1]
    ,'forestgreen'         : [  34,139,34    ,1]
    ,'fuchsia'             : [  255,0,255    ,1]
    ,'gainsboro'           : [  220,220,220  ,1]
    ,'ghostwhite'          : [  248,248,255  ,1]
    ,'gold'                : [  255,215,0    ,1]
    ,'goldenrod'           : [  218,165,32   ,1]
    ,'gray'                : [  128,128,128  ,1]
    ,'green'               : [  0,128,0  ,    1]
    ,'greenyellow'         : [  173,255,47   ,1]
    ,'grey'                : [  128,128,128  ,1]
    ,'honeydew'            : [  240,255,240  ,1]
    ,'hotpink'             : [  255,105,180  ,1]
    ,'indianred'           : [  205,92,92    ,1]
    ,'indigo'              : [  75,0,130 ,    1]
    ,'ivory'               : [  255,255,240  ,1]
    ,'khaki'               : [  240,230,140  ,1]
    ,'lavender'            : [  230,230,250  ,1]
    ,'lavenderblush'       : [  255,240,245  ,1]
    ,'lawngreen'           : [  124,252,0    ,1]
    ,'lemonchiffon'        : [  255,250,205  ,1]
    ,'lightblue'           : [  173,216,230  ,1]
    ,'lightcoral'          : [  240,128,128  ,1]
    ,'lightcyan'           : [  224,255,255  ,1]
    ,'lightgoldenrodyellow': [  250,250,210  ,1]
    ,'lightgray'           : [  211,211,211  ,1]
    ,'lightgreen'          : [  144,238,144  ,1]
    ,'lightgrey'           : [  211,211,211  ,1]
    ,'lightpink'           : [  255,182,193  ,1]
    ,'lightsalmon'         : [  255,160,122  ,1]
    ,'lightseagreen'       : [  32,178,170   ,1]
    ,'lightskyblue'        : [  135,206,250  ,1]
    ,'lightslategray'      : [  119,136,153  ,1]
    ,'lightslategrey'      : [  119,136,153  ,1]
    ,'lightsteelblue'      : [  176,196,222  ,1]
    ,'lightyellow'         : [  255,255,224  ,1]
    ,'lime'                : [  0,255,0  ,    1]
    ,'limegreen'           : [  50,205,50    ,1]
    ,'linen'               : [  250,240,230  ,1]
    ,'magenta'             : [  255,0,255    ,1]
    ,'maroon'              : [  128,0,0  ,    1]
    ,'mediumaquamarine'    : [  102,205,170  ,1]
    ,'mediumblue'          : [  0,0,205  ,    1]
    ,'mediumorchid'        : [  186,85,211   ,1]
    ,'mediumpurple'        : [  147,112,219  ,1]
    ,'mediumseagreen'      : [  60,179,113   ,1]
    ,'mediumslateblue'     : [  123,104,238  ,1]
    ,'mediumspringgreen'   : [  0,250,154    ,1]
    ,'mediumturquoise'     : [  72,209,204   ,1]
    ,'mediumvioletred'     : [  199,21,133   ,1]
    ,'midnightblue'        : [  25,25,112    ,1]
    ,'mintcream'           : [  245,255,250  ,1]
    ,'mistyrose'           : [  255,228,225  ,1]
    ,'moccasin'            : [  255,228,181  ,1]
    ,'navajowhite'         : [  255,222,173  ,1]
    ,'navy'                : [  0,0,128  ,    1]
    ,'oldlace'             : [  253,245,230  ,1]
    ,'olive'               : [  128,128,0    ,1]
    ,'olivedrab'           : [  107,142,35   ,1]
    ,'orange'              : [  255,165,0    ,1]
    ,'orangered'           : [  255,69,0 ,    1]
    ,'orchid'              : [  218,112,214  ,1]
    ,'palegoldenrod'       : [  238,232,170  ,1]
    ,'palegreen'           : [  152,251,152  ,1]
    ,'paleturquoise'       : [  175,238,238  ,1]
    ,'palevioletred'       : [  219,112,147  ,1]
    ,'papayawhip'          : [  255,239,213  ,1]
    ,'peachpuff'           : [  255,218,185  ,1]
    ,'peru'                : [  205,133,63   ,1]
    ,'pink'                : [  255,192,203  ,1]
    ,'plum'                : [  221,160,221  ,1]
    ,'powderblue'          : [  176,224,230  ,1]
    ,'purple'              : [  128,0,128    ,1]
    ,'red'                 : [  255,0,0  ,    1]
    ,'rosybrown'           : [  188,143,143  ,1]
    ,'royalblue'           : [  65,105,225   ,1]
    ,'saddlebrown'         : [  139,69,19    ,1]
    ,'salmon'              : [  250,128,114  ,1]
    ,'sandybrown'          : [  244,164,96   ,1]
    ,'seagreen'            : [  46,139,87    ,1]
    ,'seashell'            : [  255,245,238  ,1]
    ,'sienna'              : [  160,82,45    ,1]
    ,'silver'              : [  192,192,192  ,1]
    ,'skyblue'             : [  135,206,235  ,1]
    ,'slateblue'           : [  106,90,205   ,1]
    ,'slategray'           : [  112,128,144  ,1]
    ,'slategrey'           : [  112,128,144  ,1]
    ,'snow'                : [  255,250,250  ,1]
    ,'springgreen'         : [  0,255,127    ,1]
    ,'steelblue'           : [  70,130,180   ,1]
    ,'tan'                 : [  210,180,140  ,1]
    ,'teal'                : [  0,128,128    ,1]
    ,'thistle'             : [  216,191,216  ,1]
    ,'tomato'              : [  255,99,71    ,1]
    ,'turquoise'           : [  64,224,208   ,1]
    ,'violet'              : [  238,130,238  ,1]
    ,'wheat'               : [  245,222,179  ,1]
    ,'white'               : [  255,255,255  ,1]
    ,'whitesmoke'          : [  245,245,245  ,1]
    ,'yellow'              : [  255,255,0    ,1]
    ,'yellowgreen'         : [  154,205,50   ,1]
};

// export it
return Gradient;
});
