/**
*   Rasterizer
*   rasterize, draw and fill lines, rectangles and curves
*
*   @version 0.9.5
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

var def = Object.defineProperty,
    stdMath = Math, INF = Infinity, sqrt2 = stdMath.sqrt(2),
    PI = stdMath.PI, TWO_PI = 2*PI, HALF_PI = PI/2,
    NUM_POINTS = 6, MIN_LEN = sqrt2, PIXEL_SIZE = 0.5,
    ImArray = 'undefined' !== typeof Uint8ClampedArray ? Uint8ClampedArray : ('undefined' !== typeof Uint8Array ? Uint8Array : Array);

function Rasterizer(width, height, set_rgba_at)
{
    var self = this;
    if (!(self instanceof Rasterizer)) return new Rasterizer(width, height, set_rgba_at);

    var get_stroke_at = Rasterizer.getRGBAFrom([0, 0, 0, 1]),
        get_fill_at = Rasterizer.getRGBAFrom([0, 0, 0, 1]),
        lineCap = 'butt', lineJoin = 'miter', miterLimit = 10.0,
        lineWidth = 1, lineDash = [], lineDashOffset = 0, alpha = 1.0,
        paths = [new Path(width, height, set_rgba_at, get_stroke_at, get_fill_at, lineWidth, lineDash, lineDashOffset, lineCap, lineJoin, miterLimit, alpha)];

    def(self, 'strokeStyle', {
        get: function() {
            return '';
        },
        set: function(c) {
           get_stroke_at = Rasterizer.getRGBAFrom(c);
           paths[paths.length-1].strokeStyle = get_stroke_at;
        }
    });
    def(self, 'fillStyle', {
        get: function() {
            return '';
        },
        set: function(c) {
           get_fill_at = Rasterizer.getRGBAFrom(c);
           paths[paths.length-1].fillStyle = get_fill_at;
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
                paths[paths.length-1].lineWidth = lineWidth = lw;
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
                paths[paths.length-1].lineCap = lineCap = lc;
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
                paths[paths.length-1].lineJoin = lineJoin = lj;
            }
            else
            {
                err('"'+lj+'" lineJoin is not supported!');
            }
        }
    });
    def(self, 'miterLimit', {
        get: function() {
            return miterLimit;
        },
        set: function(ml) {
            ml = +ml;
            if (0 < ml)
            {
                paths[paths.length-1].miterLimit = miterLimit = ml;
            }
        }
    });
    def(self, 'lineDashOffset', {
        get: function() {
            return lineDashOffset;
        },
        set: function(ldo) {
            ldo = +ldo;
            if (0 < ldo)
            {
                paths[paths.length-1].lineDashOffset = lineDashOffset = ldo;
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
            paths[paths.length-1].lineDash = lineDash = ld;
        }
    });
    self.setLineDash = function(ld) {
        self.lineDash = ld;
    };
    def(self, 'globalAlpha', {
        get: function() {
            return alpha;
        },
        set: function(a) {
            a = +a;
            if (0 <= a && a <= 1)
            {
                paths[paths.length-1].globalAlpha = alpha = a;
            }
        }
    });

    self.strokeRect = function(x, y, w, h) {
        paths[paths.length-1].strokeRect(x, y, w, h);
    };
    self.fillRect = function(x, y, w, h) {
        paths[paths.length-1].fillRect(x, y, w, h);
    };
    self.beginPath = function() {
        paths.push(new Path(width, height, set_rgba_at, get_stroke_at, get_fill_at, lineWidth, lineDash, lineDashOffset, lineCap, lineJoin, miterLimit, alpha));
    };
    self.closePath = function() {
        paths[paths.length-1].closePath();
    };
    self.moveTo = function(x, y) {
        paths[paths.length-1].moveTo(x, y);
    };
    self.lineTo = function(x, y) {
        paths[paths.length-1].lineTo(x, y);
    };
    self.rect = function(x, y, w, h) {
        paths[paths.length-1].rect(x, y, w, h);
    };
    self.arc = function(cx, cy, r, start, end, ccw) {
        paths[paths.length-1].arc(cx, cy, r, start, end, ccw);
    };
    self.ellipse = function(cx, cy, rx, ry, angle, start, end, fs) {
        paths[paths.length-1].ellipse(cx, cy, rx, ry, angle, start, end, fs);
    };
    self.quadraticCurveTo = function(x1, y1, x2, y2) {
        paths[paths.length-1].quadraticCurveTo(x1, y1, x2, y2);
    };
    self.bezierCurveTo = function(x1, y1, x2, y2, x3, y3) {
        paths[paths.length-1].bezierCurveTo(x1, y1, x2, y2, x3, y3);
    };
    self.stroke = function() {
        //paths.forEach(function(p) {p.stroke();});
        paths[paths.length-1].stroke();
    };
    self.fill = function(fillRule) {
        fillRule = String(fillRule || 'nonzero').toLowerCase();
        if (-1 === ['nonzero','evenodd'].indexOf(fillRule)) fillRule = 'nonzero';
        //paths.forEach(function(p) {p.fill(fillRule);});
        paths[paths.length-1].fill(fillRule);
    };
    self.isPointInStroke = function(x, y) {
        return paths[paths.length-1].isPointInStroke(x, y);
    };
    self.isPointInPath = function(x, y, fillRule) {
        fillRule = String(fillRule || 'nonzero').toLowerCase();
        if (-1 === ['nonzero','evenodd'].indexOf(fillRule)) fillRule = 'nonzero';
        return paths[paths.length-1].isPointInPath(x, y, fillRule);
    };
}
Rasterizer.VERSION = '0.9.5';
Rasterizer.prototype = {
    constructor: Rasterizer,
    strokeStyle: null,
    fillStyle: null,
    lineWidth: null,
    lineCap: null,
    lineJoin: null,
    miterLimit: null,
    lineDash: null,
    lineDashOffset: null,
    setLineDash: null,
    globalAlpha: null,
    strokeRect: null,
    fillRect: null,
    beginPath: null,
    closePath: null,
    moveTo: null,
    lineTo: null,
    rect: null,
    arc: null,
    ellipse: null,
    quadraticCurveTo: null,
    bezierCurveTo: null,
    stroke: null,
    fill: null,
    isPointInStroke: null,
    isPointInPath: null,
    createImageData: function(width, height) {
        return Rasterizer.createImageData(width, height);
    },
    strokeText: function() {
        err('Not Implemented!');
    },
    fillText: function() {
        err('Not Implemented!');
    },
    measureText: function() {
        err('Not Implemented!');
    }
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
        var c = [RGBA[0], RGBA[1], RGBA[2], 3 < RGBA.length ? RGBA[3] : 1.0];
        return function(x, y) {
            return c;
        };
    }
};
Rasterizer.setRGBATo = function(IMG) {
    if ('function' === typeof IMG)
    {
        return function(x, y, r, g, b, af) {
            if (0 < af) IMG(x, y, r, g, b, af);
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

function Path(width, height, set_rgba_at, get_stroke_at, get_fill_at, lineWidth, lineDash, lineDashOffset, lineCap, lineJoin, miterLimit, alpha)
{
    var self = this, d = [[0, 0]],
        canvas, mult = 1, set_pixel,
        canvas_reset, canvas_output,
        stroke_pixel, fill_pixel;

    lineWidth = lineWidth || 1;
    lineDash = lineDash || [];
    lineDashOffset = lineDashOffset || 0;
    lineCap = lineCap || 'butt';
    lineJoin = lineJoin || 'miter';
    miterLimit = miterLimit || 10.0;
    alpha = null == alpha ? 1.0 : alpha;

    canvas_reset = function canvas_reset() {
        // sparse array/hash
        canvas = {};
    };
    canvas_output = function canvas_output(set_pixel) {
        for (var idx in canvas)
        {
            var i = canvas[idx], xy = /*+idx*/idx.split(',');
            set_pixel(/*xy % width*/+xy[0], /*~~(xy / width)*/+xy[1], i);
        }
    };
    set_pixel = function set_pixel(x, y, i) {
        if (0 <= x && x < width && 0 <= y && y < height && 0 < i && 0 < alpha)
        {
            i *= mult*alpha;
            var idx = String(x)+','+String(y)/*String(x + y*width)*/, j = canvas[idx] || 0;
            if (i > j) canvas[idx] = i;
        }
    };
    stroke_pixel = function stroke_pixel(x, y, i) {
        var c = get_stroke_at(x, y), af = 3 < c.length ? c[3] : 1.0;
        if (0 < af) set_rgba_at(x, y, c[0], c[1], c[2], af*i);
    };
    fill_pixel = function fill_pixel(x, y, i) {
        var c = get_fill_at(x, y), af = 3 < c.length ? c[3] : 1.0;
        if (0 < af) set_rgba_at(x, y, c[0], c[1], c[2], af*i);
    };
    def(self, 'strokeStyle', {
        get: function() {
            return;
        },
        set: function(s) {
            get_stroke_at = s;
        }
    });
    def(self, 'fillStyle', {
        get: function() {
            return;
        },
        set: function(s) {
            get_fill_at = s;
        }
    });
    def(self, 'lineWidth', {
        get: function() {
            return lineWidth;
        },
        set: function(lw) {
            lineWidth = lw;
        }
    });
    def(self, 'lineCap', {
        get: function() {
            return lineCap;
        },
        set: function(lc) {
            lineCap = lc;
        }
    });
    def(self, 'lineJoin', {
        get: function() {
            return lineJoin;
        },
        set: function(lj) {
            lineJoin = lj;
        }
    });
    def(self, 'miterLimit', {
        get: function() {
            return miterLimit;
        },
        set: function(ml) {
            miterLimit = ml;
        }
    });
    def(self, 'globalAlpha', {
        get: function() {
            return alpha;
        },
        set: function(a) {
            alpha = a;
        }
    });
    def(self, 'lineDash', {
        get: function() {
            return lineDash;
        },
        set: function(ld) {
            lineDash = ld;
        }
    });
    def(self, 'lineDashOffset', {
        get: function() {
            return lineDashOffset;
        },
        set: function(ldo) {
            lineDashOffset = ldo;
        }
    });
    self.moveTo = function(x, y) {
        d.push([x, y]);
        return self;
    };
    self.lineTo = function(x, y) {
        d[d.length-1].push(x, y);
        return self;
    };
    self.rect = function(x, y, w, h) {
        if (0 < w && 0 < h)
        {
            var p = [
                x, y,
                x + w - 1, y,
                x + w - 1, y + h - 1,
                x, y + h - 1,
                x, y
            ];
            p.lineCap = 'butt';
            p.lineJoin = 'miter';
            if (2 >= d[d.length-1].length)
            {
                d[d.length-1] = p;
            }
            else
            {
                d.push(p);
            }
        }
        return self;
    };
    self.arc = function(cx, cy, r, start, end, ccw) {
        var p = arc_points(cx, cy, r, r, 0, start, end, ccw);
        p.lineCap = 'butt';
        p.lineJoin = 'bevel';
        if (2 >= d[d.length-1].length)
        {
            d[d.length-1] = p;
        }
        else
        {
            d.push(p);
        }
        return self;
    };
    self.ellipse = function(cx, cy, rx, ry, angle, start, end, fs) {
        var p = arc_points(cx, cy, rx, ry, angle, start, end, fs);
        p.lineCap = 'butt';
        p.lineJoin = 'bevel';
        if (2 >= d[d.length-1].length)
        {
            d[d.length-1] = p;
        }
        else
        {
            d.push(p);
        }
        return self;
    };
    self.quadraticCurveTo = function(x1, y1, x2, y2) {
        var y0 = d[d.length-1].pop(),
            x0 = d[d.length-1].pop(),
            p = bezier_points([x0, y0, x1, y1, x2, y2]);
        d[d.length-1].push.apply(d[d.length-1], p);
        return self;
    };
    self.bezierCurveTo = function(x1, y1, x2, y2, x3, y3) {
        var y0 = d[d.length-1].pop(),
            x0 = d[d.length-1].pop(),
            p = bezier_points([x0, y0, x1, y1, x2, y2, x3, y3]);
        d[d.length-1].push.apply(d[d.length-1], p);
        return self;
    };
    self.closePath = function() {
        if (2 < d[d.length-1].length)
        {
            var x0 = d[d.length-1][0],
                y0 = d[d.length-1][1],
                x1 = d[d.length-1][d[d.length-1].length-2],
                y1 = d[d.length-1][d[d.length-1].length-1]
            ;
            if (!(is_almost_equal(x0, x1, 1e-6) && is_almost_equal(y0, y1, 1e-6)))
            {
                d[d.length-1].push(x0, y0);
            }
            d.push([0, 0]);
        }
        return self;
    };
    self.stroke = function() {
        if (0 < lineWidth)
        {
            var m = mult, xmin = 0, ymin = 0, xmax = width - 1, ymax = height - 1;
            if (1 > lineWidth) mult = lineWidth;
            canvas_reset();
            for (var i=0,n=d.length,p; i<n; ++i)
            {
                p = d[i];
                if (p && (2 < p.length))
                {
                    stroke_polyline(set_pixel, p, lineWidth, lineDash, lineDashOffset, p.lineCap || lineCap, p.lineJoin || lineJoin, miterLimit, xmin, ymin, xmax, ymax);
                }
            }
            canvas_output(stroke_pixel);
            mult = m;
        }
        return self;
    };
    self.fill = function(fillRule) {
        var m = mult, lw = 0.65,
            xmin = 0, ymin = 0,
            xmax = width - 1, ymax = height - 1;
        canvas_reset();
        // stroke a thin path outline
        if (1 > lw) mult = lw;
        for (var i=0,n=d.length,p; i<n; ++i)
        {
            p = d[i];
            if (p && (2 < p.length))
            {
                stroke_polyline(set_pixel, p, lw, [], 0, 'butt', 'bevel', 0, xmin, ymin, xmax, ymax);
            }
        }
        mult = m;
        // fill path interior
        fill_path(set_pixel, fillRule, d, xmin, ymin, xmax, ymax);
        canvas_output(fill_pixel);
        return self;
    };
    self.isPointInStroke = function(x, y) {
        return point_in_stroke(x, y, d);
    };
    self.isPointInPath = function(x, y, fillRule) {
        return point_in_path(x, y, d, fillRule);
    };
    self.strokeRect = function(x, y, w, h) {
        if (1 <= w && 1 <= h && 0 < lineWidth)
        {
            var m = mult;
            if (1 > lineWidth) mult = lineWidth;
            canvas_reset();
            stroke_polyline(set_pixel, [
            x, y,
            x + w - 1, y,
            x + w - 1, y + h - 1,
            x, y + h - 1,
            x, y
            ], lineWidth, lineDash, lineDashOffset, 'butt', 'miter', miterLimit, 0, 0, width - 1, height - 1);
            canvas_output(stroke_pixel);
            mult = m;
        }
        return self;
    };
    self.fillRect = function(x, y, w, h) {
        if (1 <= w && 1 <= h)
        {
            canvas_reset();
            fill_rect(set_pixel, stdMath.round(x), stdMath.round(y), stdMath.round(x + w - 1), stdMath.round(y + h - 1), 0, 0, width - 1, height - 1);
            canvas_output(fill_pixel);
        }
        return self;
    };
    self.dispose = function() {
        d = null;
    };
}
Path.prototype = {
    constructor: Path,
    dispose: null,
    strokeStyle: null,
    fillStyle: null,
    lineWidth: null,
    lineCap: null,
    lineJoin: null,
    miterLimit: null,
    globalAlpha: null,
    lineDash: null,
    lineDashOffset: null,
    moveTo: null,
    lineTo: null,
    rect: null,
    arc: null,
    ellipse: null,
    quadraticCurveTo: null,
    bezierCurveTo: null,
    closePath: null,
    isPointInStroke: null,
    isPointInPath: null,
    stroke: null,
    fill: null,
    strokeRect: null,
    fillRect: null
};
Rasterizer.Path = Path;

// Homogeneous Transformation Matrix
/*function Matrix(m00, m01, m02, m10, m11, m12)
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
        if (other instanceof Matrix)
        {
            return new Matrix(
            self.m00*other.m00 + self.m01*other.m10,
            self.m00*other.m01 + self.m01*other.m11,
            self.m00*other.m02 + self.m01*other.m12 + self.m02,
            self.m10*other.m00 + self.m11*other.m10,
            self.m10*other.m01 + self.m11*other.m11,
            self.m10*other.m02 + self.m11*other.m12 + self.m12
            );
        }
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
Matrix.EYE = function() {
    return new Matrix(
    1, 0, 0,
    0, 1, 0
    );
};
Rasterizer.Matrix = Matrix;*/

function stroke_polyline(set_pixel, points, lw, ld, ldo, lc, lj, ml, xmin, ymin, xmax, ymax)
{
    var n = points.length, i,
        x1, y1, x2, y2, xp, yp,
        dx1, dy1, dx2, dy2, w1, w2, mlw;
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
        mlw = ml*lw/2;
        for (i=0; i<n; i+=2)
        {
            x1 = points[i];
            y1 = points[i+1];
            x2 = points[i+2];
            y2 = points[i+3];
            dx2 = stdMath.abs(x2 - x1);
            dy2 = stdMath.abs(y2 - y1);
            w2 = ww(lw, dx2, dy2);
            stroke_line(set_pixel, x1, y1, x2, y2, dx2, dy2, w2[0], w2[1], 0 === i ? lc : null, n === i+2 ? lc : null, xmin, ymin, xmax, ymax);
            if (1 < lw && 0 < i)
            {
                join_lines(set_pixel, xp, yp, x1, y1, x2, y2, dx1, dy1, w1[0], w1[1], dx2, dy2, w2[0], w2[1], lj, mlw, xmin, ymin, xmax, ymax);
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
    if (0 === wx && 0 === wy)
    {
        wu_line(set_pixel, x1, y1, x2, y2, dx, dy, xmin, ymin, xmax, ymax);
    }
    else
    {
        wu_thick_line(set_pixel, x1, y1, x2, y2, dx, dy, wx, wy, c1, c2, xmin, ymin, xmax, ymax);
    }
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
        var n = hypot(dx, dy), w2 = (w-1)/2;
        return [dy*w2/n, dx*w2/n];
    }
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
function intersect(x1, y1, x2, y2, x3, y3, x4, y4)
{
    var a = y2 - y1, b = x1 - x2, c = x2*y1 - x1*y2,
        k = y4 - y3, l = x3 - x4, m = x4*y3 - x3*y4,
        D = a*l - b*k;
    // zero, infinite or one point
    return is_strictly_equal(D, 0) ? false : {x:(b*m - c*l)/D, y:(c*k - a*m)/D};
}
function fill_rect(set_pixel, x1, y1, x2, y2, xmin, ymin, xmax, ymax)
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
    if (null != xmin)
    {
        // if rect is outside viewport return
        if (x2 < xmin || x1 > xmax || y2 < ymin || y1 > ymax) return;
        x1 = stdMath.max(x1, xmin);
        y1 = stdMath.max(y1, ymin);
        x2 = stdMath.min(x2, xmax);
        y2 = stdMath.min(y2, ymax);
    }
    if (y1 === y2)
    {
        for (x=x1; x<=x2; ++x) set_pixel(x, y1, 1);
    }
    else if (x1 === x2)
    {
        for (y=y1; y<=y2; ++y) set_pixel(x1, y, 1);
    }
    else
    {
        for (y=y1; y<=y2; ++y)
        {
            for (x=x1; x<=x2; ++x) set_pixel(x, y, 1);
        }
    }
}
function fill_triangle(set_pixel, ax, ay, bx, by, cx, cy, xmin, ymin, xmax, ymax)
{
    // fill the triangle defined by a, b, c points
    var x, xx, t,
        y, yb, yc,
        xac, xab, xbc,
        yac, yab, ybc,
        zab, zbc,
        clip = null != xmin, e = 0.5;
    if (clip)
    {
        // if triangle is outside viewport return
        if (stdMath.max(ax, bx, cx) < xmin || stdMath.min(ax, bx, cx) > xmax ||
        stdMath.max(ay, by, cy) < ymin || stdMath.min(ay, by, cy) > ymax)
            return;
    }
    if (by < ay) {t = ay; ay = by; by = t; t = ax; ax = bx; bx = t;}
    if (cy < ay) {t = ay; ay = cy; cy = t; t = ax; ax = cx; cx = t;}
    if (cy < by) {t = by; by = cy; cy = t; t = bx; bx = cx; cx = t;}
    yac = cy - ay;
    if (is_strictly_equal(yac, 0))
    {
        // line or single point
        y = stdMath.round(ay);
        x = stdMath.round(stdMath.min(ax, bx, cx));
        xx = stdMath.round(stdMath.max(ax, bx, cx));
        return fill_rect(set_pixel, x, y, xx, y, xmin, ymin, xmax, ymax);
    }
    yab = by - ay;
    ybc = cy - by;
    xac = cx - ax;
    xab = bx - ax;
    xbc = cx - bx;
    zab = is_strictly_equal(yab, 0);
    zbc = is_strictly_equal(ybc, 0);
    y = stdMath.round(ay + e);
    yb = by;
    yc = stdMath.round(cy - e);
    if (clip) {y = stdMath.max(ymin, y); yc = stdMath.min(ymax, yc);}
    for (; y<=yc; ++y)
    {
        if (y < yb)
        {
            if (zab)
            {
                x = ax;
                xx = bx;
            }
            else
            {
                x = xac*(y - ay)/yac + ax;
                xx = xab*(y - ay)/yab + ax;
            }
        }
        else
        {
            if (zbc)
            {
                x = bx;
                xx = cx;
            }
            else
            {
                x = xac*(y - ay)/yac + ax;
                xx = xbc*(y - by)/ybc + bx;
            }
        }
        if (stdMath.abs(xx - x) < 1)
        {
            if (!clip || (x >= xmin && x <= xmax)) set_pixel(stdMath.round(x), y, 1);
            continue;
        }
        if (xx < x)
        {
            t = x;
            x = xx;
            xx = t;
        }
        x = stdMath.round(x + e);
        xx = stdMath.round(xx - e);
        if (clip) {x = stdMath.max(xmin, x); xx = stdMath.min(xmax, xx);}
        for (; x<=xx; ++x) set_pixel(x, y, 1);
    }
}
function wu_line(set_pixel, xs, ys, xe, ye, dx, dy, xmin, ymin, xmax, ymax)
{
    var xm = stdMath.min(xs, xe), xM = stdMath.max(xs, xe),
        ym = stdMath.min(ys, ye), yM = stdMath.max(ys, ye);

    // if line is outside viewport return
    if (xM < xmin || xm > xmax || yM < ymin || ym > ymax) return;

    if (null == dx)
    {
        dx = stdMath.abs(xe - xs);
        dy = stdMath.abs(ye - ys);
    }

    // clip it to viewport if needed
    if (xm < xmin || xM > xmax || ym < ymin || yM > ymax)
    {
        var clipped = clip(xs, ys, xe, ye, xmin, ymin, xmax, ymax);
        if (!clipped) return;
        xs = clipped[0];
        ys = clipped[1];
        xe = clipped[2];
        ye = clipped[3];
    }

    if (is_strictly_equal(dx, 0) || is_strictly_equal(dy, 0))
    {
        return fill_rect(set_pixel, stdMath.round(xs), stdMath.round(ys), stdMath.round(xe), stdMath.round(ye));
    }

    // Wu's line algorithm
    // https://en.wikipedia.org/wiki/Xiaolin_Wu%27s_line_algorithm
    var x, y,
        x1, x2,
        y1, y2,
        xend, yend,
        gradient = 0,
        intersect = 0,
        fpart = 0,
        rfpart = 0,
        gap = 0,
        e = 0.5,
        steep = dy > dx;

    if (steep)
    {
        x = xs;
        xs = ys;
        ys = x;
        x = xe;
        xe = ye;
        ye = x;
        x = dx;
        dx = dy;
        dy = x;
    }
    if (xs > xe)
    {
        x = xs;
        xs = xe;
        xe = x;
        y = ys;
        ys = ye;
        ye = y;
    }

    gradient = (ys > ye ? -1 : 1)*dy/dx;

    // handle first endpoint
    xend = stdMath.round(xs);
    yend = ys + gradient * (xend - xs);
    gap = 1 - (xs + e - stdMath.floor(xs + e));
    x1 = xend;
    y1 = stdMath.floor(yend);
    fpart = yend - y1;
    rfpart = 1 - fpart;
    if (steep)
    {
        set_pixel(y1, x1, rfpart*gap);
        set_pixel(y1 + 1, x1, fpart*gap);
    }
    else
    {
        set_pixel(x1, y1, rfpart*gap);
        set_pixel(x1, y1 + 1, fpart*gap);
    }

    intersect = yend + gradient;

    // handle second endpoint
    xend = stdMath.round(xe);
    yend = ye + gradient * (xend - xe);
    gap = xe + e - stdMath.floor(xe + e);
    x2 = xend;
    y2 = stdMath.floor(yend);
    fpart = yend - y2;
    rfpart = 1 - fpart;
    if (steep)
    {
        set_pixel(y2, x2, rfpart*gap);
        set_pixel(y2 + 1, x2, fpart*gap);
    }
    else
    {
        set_pixel(x2, y2, rfpart*gap);
        set_pixel(x2, y2 + 1, fpart*gap);
    }

    // main loop
    if (steep)
    {
        for (x=x1+1; x<x2; ++x)
        {
            y = stdMath.floor(intersect);
            fpart = intersect - y;
            rfpart = 1 - fpart;
            if (0 < rfpart) set_pixel(y, x, rfpart);
            if (0 < fpart) set_pixel(y + 1, x, fpart);
            intersect += gradient;
        }
    }
    else
    {
        for (x=x1+1; x<x2; ++x)
        {
            y = stdMath.floor(intersect);
            fpart = intersect - y;
            rfpart = 1 - fpart;
            if (0 < rfpart) set_pixel(x, y, rfpart);
            if (0 < fpart) set_pixel(x, y + 1, fpart);
            intersect += gradient;
        }
    }
}
function wu_thick_line(set_pixel, xs, ys, xe, ye, dx, dy, wx, wy, cs, ce, xmin, ymin, xmax, ymax)
{
    var t, sx, sy,
        wsx, wsy,
        xa, xb, xc, xd,
        ya, yb, yc, yd;

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
        return fill_rect(set_pixel, stdMath.round(xs - wx), stdMath.round(ys), stdMath.round(xs + wx), stdMath.round(ye), xmin, ymin, xmax, ymax);
    }
    if (is_strictly_equal(dy, 0))
    {
        if ('square' === cs) xs -= sx*wy;
        if ('square' === ce) xe += sx*wy;
        return fill_rect(set_pixel, stdMath.round(xs), stdMath.round(ys - wy), stdMath.round(xe), stdMath.round(ys + wy), xmin, ymin, xmax, ymax);
    }

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

    wsx = sx*wx;
    wsy = sy*wy;

    xa = xs - wsx;
    ya = ys + wsy;
    xb = xs + wsx;
    yb = ys - wsy;
    xc = xe - wsx;
    yc = ye + wsy;
    xd = xe + wsx;
    yd = ye - wsy;

    // outline
    wu_line(set_pixel, xa, ya, xb, yb, null, null, xmin, ymin, xmax, ymax);
    wu_line(set_pixel, xb, yb, xd, yd, null, null, xmin, ymin, xmax, ymax);
    wu_line(set_pixel, xd, yd, xc, yc, null, null, xmin, ymin, xmax, ymax);
    wu_line(set_pixel, xc, yc, xa, ya, null, null, xmin, ymin, xmax, ymax);
    // fill
    fill_triangle(set_pixel, xa, ya, xb, yb, xc, yc, xmin, ymin, xmax, ymax);
    fill_triangle(set_pixel, xb, yb, xc, yc, xd, yd, xmin, ymin, xmax, ymax);
}
function join_lines(set_pixel, x1, y1, x2, y2, x3, y3, dx1, dy1, wx1, wy1, dx2, dy2, wx2, wy2, j, mlw, xmin, ymin, xmax, ymax)
{
    if (('bevel' !== j && 'miter' !== j) || is_almost_equal(dy1*dx2, dy2*dx1, 1e-4)) return;

    var sx1, sy1, sx2, sy2,
        wsx1, wsy1, wsx2, wsy2,
        a1, b1, c1, d1,
        a2, b2, c2, d2,
        p, q, t, s, mitl;

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
            if (is_strictly_equal(dy1, 0))
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
        wu_line(set_pixel, p.x, p.y, q.x, q.y, null, null, xmin, ymin, xmax, ymax);
        fill_triangle(set_pixel, s.x, s.y, p.x, p.y, q.x, q.y, xmin, ymin, xmax, ymax);
    }
    else if ('miter' === j)
    {
        if (sx1 === sx2)
        {
            if (sy1 === sy2)
            {
                if (is_strictly_equal(dy1, 0))
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
        mitl = hypot(t.x - s.x, t.y - s.y);
        if (mitl > mlw)
        {
            wu_line(set_pixel, p.x, p.y, q.x, q.y, null, null, xmin, ymin, xmax, ymax);
            fill_triangle(set_pixel, s.x, s.y, p.x, p.y, q.x, q.y, xmin, ymin, xmax, ymax);
        }
        else
        {
            wu_line(set_pixel, p.x, p.y, t.x, t.y, null, null, xmin, ymin, xmax, ymax);
            wu_line(set_pixel, q.x, q.y, t.x, t.y, null, null, xmin, ymin, xmax, ymax);
            fill_triangle(set_pixel, s.x, s.y, p.x, p.y, q.x, q.y, xmin, ymin, xmax, ymax);
            fill_triangle(set_pixel, t.x, t.y, p.x, p.y, q.x, q.y, xmin, ymin, xmax, ymax);
        }
    }
}
function arc_points(cx, cy, rx, ry, a, ts, te, fs)
{
    if (fs) te = - te - PI;
    var cos = stdMath.cos(a),
        sin = stdMath.sin(a),
        delta = te - ts,
        arc = function(t) {
            var p = ts + t*delta,
                x = rx*stdMath.cos(p),
                y = ry*stdMath.sin(p);
            return [
                cx + cos*x - sin*y,
                cy + sin*x + cos*y
            ];
        },
        points = sample_curve(arc);

    if (stdMath.abs(delta)+1e-4 >= TWO_PI && !is_almost_equal(points[0], points[points.length-2], 1e-4) && !is_almost_equal(points[1], points[points.length-1], 1e-4)) points.push(points[0], points[1]);
    return points;
}
function bezier_points(c)
{
    var quadratic = function(t) {
           var t0 = t, t1 = 1 - t, t11 = t1*t1, t10 = 2*t1*t0, t00 = t0*t0;
           return [
               t11*c[0] + t10*c[2] + t00*c[4],
               t11*c[1] + t10*c[3] + t00*c[5]
           ];
        },
        cubic = function(t) {
            var t0 = t, t1 = 1 - t,
                t0t0 = t0*t0, t1t1 = t1*t1,
                t111 = t1t1*t1, t000 = t0t0*t0,
                t110 = 3*t1t1*t0, t100 = 3*t0t0*t1;
           return [
               t111*c[0] + t110*c[2] + t100*c[4] + t000*c[6],
               t111*c[1] + t110*c[3] + t100*c[5] + t000*c[7]
           ];
        };
    return sample_curve(6 < c.length ? cubic : quadratic);
}
function fill_path(set_pixel, rule, path, xmin, ymin, xmax, ymax)
{
    var edges = path_to_segments(path),
        y = edges.ymin, yM = edges.ymax;
    if (!edges.length) return;
    edges.sort(asc);
    var n = edges.length,
        edg = new Array(n),
        i = 0, j, k, d, e, c,
        y1, y2, x, xm, xM, x1, x2, xi,
        insidel, insider,
        evenodd = 'evenodd' === rule;
    y = stdMath.max(ymin, stdMath.round(y));
    yM = stdMath.min(ymax, stdMath.round(yM));
    for (; y<=yM; ++y)
    {
        while (i < n && edges[i][3] < y) ++i;
        if (i >= n) break;
        e = d = edges[i];
        if (e[1] > y)
        {
            y = stdMath.floor(e[1]);
            continue;
        }
        x1 = e[0];
        x2 = e[2];
        y1 = e[1];
        y2 = e[3];
        if (is_strictly_equal(y1, y2))
        {
            xi = false;
            xm = stdMath.min(x1, x2);
            xM = stdMath.max(x1, x2);
        }
        else
        {
            xi = (x2 - x1)*(y - y1)/(y2 - y1) + x1;
            xm = xi;
            xM = xi;
        }
        // store intersection point to be used later
        e[6] = xi;
        e[7] = 0;
        edg[0] = e;
        k = 1;
        // get rest edges that intersect at this y
        for (j=i+1; j<n && edges[j][1]<=y; ++j)
        {
            e = edges[j];
            if (e[3] >= y)
            {
                x1 = e[0];
                x2 = e[2];
                y1 = e[1];
                y2 = e[3];
                if (is_strictly_equal(y1, y2))
                {
                    xi = false;
                    xm = stdMath.min(xm, x1, x2);
                    xM = stdMath.max(xM, x1, x2);
                }
                else
                {
                    xi = (x2 - x1)*(y - y1)/(y2 - y1) + x1;
                    xm = stdMath.min(xm, xi);
                    xM = stdMath.max(xM, xi);
                }
                // store intersection point to be used later
                e[6] = xi;
                e[7] = 0;
                edg[k++] = e;
            }
        }
        // some edges found are redundant, mark them
        c = redundant(edg, k);
        if (c+2 > k) continue; // at least two edges are needed
        xm = stdMath.max(xmin, stdMath.round(xm + 0.5));
        xM = stdMath.min(xmax, stdMath.round(xM - 0.5));
        if (xm > xM) continue; // no fill at this point
        if (evenodd)
        {
            // evenodd fill rule
            for (x=xm; x<=xM; ++x)
            {
                for (insidel=false,insider=false,j=0; j<k; ++j)
                {
                    e = edg[j];
                    if (e[7]) continue; // redundant
                    xi = e[6];
                    if (false === xi) continue; // no intersection
                    // intersects segment on the left side
                    if (xi < x) insidel = !insidel;
                    // intersects segment on the right side
                    if (xi > x) insider = !insider;
                }
                if (insidel && insider) set_pixel(x, y, 1);
            }
        }
        else
        {
            // nonzero fill rule
            for (x=xm; x<=xM; ++x)
            {
                for (insidel=0,insider=0,j=0; j<k; ++j)
                {
                    e = edg[j];
                    if (e[7]) continue; // redundant
                    xi = e[6];
                    if (false === xi) continue; // no intersection
                    if (xi < x || xi > x)
                    {
                        c = wn(x, y, e[0 > e[4] ? 2 : 0], e[0 > e[4] ? 3 : 1], e[0 > e[4] ? 0 : 2], e[0 > e[4] ? 1 : 3]);
                        // intersects segment on the left side
                        if (xi < x) insidel += c;
                        // intersects segment on the right side
                        if (xi > x) insider += c;
                    }
                }
                if (insidel && insider) set_pixel(x, y, 1);
            }
        }
    }
}
function point_in_stroke(x, y, path)
{
    var i, j, p, m, n = path.length,
        x1, y1, x2, y2;
    for (i=0; i<n; ++i)
    {
        p = path[i];
        m = p.length - 2;
        if (0 < m)
        {
            for (j=0; j<m; j+=2)
            {
                x1 = p[j];
                y1 = p[j+1];
                x2 = p[j+2];
                y2 = p[j+3];
                if (is_almost_equal((y2 - y1)*(x - x1), (y - y1)*(x2 - x1), 1e-4))
                {
                    return true;
                }
            }
        }
    }
    return false;
}
function point_in_path(x, y, path, rule)
{
    var edges = path_to_segments(path);
    if (!edges.length || y < edges.ymin || y > edges.ymax) return false;
    edges.sort(asc);
    var n = edges.length,
        edg = new Array(n),
        i = 0, j, k, d, e, c,
        y1, y2, xm, xM, x1, x2, xi,
        insidel, insider,
        evenodd = 'evenodd' === rule;
    while (i < n && edges[i][3] < y) ++i;
    if (i >= n) return false;
    e = d = edges[i];
    if (e[1] > y) return false;
    x1 = e[0];
    x2 = e[2];
    y1 = e[1];
    y2 = e[3];
    if (is_strictly_equal(y1, y2))
    {
        xi = false;
        xm = stdMath.min(x1, x2);
        xM = stdMath.max(x1, x2);
    }
    else
    {
        xi = (x2 - x1)*(y - y1)/(y2 - y1) + x1;
        xm = xi;
        xM = xi;
    }
    // store intersection point to be used later
    e[6] = xi;
    e[7] = 0;
    edg[0] = e;
    k = 1;
    // get rest edges that intersect at this y
    for (j=i+1; j<n && edges[j][1]<=y; ++j)
    {
        e = edges[j];
        if (e[3] >= y)
        {
            x1 = e[0];
            x2 = e[2];
            y1 = e[1];
            y2 = e[3];
            if (is_strictly_equal(y1, y2))
            {
                xi = false;
                xm = stdMath.min(xm, x1, x2);
                xM = stdMath.max(xM, x1, x2);
            }
            else
            {
                xi = (x2 - x1)*(y - y1)/(y2 - y1) + x1;
                xm = stdMath.min(xm, xi);
                xM = stdMath.max(xM, xi);
            }
            // store intersection point to be used later
            e[6] = xi;
            e[7] = 0;
            edg[k++] = e;
        }
    }
    // some edges found are redundant, mark them
    c = redundant(edg, k);
    if (c+2 > k) return false === edg[0][6] ? false : is_almost_equal(x, edg[0][6]);
    if (xm > xM || x < xm || x > xM) return false;
    if (evenodd)
    {
        // evenodd fill rule
        for (insidel=false,insider=false,j=0; j<k; ++j)
        {
            e = edg[j];
            if (e[7]) continue; // redundant
            xi = e[6];
            if (false === xi) continue; // no intersection
            // intersects segment on the left side
            if (xi <= x) insidel = !insidel;
            // intersects segment on the right side
            if (xi >= x) insider = !insider;
        }
        if (insidel && insider) return true;
    }
    else
    {
        // nonzero fill rule
        for (insidel=0,insider=0,j=0; j<k; ++j)
        {
            e = edg[j];
            if (e[7]) continue; // redundant
            xi = e[6];
            if (false === xi) continue; // no intersection
            if (xi < x || xi > x)
            {
                c = wn(x, y, e[0 > e[4] ? 2 : 0], e[0 > e[4] ? 3 : 1], e[0 > e[4] ? 0 : 2], e[0 > e[4] ? 1 : 3]);
                // intersects segment on the left side
                if (xi <= x) insidel += c;
                // intersects segment on the right side
                if (xi >= x) insider += c;
            }
        }
        if (insidel && insider) return true;
    }
    return false;
}

// utilities -----------------------
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
function wn(x, y, x1, y1, x2, y2)
{
    // orientation winding number
    return 0 > (x - x1)*(y2 - y1) - (x2 - x1)*(y - y1) ? -1 : 1;
}
function point_line_distance(p0, p1, p2)
{
    var x1 = p1[0], y1 = p1[1],
        x2 = p2[0], y2 = p2[1],
        x = p0[0], y = p0[1],
        dx = x2 - x1, dy = y2 - y1,
        d = hypot(dx, dy)
    ;
    if (is_strictly_equal(d, 0)) return hypot(x - x1, y - y1);
    return stdMath.abs(dx*(y1 - y) - dy*(x1 - x)) / d;
}
function path_to_segments(polylines)
{
    var segments = [],
        m = polylines.length,
        n, i, j, k, p,
        ymin = Infinity,
        ymax = -Infinity;
    for (k=0,j=0; j<m; ++j)
    {
        p = polylines[j];
        n = p.length - 2;
        if (0 < n)
        {
            for (i=0; i<n; i+=2)
            {
                ymin = stdMath.min(ymin, p[i+1]);
                ymax = stdMath.max(ymax, p[i+1]);
                if (p[i+1] > p[i+3])
                {
                    segments.push([p[i+2], p[i+3], p[i], p[i+1], -1, k, 0, 0]);
                }
                else
                {
                    segments.push([p[i], p[i+1], p[i+2], p[i+3], 1, k, 0, 0]);
                }
            }
            ymin = stdMath.min(ymin, p[n+1]);
            ymax = stdMath.max(ymax, p[n+1]);
            ++k;
        }
    }
    segments.ymin = ymin;
    segments.ymax = ymax;
    return segments;
}
function redundant(edg, n)
{
    var i, j, e, f, c = 0;
    for (i=0; i<n; ++i)
    {
        e = edg[i];
        if (e[7]) continue;
        for (j=i+1; j<n; ++j)
        {
            f = edg[j];
            if (f[7] || (e[4] !== f[4]) || (e[5] !== f[5])) continue;
            if (
                (/*(e[4] === f[4])
                &&*/ is_almost_equal(e[0], f[0], 1e-5)
                && is_almost_equal(e[1], f[1], 1e-5)
                && is_almost_equal(e[2], f[2], 1e-5)
                && is_almost_equal(e[3], f[3], 1e-5))
                || (is_almost_equal(e[3], f[1], 1e-6))
            )
            {
                f[7] = 1;
                ++c;
            }
        }
    }
    return c;
}
function sample_curve(f)
{
    var i, p, points = [], n = NUM_POINTS;
    p = f(0);
    points.push(p[0], p[1]);
    for (i=0; i<n; ++i)
    {
        p = subdivide_curve(points, f, 0 === i ? 0 : i/n, n === i+1 ? 1 : (i+1)/n, p, null);
    }
    return points;
}
function subdivide_curve(points, f, l, r, left, right)
{
    if ((l >= r) || is_almost_equal(l, r, 1e-6)) return left;
    left = left || f(l); right = right || f(r);
    var m, middle, d = hypot(right[0] - left[0], right[1] - left[1]);
    if (d <= MIN_LEN)
    {
        // segment should have at least 2 pixels length
        // return linear interpolation between left and right
        if (d < 1) return left;
        points.push(right[0], right[1]);
    }
    else
    {
        m = (l + r) / 2;
        middle = f(m);
        if (point_line_distance(middle, left, right) <= PIXEL_SIZE)
        {
            // no more refinement
            // return linear interpolation between left and right
            points.push(right[0], right[1]);
        }
        else
        {
            // recursively subdivide to refine samples with high enough curvature
            subdivide_curve(points, f, l, m, left, middle);
            subdivide_curve(points, f, m, r, middle, right);
        }
    }
    return right;
}
function is_almost_equal(a, b, eps)
{
    return stdMath.abs(a - b) < (eps || 1e-6);
}
function is_strictly_equal(a, b)
{
    return stdMath.abs(a - b) < Number.EPSILON;
}
function clamp(x, min, max)
{
    return stdMath.min(stdMath.max(x, min), max);
}
function asc(a, b)
{
    var d = a[1] - b[1];
    return is_almost_equal(d, 0) ? (a[3] - b[3]) : d;
}
function err(msg) {throw new Error(msg);}
function NOOP() {}

// export it
return Rasterizer;
});
