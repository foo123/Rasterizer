/**
*   Rasterizer
*   rasterize, stroke and fill lines, rectangles, curves and paths
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

var def = Object.defineProperty, PROTO = 'prototype',
    stdMath = Math, INF = Infinity, EPSILON = Number.EPSILON,
    sqrt2 = stdMath.sqrt(2), is_nan = isNaN, is_finite = isFinite,
    positive_number = function(x) {x = +x; return !is_nan(x) && is_finite(x) && (0 < x);},
    PI = stdMath.PI, TWO_PI = 2*PI, HALF_PI = PI/2,
    NUM_POINTS = 6, MIN_LEN = sqrt2, PIXEL_SIZE = 0.5,
    ImArray = 'undefined' !== typeof Uint8ClampedArray ? Uint8ClampedArray : ('undefined' !== typeof Uint8Array ? Uint8Array : Array),
    BLANK = [0, 0, 0, 0],
    COMMAND = /[MLHVCSQTAZ]/gi,
    NUMBER = /-?(?:(?:\d+\.\d+)|(?:\.\d+)|(?:\d+))/g
;

function Rasterizer(width, height, set_rgba_at, get_rgba_from)
{
    var self = this, ctx2D;
    if (!(self instanceof Rasterizer)) return new Rasterizer(width, height, set_rgba_at, get_rgba_from);

    get_rgba_from = get_rgba_from || (set_rgba_at && set_rgba_at.$target ? Rasterizer.getRGBAFrom(set_rgba_at.$target) : function(x, y) {return BLANK;});
    ctx2D = new RenderingContext2D(width, height, set_rgba_at, get_rgba_from);

    def(self, 'width', {
        get: function() {
            return width;
        },
        set: function(w) {
        }
    });
    def(self, 'height', {
        get: function() {
            return height;
        },
        set: function(h) {
        }
    });
    self.getContext = function(type) {
        if ('2d' === type) return ctx2D;
        err('Unsupported context "'+type+'"');
    };
}
Rasterizer.VERSION = '1.0.0';
Rasterizer[PROTO] = {
    constructor: Rasterizer,
    width: null,
    height: null,
    getContext: null
};
Rasterizer.getRGBAFrom = function(source) {
    if ('function' === typeof source)
    {
        return function(x, y) {
            var c = source(x, y);
            return [c[0], c[1], c[2], 3 < c.length ? c[3]/255 : 1.0];
        };
    }
    else if (source.data && null != source.width && null != source.height)
    {
        return function(x, y) {
            var w = source.width, h = source.height, data = source.data, index;
            if (0 <= x && x < w && 0 <= y && y < h)
            {
                index = (x + w*y) << 2;
                return [
                    data[index  ],
                    data[index+1],
                    data[index+2],
                    data[index+3]/255
                ];
            }
            return BLANK;
        };
    }
    else
    {
        var c = [source[0] || 0, source[1] || 0, source[2] || 0, 3 < source.length ? (source[3] || 0) : 1.0];
        return function(x, y) {
            return c;
        };
    }
};
Rasterizer.setRGBATo = function(target) {
    if ('function' === typeof target)
    {
        return target;
    }
    else
    {
        var setter = function(x, y, r, g, b, af, op) {
            var w = target.width, h = target.height, data = target.data;
            if (0 <= x && x < w && 0 <= y && y < h /*&& 0 < af*/)
            {
                var index = (x + w*y) << 2,
                    r0 = data[index  ] || 0,
                    g0 = data[index+1] || 0,
                    b0 = data[index+2] || 0,
                    a0 = (data[index+3] || 0)/255,
                    a1 = af, f = null,
                    ro = 0, go = 0,
                    bo = 0, ao = 0;
                op = op || 'source-over';
                if ('clear' !== op && 'copy' !== op)
                {
                    f = RenderingContext2D.CompositionMode[op];
                    if (!f)
                    {
                        op = 'source-over';
                        f = RenderingContext2D.CompositionMode[op];
                    }
                }
                switch(op)
                {
                    case 'clear':
                        f = null;
                    break;
                    case 'copy':
                        ro = r;
                        go = g;
                        bo = b;
                        ao = clamp(stdMath.round(255*a1), 0, 255);
                        f = null;
                    break;
                    case 'xor':
                    case 'destination-out':
                    case 'destination-in':
                    case 'destination-atop':
                    case 'destination-over':
                    case 'source-out':
                    case 'source-in':
                    case 'source-atop':
                    case 'source-over':
                        // alpha for these modes
                        ao = f(a0, a0, a1, a1);
                    break;
                    default:
                        // alpha for other modes
                        ao = a1 + a0 - a1*a0;
                    break;
                }
                if (f)
                {
                    if (0 < ao)
                    {
                        ro = clamp(stdMath.round(255*f(a0*r0/255, a0, a1*r/255, a1)/ao), 0, 255);
                        go = clamp(stdMath.round(255*f(a0*g0/255, a0, a1*g/255, a1)/ao), 0, 255);
                        bo = clamp(stdMath.round(255*f(a0*b0/255, a0, a1*b/255, a1)/ao), 0, 255);
                        ao = clamp(stdMath.round(255*ao), 0, 255);
                    }
                    else
                    {
                        ro = 0;
                        go = 0;
                        bo = 0;
                        ao = 0;
                    }
                }
                data[index  ] = ro;
                data[index+1] = go;
                data[index+2] = bo;
                data[index+3] = ao;
            }
        };
        setter.$target = target;
        return setter;
    }
};

function RenderingContext2D(width, height, set_rgba_at, get_rgba_from)
{
    // https://html.spec.whatwg.org/multipage/canvas.html#2dcontext
    var self = this, get_stroke_at, get_fill_at,
        canvas = null, clip_canvas = null,
        canvas_reset, canvas_output, stack,
        reset, fill, set_pixel,
        stroke_pixel, fill_pixel,
        get_data, set_data,
        lineCap, lineJoin, miterLimit,
        lineWidth, lineDash, lineDashOffset,
        transform, alpha, op, currentPath;

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
        canvas = null;
    };
    set_pixel = function set_pixel(x, y, i) {
        if (0 <= x && x < width && 0 <= y && y < height && 0 < i && 0 < alpha)
        {
            var idx = String(x)+','+String(y)/*String(x + y*width)*/,
                j = canvas[idx] || 0,
                m = clip_canvas ? (clip_canvas[idx] || 0) : 1;
            i *= alpha*m;
            if (i > j) canvas[idx] = i;
        }
    };
    stroke_pixel = function stroke_pixel(x, y, i) {
        var c = 'clear' === op ? BLANK : get_stroke_at(x, y), af = 3 < c.length ? c[3] : 1.0;
        set_rgba_at(x, y, c[0], c[1], c[2], af*i, op);
    };
    fill_pixel = function fill_pixel(x, y, i) {
        var c = 'clear' === op ? BLANK : get_fill_at(x, y), af = 3 < c.length ? c[3] : 1.0;
        set_rgba_at(x, y, c[0], c[1], c[2], af*i, op);
    };
    reset = function(init) {
        get_stroke_at = Rasterizer.getRGBAFrom([0, 0, 0, 1]);
        get_fill_at = Rasterizer.getRGBAFrom([0, 0, 0, 1]);
        canvas = null;
        clip_canvas = null;
        lineCap = 'butt';
        lineJoin = 'miter';
        miterLimit = 10.0;
        lineWidth = 1;
        lineDash = [];
        lineDashOffset = 0;
        transform = Matrix2D.EYE();
        alpha = 1.0;
        op = 'source-over';
        stack = [];
        currentPath = new Path2D(transform);
        if (!init) self.clearRect(0, 0, width, height);
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
            lw = +lw;
            if (positive_number(lw))
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
            if (-1 !== ['butt','square','round'].indexOf(lc))
            {
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
            if (-1 !== ['miter','bevel','round'].indexOf(lj))
            {
                lineJoin = lj;
            }
        }
    });
    def(self, 'miterLimit', {
        get: function() {
            return miterLimit;
        },
        set: function(ml) {
            ml = +ml;
            if (!is_nan(ml) && is_finite(ml) && (0 <= ml))
            {
                miterLimit = ml;
            }
        }
    });
    def(self, 'lineDashOffset', {
        get: function() {
            return lineDashOffset;
        },
        set: function(ldo) {
            ldo = +ldo;
            if (!is_nan(ldo) && is_finite(ldo))
            {
                lineDashOffset = ldo;
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
            if (ld.filter(positive_number).length === ld.length) lineDash = ld;
        }
    });
    self.getLineDash = function() {
        return self.lineDash;
    };
    self.setLineDash = function(ld) {
        self.lineDash = ld;
    };
    def(self, 'globalAlpha', {
        get: function() {
            return alpha;
        },
        set: function(a) {
            a = +a;
            if (!is_nan(a) && (0 <= a && a <= 1))
            {
                alpha = a;
            }
        }
    });
    def(self, 'globalCompositeOperation', {
        get: function() {
            return op;
        },
        set: function(o) {
            op = String(o);
        }
    });

    self.save = function() {
        if (!stack) stack = [];
        stack.push([
        get_stroke_at,
        get_fill_at,
        clip_canvas,
        lineCap,
        lineJoin,
        miterLimit,
        lineWidth,
        lineDash,
        lineDashOffset,
        transform,
        alpha,
        op
        ]);
    };
    self.restore = function() {
        if (!stack || !stack.length) return;
        var state = stack.pop();
        get_stroke_at = state[0];
        get_fill_at = state[1];
        clip_canvas = state[2];
        lineCap = state[3];
        lineJoin = state[4];
        miterLimit = state[5];
        lineWidth = state[6];
        lineDash = state[7];
        lineDashOffset = state[8];
        currentPath.transform = transform = state[9];
        alpha = state[10];
        op = state[11];
    };
    self.reset = function() {
        reset();
    };

    self.scale = function(sx, sy) {
        currentPath.transform = transform = transform.mul(Matrix2D.scale(sx, sy));
    };
    self.rotate = function(angle) {
        currentPath.transform = transform = transform.mul(Matrix2D.rotate(angle || 0));
    };
    self.translate = function(tx, ty) {
        currentPath.transform = transform = transform.mul(Matrix2D.translate(tx || 0, ty || 0));
    };
    self.transform = function(a, b, c, d, e, f) {
        currentPath.transform = transform = transform.mul(new Matrix2D(a, c, e, b, d, f));
    };
    self.getTransform = function() {
        return transform.clone();
    };
    self.setTransform = function(a, b, c, d, e, f) {
        if (1 < arguments.length)
        {
            transform = new Matrix2D(a, c, e, b, d, f);
        }
        else if (a && (null != a.a) && (null != a.f))
        {
            transform = new Matrix2D(a.a, a.c, a.e, a.b, a.d, a.f);
        }
        currentPath.transform = transform;
    };
    self.resetTransform = function() {
        currentPath.transform = transform = Matrix2D.EYE();
    };

    self.beginPath = function() {
        currentPath = new Path2D(transform);
    };
    self.closePath = function() {
        currentPath.closePath();
    };
    self.moveTo = function(x, y) {
        currentPath.moveTo(x, y);
    };
    self.lineTo = function(x, y) {
        currentPath.lineTo(x, y);
    };
    self.rect = function(x, y, w, h) {
        currentPath.rect(x, y, w, h);
    };
    self.roundRect = function(x, y, w, h) {
        currentPath.roundRect.apply(currentPath, arguments);
    };
    self.arc = function(cx, cy, r, start, end, ccw) {
        currentPath.arc(cx, cy, r, start, end, ccw);
    };
    self.ellipse = function(cx, cy, rx, ry, angle, start, end, ccw) {
        currentPath.ellipse(cx, cy, rx, ry, angle, start, end, ccw);
    };
    self.arcTo = function(x1, y1, x2, y2, r) {
        currentPath.arcTo(x1, y1, x2, y2, r);
    };
    self.quadraticCurveTo = function(x1, y1, x2, y2) {
        currentPath.quadraticCurveTo(x1, y1, x2, y2);
    };
    self.bezierCurveTo = function(x1, y1, x2, y2, x3, y3) {
        currentPath.bezierCurveTo(x1, y1, x2, y2, x3, y3);
    };
    self.clearRect = function(x, y, w, h) {
        var o = op, a = alpha;
        op = 'clear';
        alpha = 1.0;
        self.fill((new Path2D(transform)).rect(x, y, w, h), 'evenodd');
        op = o;
        alpha = a;
    };
    self.strokeRect = function(x, y, w, h) {
        if (0 < lineWidth) self.stroke((new Path2D(transform)).rect(x, y, w, h));
    };
    self.fillRect = function(x, y, w, h) {
        self.fill((new Path2D(transform)).rect(x, y, w, h), 'evenodd');
    };
    self.stroke = function(path) {
        if (0 < lineWidth)
        {
            path = path || currentPath;
            var t = path.transform,
                sx = stdMath.abs(t.sx),
                sy = stdMath.abs(t.sy);
            /*if (!t.isIdentity)
            {
                sx = hypot(t.m11, t.m21);
                sy = hypot(-t.m12, t.m22);
            }*/
            canvas_reset();
            stroke_path(set_pixel, path, lineWidth, lineDash, lineDashOffset, lineCap, lineJoin, miterLimit, sx, sy, 0, 0, width - 1, height - 1);
            canvas_output(stroke_pixel);
        }
    };
    fill = function(path, fillRule) {
        var lw = 0.5/*0.65*/,
            xmin = 0,
            ymin = 0,
            xmax = width - 1,
            ymax = height - 1;
        // stroke thin path outline
        stroke_path(set_pixel, path, lw, [], 0, 'butt', 'bevel', 0, 1, 1, xmin, ymin, xmax, ymax);
        // fill path interior
        fill_path(set_pixel, path, fillRule, xmin, ymin, xmax, ymax);
    };
    self.fill = function(path, fillRule) {
        if (!arguments.length || (null == path && null == fillRule))
        {
            path = currentPath;
            fillRule = 'nonzero';
        }
        else if (1 === arguments.length || null == fillRule)
        {
            if (path instanceof Path2D)
            {
                fillRule = 'nonzero';
            }
            else
            {
                fillRule = path;
                path = currentPath;
            }
        }
        fillRule = String(fillRule || 'nonzero').toLowerCase();
        if ('evenodd' !== fillRule) fillRule = 'nonzero';
        path = path || currentPath;
        canvas_reset();
        fill(path, fillRule);
        canvas_output(fill_pixel);
    };
    self.clip = function(path, fillRule) {
        if (!arguments.length || (null == path && null == fillRule))
        {
            path = currentPath;
            fillRule = 'nonzero';
        }
        else if (1 === arguments.length || null == fillRule)
        {
            if (path instanceof Path2D)
            {
                fillRule = 'nonzero';
            }
            else
            {
                fillRule = path;
                path = currentPath;
            }
        }
        fillRule = String(fillRule || 'nonzero').toLowerCase();
        if ('evenodd' !== fillRule) fillRule = 'nonzero';
        path = path || currentPath;
        if (path === currentPath) currentPath = new Path2D(transform);
        canvas_reset();
        fill(path, fillRule);
        clip_canvas = canvas;
        canvas = null;
    };
    self.isPointInStroke = function(path, x, y) {
        if (3 > arguments.length)
        {
            y = x;
            x = path;
            path = currentPath;
        }
        x = x || 0;
        y = y || 0;
        path = path || currentPath;
        //return point_in_stroke(x, y, path, lineWidth);
        // stroke and check if in stroke
        x = stdMath.round(x); y = stdMath.round(y);
        var pt = String(x)+','+String(y), point_in_stroke = false;
        stroke_path(function(px, py, i) {
            if ((x === px) && (y === py))
            {
                i *= clip_canvas ? (clip_canvas[pt] || 0) : 1;
                if (i > 0) point_in_stroke = true;
            }
        }, path, lineWidth, lineDash, lineDashOffset, lineCap, lineJoin, miterLimit, path.transform.sx, path.transform.sy, null, null, null, null);
        return point_in_stroke;
    };
    self.isPointInPath = function(path, x, y, fillRule) {
        if (!(path instanceof Path2D))
        {
            fillRule = y;
            y = x;
            x = path;
            path = currentPath;
        }
        fillRule = String(fillRule || 'nonzero').toLowerCase();
        if ('evenodd' !== fillRule) fillRule = 'nonzero';
        return point_in_path(x || 0, y || 0, path || currentPath, fillRule);
    };

    get_data = function(D, W, H, x0, y0, x1, y1) {
        x0 = stdMath.min(x0, W-1); y0 = stdMath.min(y0, H-1);
        x1 = stdMath.min(x1, W-1); y1 = stdMath.min(y1, H-1);
        if ((x1 < x0) || (y1 < y0)) return new ImArray(0);
        var c, x, y, i, I, w = x1-x0+1, h = y1-y0+1, size = (w*h) << 2, d = new ImArray(size);
        if (D)
        {
            for(x=x0,y=y0,i=0; y<=y1; i+=4,++x)
            {
                if (x>x1) {x=x0; ++y; if (y>y1) break;}
                I = (y*W + x) << 2;
                d[i  ] = D[I  ];
                d[i+1] = D[I+1];
                d[i+2] = D[I+2];
                d[i+3] = D[I+3];
            }
        }
        else
        {
            for(x=x0,y=y0,i=0; y<=y1; i+=4,++x)
            {
                if (x>x1) {x=x0; ++y; if (y>y1) break;}
                c = get_rgba_from(x, y);
                d[i  ] = clamp(c[0], 0, 255);
                d[i+1] = clamp(c[1], 0, 255);
                d[i+2] = clamp(c[2], 0, 255);
                d[i+3] = clamp(stdMath.round(c[3]*255), 0, 255);
            }
        }
        return d;
    };
    set_data = function(D, W, H, d, w, h, x0, y0, x1, y1, X0, Y0) {
        var i, I, x, y;
        //if (!D.length || !d.length || !w || !h || !W || !H) return;
        x0 = stdMath.min(x0, w-1); y0 = stdMath.min(y0, h-1);
        X0 = stdMath.min(X0, W-1); Y0 = stdMath.min(Y0, H-1);
        x1 = stdMath.min(x1, w-1); y1 = stdMath.min(y1, h-1);
        X0 -= x0; Y0 -= y0;
        for(x=x0,y=y0; y<=y1; ++x)
        {
            if (x>x1) {x=x0; ++y; if (y>y1) break;}
            if ((y+Y0 >= H) || (x+X0 >= W)) continue;
            i = (y*w + x) << 2;
            /*I = ((y+Y0)*W + x+X0) << 2;
            D[I  ] = d[i  ];
            D[I+1] = d[i+1];
            D[I+2] = d[i+2];
            D[I+3] = d[i+3];*/
            set_rgba_at(x+X0, y+Y0, d[i  ], d[i+1], d[i+2], d[i+3]/255, 'copy');
        }
    };
    self.drawImage = function(imgData, sx, sy, sw, sh, dx, dy, dw, dh) {
        if (!imgData || !imgData.data) err('Invalid image data in drawImage');
        var W = width, H = height, w = imgData.width, h = imgData.height,
            w4 = w << 2, data = imgData.data, argslen = arguments.length,
            T, P, get_fill_at_saved = get_fill_at, res
        ;
        if (!w || !h) err('Invalid image data in drawImage');
        sx = sx || 0;
        sy = sy || 0;
        if (4 > argslen)
        {
            sw = w;
            sh = h;
        }
        if (6 > argslen)
        {
            dx = sx;
            dy = sy;
            dw = sw;
            dh = sh;
        }
        // fill rect with image taking account of active transform
        T = transform.inv(); P = [0, 0];
        res = [0,0,0,0];
        get_fill_at = function(x, y) {
            T.transform(x, y, P);
            x = sx + (P[0]-dx)*sw/dw;
            y = sy + (P[1]-dy)*sh/dh;
            // nearest interpolation
            //x = stdMath.round(x);
            //y = stdMath.round(y);
            // bilinear interpolation
            var fx = stdMath.floor(x),
                fy = stdMath.floor(y),
                deltax = x-fx, deltay = y-fy;
            x = fx; y = fy;
            if (0 <= x && x < w && 0 <= y && y < h)
            {
                var index = (x + w*y) << 2, a, b, c, d;
                if (x+1 < w && y+1 < h)
                {
                    a = (1-deltax)*(1-deltay);
                    b = deltax*(1-deltay);
                    c = deltay*(1-deltax);
                    d = deltax*deltay;
                    res[0] = clamp(stdMath.round(data[index  ]*a + data[index+4]*b + data[index+w4  ]*c + data[index+4+w4]*d), 0, 255);
                    res[1] = clamp(stdMath.round(data[index+1]*a + data[index+5]*b + data[index+w4+1]*c + data[index+5+w4]*d), 0, 255);
                    res[2] = clamp(stdMath.round(data[index+2]*a + data[index+6]*b + data[index+w4+2]*c + data[index+6+w4]*d), 0, 255);
                    res[3] = clamp(stdMath.round(data[index+3]*a + data[index+7]*b + data[index+w4+3]*c + data[index+7+w4]*d), 0, 255)/255;
                }
                else if (x+1 < w)
                {
                    a = (1-deltax);
                    b = deltax;
                    res[0] = clamp(stdMath.round(data[index  ]*a + data[index+4]*b), 0, 255);
                    res[1] = clamp(stdMath.round(data[index+1]*a + data[index+5]*b), 0, 255);
                    res[2] = clamp(stdMath.round(data[index+2]*a + data[index+6]*b), 0, 255);
                    res[3] = clamp(stdMath.round(data[index+3]*a + data[index+7]*b), 0, 255)/255;
                }
                else if (y+1 < h)
                {
                    a = (1-deltay);
                    c = deltay;
                    res[0] = clamp(stdMath.round(data[index  ]*a + data[index+w4  ]*c), 0, 255);
                    res[1] = clamp(stdMath.round(data[index+1]*a + data[index+w4+1]*c), 0, 255);
                    res[2] = clamp(stdMath.round(data[index+2]*a + data[index+w4+2]*c), 0, 255);
                    res[3] = clamp(stdMath.round(data[index+3]*a + data[index+w4+3]*c), 0, 255)/255;
                }
                else
                {
                    res[0] = data[index  ];
                    res[1] = data[index+1];
                    res[2] = data[index+2];
                    res[3] = data[index+3]/255;
                }
                return res;
            }
            return BLANK;
        };
        self.fillRect(dx, dy, dw, dh);
        // restore
        get_fill_at = get_fill_at_saved;
        /*
        // NOTE: current transform is not taken account of
        var W = width, H = height,
            w = imgData.width, h = imgData.height,
            idata = imgData.data,
            resize = RenderingContext2D.Interpolation.bilinear,
            argslen = arguments.length
        ;
        if (!w || !h) err('Invalid image data in drawImage');
        sx = sx || 0;
        sy = sy || 0;
        if (3 === argslen)
        {
            dx = sx; dy = sy;
            set_data(null, W, H, idata, w, h, 0, 0, w-1, h-1, dx, dy);
        }
        else if (5 === argslen)
        {
            dx = sx; dy = sy;
            dw = sw; dh = sh;
            if ((w === dw) && (h === dh))
                set_data(null, W, H, idata, dw, dh, 0, 0, dw-1, dh-1, dx, dy);
            else
                set_data(null, W, H, resize(idata, w, h, dw, dh), dw, dh, 0, 0, dw-1, dh-1, dx, dy);
        }
        else
        {
            if ((sw === dw) && (sh === dh))
                set_data(null, W, H, get_data(idata, w, h, sx, sy, sx+sw-1, sy+sh-1), dw, dh, 0, 0, dw-1, dh-1, dx, dy);
            else
                set_data(null, W, H, resize(get_data(idata, w, h, sx, sy, sx+sw-1, sy+sh-1), sw, sh, dw, dh), dw, dh, 0, 0, dw-1, dh-1, dx, dy);
        }
        */
    };
    self.getImageData = function(x, y, w, h) {
        var W = width, H = height, x1, y1, x2, y2;
        if (null == x) x = 0;
        if (null == y) y = 0;
        if (null == w) w = W;
        if (null == h) h = H;
        x1 = stdMath.max(0, stdMath.min(x, W-1));
        y1 = stdMath.max(0, stdMath.min(y, H-1));
        x2 = stdMath.min(x1+w-1, W-1);
        y2 = stdMath.min(y1+h-1, H-1);
        return {data: get_data(null, W, H, x1, y1, x2, y2), width: x2-x1+1, height: y2-y1+1/*, colorSpace: undefined*/};
    };
    self.putImageData = function(imgData, x, y) {
        if (!imgData || !imgData.data) err('Invalid image data in putImageData');
        var W = width, H = height, w = imgData.width, h = imgData.height;
        if (null == x) x = 0;
        if (null == y) y = 0;
        set_data(null, W, H, imgData.data, w, h, 0, 0, w-1, h-1, x, y);
    };

    reset(true);
}
RenderingContext2D[PROTO] = {
    constructor: RenderingContext2D,
    strokeStyle: null,
    fillStyle: null,
    lineWidth: null,
    lineCap: null,
    lineJoin: null,
    miterLimit: null,
    lineDash: null,
    lineDashOffset: null,
    getLineDash: null,
    setLineDash: null,
    globalAlpha: null,
    globalCompositeOperation: null,
    save: null,
    restore: null,
    reset: null,
    scale: null,
    rotate: null,
    translate: null,
    transform: null,
    getTransform: null,
    setTransform: null,
    resetTransform: null,
    beginPath: null,
    closePath: null,
    moveTo: null,
    lineTo: null,
    rect: null,
    arc: null,
    ellipse: null,
    arcTo: null,
    quadraticCurveTo: null,
    bezierCurveTo: null,
    clearRect: null,
    strokeRect: null,
    fillRect: null,
    stroke: null,
    fill: null,
    clip: null,
    isPointInStroke: null,
    isPointInPath: null,
    createImageData: function(width, height) {
        if (null == height && null != width.width && null != width.height)
        {
            height = width.height;
            width = width.width;
        }
        return {
            data: new ImArray((width*height) << 2),
            width: width,
            height: height/*,
            colorSpace: undefined*/
        };
    },
    getImageData: null,
    putImageData: null,
    drawImage: null,
    // handled through Gradient.js for example
    createLinearGradient: NOOP,
    createRadialGradient: NOOP,
    createConicGradient: NOOP,
    createPattern: NOOP,
    // NOT implemented
    strokeText: NOOP,
    fillText: NOOP,
    measureText: NOOP
};
Rasterizer.RenderingContext2D = RenderingContext2D;

RenderingContext2D.CompositionMode = {
//https://graphics.pixar.com/library/Compositing/paper.pdf
'xor': function(Dca, Da, Sca, Sa){return Sca * (1 - Da) + Dca * (1 - Sa);},
'destination-out': function(Dca, Da, Sca, Sa){return Dca * (1 - Sa);},
'destination-in': function(Dca, Da, Sca, Sa){return Dca * Sa;},
'destination-atop': function(Dca, Da, Sca, Sa){return Sca * (1 - Da) + Dca * Sa;},
'destination-over': function(Dca, Da, Sca, Sa){return Sca * (1 - Da) + Dca;},
'source-out': function(Dca, Da, Sca, Sa){return Sca * (1 - Da);},
'source-in': function(Dca, Da, Sca, Sa){return Sca * Da;},
'source-atop': function(Dca, Da, Sca, Sa){return Sca * Da + Dca * (1 - Sa);},
'source-over': function(Dca, Da, Sca, Sa){return Sca + Dca * (1 - Sa);},
//https://dev.w3.org/SVG/modules/compositing/master/
'multiply': function(Dca, Da, Sca, Sa){return Sca*Dca + Sca*(1 - Da) + Dca*(1 - Sa);},
'screen': function(Dca, Da, Sca, Sa){return Sca + Dca - Sca * Dca;},
'overlay': function(Dca, Da, Sca, Sa){return 2*Dca <= Da ? (2*Sca * Dca + Sca * (1 - Da) + Dca * (1 - Sa)) : (Sca * (1 + Da) + Dca * (1 + Sa) - 2 * Dca * Sca - Da * Sa);},
'darken': function(Dca, Da, Sca, Sa){return stdMath.min(Sca * Da, Dca * Sa) + Sca * (1 - Da) + Dca * (1 - Sa);},
'lighten': function(Dca, Da, Sca, Sa){return stdMath.max(Sca * Da, Dca * Sa) + Sca * (1 - Da) + Dca * (1 - Sa);},
'color-dodge': function(Dca, Da, Sca, Sa){return Sca === Sa && 0 === Dca ? (Sca * (1 - Da)) : (Sca === Sa ? (Sa * Da + Sca * (1 - Da) + Dca * (1 - Sa)) : (Sa * Da * stdMath.min(1, Dca/Da * Sa/(Sa - Sca)) + Sca * (1 - Da) + Dca * (1 - Sa)));},
'color-burn': function(Dca, Da, Sca, Sa){var m = Da ? Dca/Da : 0; return 0 === Sca && Dca === Da ? (Sa * Da + Dca * (1 - Sa)) : (0 === Sca ? (Dca * (1 - Sa)) : (Sa * Da * (1 - stdMath.min(1, (1 - m) * Sa/Sca)) + Sca * (1 - Da) + Dca * (1 - Sa)));},
'hard-light': function(Dca, Da, Sca, Sa){return 2 * Sca <= Sa ? (2 * Sca * Dca + Sca * (1 - Da) + Dca * (1 - Sa)) : (Sca * (1 + Da) + Dca * (1 + Sa) - Sa * Da - 2 * Sca * Dca);},
'soft-light': function(Dca, Da, Sca, Sa){var m = Da ? Dca/Da : 0; return 2 * Sca <= Sa ? (Dca * (Sa + (2 * Sca - Sa) * (1 - m)) + Sca * (1 - Da) + Dca * (1 - Sa)) : (2 * Sca > Sa && 4 * Dca <= Da ? (Da * (2 * Sca - Sa) * (16 * stdMath.pow(m, 3) - 12 * stdMath.pow(m, 2) - 3 * m) + Sca - Sca * Da + Dca) : (Da * (2 * Sca - Sa) * (stdMath.pow(m, 0.5) - m) + Sca - Sca * Da + Dca));},
'difference': function(Dca, Da, Sca, Sa){return Sca + Dca - 2 * stdMath.min(Sca * Da, Dca * Sa);},
'exclusion': function(Dca, Da, Sca, Sa){return (Sca * Da + Dca * Sa - 2 * Sca * Dca) + Sca * (1 - Da) + Dca * (1 - Sa);}
};
RenderingContext2D.CompositionMode['hardlight'] = RenderingContext2D.CompositionMode['hard-light'];
RenderingContext2D.CompositionMode['softlight'] = RenderingContext2D.CompositionMode['soft-light'];

RenderingContext2D.Interpolation = {
/*'bilinear': function(im, w, h, nw, nh) {
    // http://pixinsight.com/doc/docs/InterpolationAlgorithms/InterpolationAlgorithms.html
    // http://tech-algorithm.com/articles/bilinear-image-scaling/
    var size = (nw*nh) << 2,
        interpolated = new ImArray(size),
        rx = (w-1)/nw, ry = (h-1)/nh,
        A, B, C, D, a, b, c, d,
        i, j, x, y, xi, yi, pixel, index,
        yw, dx, dy, w4 = w << 2
    ;
    i=0; j=0; x=0; y=0; yi=0; yw=0; dy=0;
    for (index=0; index<size; index+=4,++j,x+=rx)
    {
        if (j >= nw) {j=0; x=0; ++i; y+=ry; yi=y|0; dy=y - yi; yw=yi*w;}

        xi = x|0; dx = x - xi;

        // Y = A(1-w)(1-h) + B(w)(1-h) + C(h)(1-w) + Dwh
        a = (1-dx)*(1-dy); b = dx*(1-dy);
        c = dy*(1-dx); d = dx*dy;

        pixel = (yw + xi)<<2;

        A = im[pixel]; B = im[pixel+4];
        C = im[pixel+w4]; D = im[pixel+w4+4];
        interpolated[index] = clamp(stdMath.round(A*a +  B*b + C*c  +  D*d), 0, 255);

        A = im[pixel+1]; B = im[pixel+5];
        C = im[pixel+w4+1]; D = im[pixel+w4+5];
        interpolated[index+1] = clamp(stdMath.round(A*a +  B*b + C*c  +  D*d), 0, 255);

        A = im[pixel+2]; B = im[pixel+6];
        C = im[pixel+w4+2]; D = im[pixel+w4+6];
        interpolated[index+2] = clamp(stdMath.round(A*a +  B*b + C*c  +  D*d), 0, 255);

        A = im[pixel+3]; B = im[pixel+7];
        C = im[pixel+w4+3]; D = im[pixel+w4+7];
        interpolated[index+3] = clamp(stdMath.round(A*a +  B*b + C*c  +  D*d), 0, 255);
    }
    return interpolated;
}*/
};
function Path2D(path, transform)
{
    var self = this, need_new_subpath = true, d = [], sd = null, add_path;

    def(self, 'transform', {
        get: function() {
            return transform.clone();
        },
        set: function(t) {
            transform = t;
        }
    });
    def(self, '_d', {
        get: function() {
            return d;
        },
        set: function(_d) {
        }
    });
    def(self, '_sd', {
        get: function() {
            if (!sd) sd = path_to_segments(d);
            return sd;
        },
        set: function(_sd) {
        }
    });
    self.moveTo = function(x, y) {
        var xy = handle([x, y], transform);
        if (!xy) return self;
        d.push(xy);
        need_new_subpath = false;
        return self;
    };
    self.closePath = function() {
        if (d.length && 2 < d[d.length-1].length)
        {
            var x0 = +d[d.length-1][0],
                y0 = d[d.length-1][1],
                x2 = +d[d.length-1][2],
                y2 = d[d.length-1][3],
                x1 = +d[d.length-1][d[d.length-1].length-2],
                y1 = d[d.length-1][d[d.length-1].length-1]
            ;
            if (!(is_almost_equal(x0, x1, 1e-6) && is_almost_equal(y0, y1, 1e-6)))
            {
                d[d.length-1].push(new Marker(x0, {join:[x2, y2]}), y0);
            }
            else
            {
                d[d.length-1][d[d.length-1].length-2] = new Marker(x1, {join:[x2, y2]});
            }
            d.push([x0, y0]);
            need_new_subpath = false;
            sd = null;
        }
        return self;
    };
    self.lineTo = function(x, y) {
        var xy = handle([x, y], transform);
        if (!xy) return self;
        if (need_new_subpath)
        {
            d.push(xy);
            need_new_subpath = false;
        }
        else
        {
            d[d.length-1].push(xy[0], xy[1]);
            sd = null;
        }
        return self;
    };
    self.rect = function(x, y, w, h) {
        var p = handle([
            x, y,
            x + w, y,
            x + w, y + h,
            x, y + h
        ], transform);
        if (!p) return self;
        p[0] = new Marker(+p[0], {lineCap:'butt', lineJoin:'miter'});
        if (d.length && 2 >= d[d.length-1].length)
        {
            d[d.length-1] = p;
        }
        else
        {
            d.push(p);
        }
        sd = null;
        return self.closePath();
    };
    self.roundRect = function(x, y, w, h/*,..*/) {
        var p = handle([
            x, y, w, h
        ]);
        if (!p) return self;
        var radii = (arguments[4] && arguments[4].push ? arguments[4] : [].slice.call(arguments, 4)).filter(function(r) {return 0 < r;});
        if (1 > radii.length || 4 < radii.length) err('Invalid radii in roundRect');
        var upperLeft, upperRight, lowerRight, lowerLeft, t;
        if (4 === radii.length)
        {
            upperLeft = radii[0];
            upperRight = radii[1];
            lowerRight = radii[2];
            lowerLeft = radii[3];
        }
        else if (3 === radii.length)
        {
            upperLeft = radii[0];
            upperRight = radii[1];
            lowerLeft = radii[1];
            lowerRight = radii[2];
        }
        else if (2 === radii.length)
        {
            upperLeft = radii[0];
            lowerRight = radii[0];
            upperRight = radii[1];
            lowerLeft = radii[1];
        }
        else
        {
            upperLeft = radii[0];
            upperRight = radii[0];
            lowerRight = radii[0];
            lowerLeft = radii[0];
        }
        if (0 > w)
        {
            x += w;
            w = -w;
            t = upperLeft;
            upperLeft = upperRight;
            upperRight = t;
            t = lowerLeft;
            lowerLeft = lowerRight;
            lowerRight = t;
        }
        if (0 > h)
        {
            y += h;
            h = -h;
            t = upperLeft;
            upperLeft = lowerLeft;
            lowerLeft = t;
            t = upperRight;
            upperRight = lowerRight;
            lowerRight = t;
        }
        var top = upperLeft + upperRight,
            right = upperRight + lowerRight,
            bottom = lowerRight + lowerLeft,
            left = upperLeft + lowerLeft,
            scale = stdMath.min(w/top, h/right, w/bottom, h/left);
        if (scale < 1)
        {
            upperLeft *= scale;
            upperRight *= scale;
            lowerLeft *= scale;
            lowerRight *= scale;
        }
        p = [];
        add_point(p, x + upperLeft, y, transform);
        add_point(p, x + w - upperRight, y, transform);
        add_arcto(p, x + w - upperRight, y, x + w, y, x + w, y + upperRight, upperRight, transform);
        add_point(p, x + w, y + h - lowerRight, transform);
        add_arcto(p, x + w, y + h - lowerRight, x + w, y + h, x + w - lowerRight, y + h, lowerRight, transform);
        add_point(p, x + lowerLeft, y + h, transform);
        add_arcto(p, x + lowerLeft, y + h, x, y + h, x, y + h - lowerLeft, lowerLeft, transform);
        add_point(p, x, y + upperLeft, transform);
        add_arcto(p, x, y + upperLeft, x, y, x + upperLeft, y, upperLeft, transform);
        p[0] = new Marker(+p[0], {lineCap:'butt', lineJoin:'bevel'});
        d.push(p);
        sd = null;
        return self.closePath();
    };
    self.arc = function(cx, cy, r, start, end, ccw) {
        var p = handle([
            cx, cy, r,
            start, end
        ]);
        if (!p) return self;
        if (0 > r) err('Negative radius in arc');
        p = arc_points(cx, cy, r, r, 0, start, end, ccw, transform);
        p[0] = new Marker(+p[0], {type:'arc', lineCap:true, lineJoin:'bevel'});
        p[p.length-2] = new Marker(+p[p.length-2], {type:'arc', lineCap:true, lineJoin:true});
        if (need_new_subpath)
        {
            d.push(p);
            need_new_subpath = false;
        }
        else
        {
            d[d.length-1].push.apply(d[d.length-1], p);
        }
        sd = null;
        return self;
    };
    self.ellipse = function(cx, cy, rx, ry, angle, start, end, ccw) {
        var p = handle([
            cx, cy, rx, ry,
            angle, start, end
        ]);
        if (!p) return self;
        if (0 > rx || 0 > ry) err('Negative radius in ellipse');
        p = arc_points(cx, cy, rx, ry, angle, start, end, ccw, transform);
        p[0] = new Marker(+p[0], {type:'arc', lineCap:true, lineJoin:'bevel'});
        p[p.length-2] = new Marker(+p[p.length-2], {type:'arc', lineCap:true, lineJoin:true});
        if (need_new_subpath)
        {
            d.push(p);
            need_new_subpath = false;
        }
        else
        {
            d[d.length-1].push.apply(d[d.length-1], p);
        }
        sd = null;
        return self;
    };
    self.arcTo = function(x1, y1, x2, y2, r) {
        var p = handle([
            x1, y1,
            x2, y2,
            r
        ]), p0;
        if (!p) return self;
        if (0 > r) err('Negative radius in arcTo');
        if (need_new_subpath)
        {
            d.push(transform.transform(p[0], p[1]));
            need_new_subpath = false;
        }
        p0 = transform.inv().transform(+d[d.length-1][d[d.length-1].length-2], d[d.length-1][d[d.length-1].length-1]);
        p = arc2_points(p0[0], p0[1], p[0], p[1], p[2], p[3], r, transform);
        p[0] = new Marker(+p[0], {type:'arc', lineCap:true, lineJoin:'bevel'});
        p[p.length-2] = new Marker(+p[p.length-2], {type:'arc', lineCap:true, lineJoin:true});
        d[d.length-1].push.apply(d[d.length-1], p);
        sd = null;
        return self;
    };
    self.quadraticCurveTo = function(x1, y1, x2, y2) {
        var p = handle([
            x1, y1,
            x2, y2
        ], transform);
        if (!p) return self;
        if (need_new_subpath)
        {
            d.push([p[0], p[1]]);
            need_new_subpath = false;
        }
        var y0 = d[d.length-1].pop(),
            x0 = +d[d.length-1].pop();
        p = bezier_points([x0, y0, p[0], p[1], p[2], p[3]], transform);
        p[0] = new Marker(+p[0], {type:'bezier', lineCap:true, lineJoin:'bevel'});
        p[p.length-2] = new Marker(+p[p.length-2], {type:'bezier', lineCap:true, lineJoin:true});
        d[d.length-1].push.apply(d[d.length-1], p);
        sd = null;
        return self;
    };
    self.bezierCurveTo = function(x1, y1, x2, y2, x3, y3) {
        var p = handle([
            x1, y1,
            x2, y2,
            x3, y3
        ], transform);
        if (!p) return self;
        if (need_new_subpath)
        {
            d.push([p[0], p[1]]);
            need_new_subpath = false;
        }
        var y0 = d[d.length-1].pop(),
            x0 = +d[d.length-1].pop();
        p = bezier_points([x0, y0, p[0], p[1], p[2], p[3], p[4], p[5]], transform);
        p[0] = new Marker(+p[0], {type:'bezier', lineCap:true, lineJoin:'bevel'});
        p[p.length-2] = new Marker(+p[p.length-2], {type:'bezier', lineCap:true, lineJoin:true});
        d[d.length-1].push.apply(d[d.length-1], p);
        sd = null;
        return self;
    };

    self.addPath = function(path/*, transform*/) {
        if (path instanceof Path2D)
        {
            add_path(path);
            sd = null;
        }
        return self;
    };
    self.dispose = function() {
        d = null;
        sd = null;
    };

    add_path = function(path/*, transform*/) {
        var last;
        path._d.reduce(function(d, p) {
            if (p && p.length && (2 < p.length))
            {
                last = [+p[p.length-2], p[p.length-1]];
                d.push(p.slice());
            }
            return d;
        }, d);
        if (last)
        {
            d.push(last);
            need_new_subpath = false;
        }
        else
        {
            need_new_subpath = true;
        }
    };

    if (1 === arguments.length)
    {
        if (path instanceof Matrix2D)
        {
            transform = path;
            path = null;
        }
        else
        {
            transform = null;
        }
    }
    if (!(transform instanceof Matrix2D)) transform = null;
    transform = transform || Matrix2D.EYE();
    if (path)
    {
        if (path instanceof Path2D) add_path(path);
        else parse_path(path, self);
    }
}
Path2D[PROTO] = {
    constructor: Path2D,
    _d: null,
    _sd: null,
    transform: null,
    dispose: null,
    addPath: null,
    moveTo: null,
    lineTo: null,
    rect: null,
    roundRect: null,
    arc: null,
    ellipse: null,
    arcTo: null,
    quadraticCurveTo: null,
    bezierCurveTo: null,
    closePath: null
};
RenderingContext2D.Path2D = Path2D;

function Matrix2D(m11, m12, m13, m21, m22, m23)
{
    var self = this, sx = 1, sy = 1;
    if (arguments.length)
    {
        self.m11 = m11;
        self.m12 = m12;
        self.m13 = m13;
        self.m21 = m21;
        self.m22 = m22;
        self.m23 = m23;
    }
    // aliases
    // https://developer.mozilla.org/en-US/docs/Web/API/DOMMatrix
    def(self, 'a', {
        get: function() {
            return self.m11;
        },
        set: function(a) {
            self.m11 = sx = a;
        }
    });
    def(self, 'c', {
        get: function() {
            return self.m12;
        },
        set: function(c) {
            self.m12 = c;
        }
    });
    def(self, 'e', {
        get: function() {
            return self.m13;
        },
        set: function(e) {
            self.m13 = e;
        }
    });
    def(self, 'b', {
        get: function() {
            return self.m21;
        },
        set: function(b) {
            self.m21 = b;
        }
    });
    def(self, 'd', {
        get: function() {
            return self.m22;
        },
        set: function(d) {
            self.m22 = sy = d;
        }
    });
    def(self, 'f', {
        get: function() {
            return self.m23;
        },
        set: function(f) {
            self.m23 = f;
        }
    });
    def(self, 'is2D', {
        get: function() {
            return true;
        },
        set: function(_) {
        }
    });
    def(self, 'isIdentity', {
        get: function() {
            return  is_strictly_equal(self.m11, 1)
                 && is_strictly_equal(self.m12, 0)
                 && is_strictly_equal(self.m13, 0)
                 && is_strictly_equal(self.m21, 0)
                 && is_strictly_equal(self.m22, 1)
                 && is_strictly_equal(self.m23, 0)
             ;
        },
        set: function(_) {
        }
    });
    def(self, 'sx', {
        get: function() {
            return sx;
        },
        set: function(s) {
            sx *= s;
        }
    });
    def(self, 'sy', {
        get: function() {
            return sy;
        },
        set: function(s) {
            sy *= s;
        }
    });
}
Matrix2D[PROTO] = {
    constructor: Matrix2D,
    is2D: true,
    isIdentity: true,
    m11: 1,
    m12: 0,
    m13: 0,
    m21: 0,
    m22: 1,
    m23: 0,
    m31: 0,
    m32: 0,
    m33: 1,
    a: null,
    b: null,
    c: null,
    d: null,
    e: null,
    f: null,
    clone: function() {
        var self = this, m;
        m  = new Matrix2D(
        self.m11, self.m12, self.m13,
        self.m21, self.m22, self.m23
        );
        m.sx = self.sx;
        m.sy = self.sy;
        return m;
    },
    mul: function(other) {
        var self = this, m;
        if (other instanceof Matrix2D)
        {
            m = new Matrix2D(
            self.m11*other.m11 + self.m12*other.m21,
            self.m11*other.m12 + self.m12*other.m22,
            self.m11*other.m13 + self.m12*other.m23 + self.m13,
            self.m21*other.m11 + self.m22*other.m21,
            self.m21*other.m12 + self.m22*other.m22,
            self.m21*other.m13 + self.m22*other.m23 + self.m23
            );
            m.sx = self.sx * other.sx;
            m.sy = self.sy * other.sy;
            return m;
        }
    },
    inv: function() {
        var self = this,
            a00 = self.m11, a01 = self.m12, a02 = self.m13,
            a10 = self.m21, a11 = self.m22, a12 = self.m23,
            det2 = a00*a11 - a01*a10,
            i00 = 0, i01 = 0, i10 = 0, i11 = 0;

        if (is_strictly_equal(det2, 0)) return null;
        i00 = a11/det2; i01 = -a01/det2;
        i10 = -a10/det2; i11 = a00/det2;
        var m = new Matrix2D(
        i00, i01, -i00*a02 - i01*a12,
        i10, i11, -i10*a02 - i11*a12
        );
        m.sx = 1/self.sx;
        m.sy = 1/self.sy;
        return m;
    },
    transform: function(x, y, res) {
        if ((2 === arguments.length) && y && y.length)
        {
            res = y;
            y = x[1];
            x = x[0];
        }
        else if (1 === arguments.length)
        {
            y = x[1];
            x = x[0];
        }
        var self = this,
            tx = self.m11*x + self.m12*y + self.m13,
            ty = self.m21*x + self.m22*y + self.m23;
        if (res && res.length)
        {
            res[0] = tx;
            res[1] = ty;
        }
        else
        {
            res = [
                tx,
                ty
            ];
        }
        return res;
    }
};
Matrix2D.translate = function(tx, ty) {
    return new Matrix2D(
    1, 0, tx || 0,
    0, 1, ty || 0
    );
};
Matrix2D.scale = function(sx, sy, ox, oy) {
    ox = ox || 0;
    oy = oy || 0;
    var m = new Matrix2D(
    sx, 0,  -sx*ox + ox,
    0,  sy, -sy*oy + oy
    );
    m.sx = sx;
    m.sy = sy;
    return m;
};
Matrix2D.rotate = function(theta, ox, oy) {
    ox = ox || 0;
    oy = oy || 0;
    var cos = stdMath.cos(theta || 0), sin = stdMath.sin(theta || 0);
    return new Matrix2D(
    cos, -sin, ox - cos*ox + sin*oy,
    sin,  cos, oy - cos*oy - sin*ox
    );
};
Matrix2D.skewX = function(s) {
    return new Matrix2D(
    1, s || 0, 0,
    0, 1, 0
    );
};
Matrix2D.skewY = function(s) {
    return new Matrix2D(
    1, 0, 0,
    s || 0, 1, 0
    );
};
Matrix2D.EYE = function() {
    return new Matrix2D(
    1, 0, 0,
    0, 1, 0
    );
};
RenderingContext2D.Matrix2D = Matrix2D;

function Marker(value, params)
{
    this.value = value;
    this.params = params || null;
}
Marker[PROTO] = {
    constructor: Marker,
    value: 0,
    params: null,
    valueOf: function() {
        return this.value;
    },
    toString: function() {
        return String(this.value);
    }
};

function handle(coords, transform)
{
    var i, n, res;
    for (i=0,n=coords.length; i<n; ++i)
    {
        if (is_nan(coords[i]) || !is_finite(coords[i]))
            return null;
    }
    if (transform)
    {
        res = [0, 0];
        for (i=0; i<n; i+=2)
        {
            transform.transform(coords[i], coords[i+1], res);
            coords[i] = res[0]; coords[i+1] = res[1];
        }
    }
    return coords;
}
function add_point(p, x, y, transform)
{
    var t = transform ? transform.transform(x, y) : [x, y];
    p.push(t[0], t[1]);
}
function add_arc(p, cx, cy, rx, ry, angle, ts, te, ccw, transform)
{
    p.push.apply(p, arc_points(cx, cy, rx, ry, angle, ts, te, ccw, transform));
}
function add_arcto(p, x0, y0, x1, y1, x2, y2, r, transform)
{
    p.push.apply(p, arc2_points(x0, y0, x1, y1, x2, y2, r, transform));
}
function toVal() {return this.v;}
function dash_endpoint(points, lines, pos, pt, last_pt, total_length)
{
    var t, j, k, l, nl = lines.length;
    pos = clamp(pos, 0, total_length-1);
    if (pos+1 < total_length)
    {
        for (l=last_pt.l||0,j=last_pt.i||0; j<nl; ++j)
        {
            if ((0 < lines[j]) && (l + lines[j] > pos))
            {
                k = j << 1;
                pt.i = j;
                pt.l = l;
                t = clamp((pos-l)/lines[j], 0.0, 1.0);
                if (is_strictly_equal(t, 0.0))
                {
                    pt.x = points[k+0];
                    pt.y = points[k+1];
                }
                else if (is_strictly_equal(t, 1.0))
                {
                    pt.x = points[k+2];
                    pt.y = points[k+3];
                }
                else
                {
                    pt.x = +points[k]+(+points[k+2]-points[k])*t;
                    pt.y = +points[k+1]+(+points[k+3]-points[k+1])*t;
                }
                pt.y = {dx:+points[k+2]-points[k+0],dy:+points[k+3]-points[k+1],v:pt.y,valueOf:toVal};
                return;
            }
            l += lines[j];
        }
    }
    j = nl - 1;
    k = j << 1;
    pt.i = j;
    pt.l = total_length;
    pt.x = points[k+2];
    pt.y = {dx:+points[k+2]-points[k+0],dy:+points[k+3]-points[k+1],v:points[k+3],valueOf:toVal};
}
function dashed_polyline(points, ld, offset, plen, pmin, sx, sy)
{
    var num_coords = points.length,
        num_lines = (num_coords >>> 1) - 1,
        lines = new Array(num_lines),
        i, j, l, index,
        ld_length = ld.length, total_length = 0,
        dash, gap, prev_dash, prev_gap, d1, d2,
        start, end, mid, left, right, prev, last,
        pos, segments, dashes = [];
    for (j=0,i=0; j<num_lines; ++j,i+=2)
    {
        l = hypot((+points[i+2]-points[i])/sx, (+points[i+3]-points[i+1])/sy);
        lines[j] = l; total_length += l;
    }
    start = {x:points[0],y:points[1],i:0,l:0};
    end = {x:points[num_coords-2],y:points[num_coords-1],i:0,l:0};
    index = 0;
    pos = -offset;
    for (;pos < total_length;)
    {
        dash = ld[index]/pmin;
        gap = ld[index+1]/pmin;
        if ((0 < dash) && (0 < pos+dash))
        {
            dash_endpoint(points, lines, pos,        start, end, total_length);
            dash_endpoint(points, lines, pos+dash-1, end, start, total_length);
            segments = null;
            if (start.i+1 < end.i)
            {
                segments = [];
                segments.push(start.x);
                segments.push(start.y);
                segments.push.apply(segments, points.slice((start.i+1) << 1, (end.i) << 1));
                segments.push(end.x);
                segments.push(end.y);
            }
            else if (start.i < end.i)
            {
                segments = [start.x, start.y, points[(end.i << 1) + 0], points[(end.i << 1) + 1], end.x, end.y];
            }
            else if (start.i === end.i)
            {
                segments = [start.x, start.y, end.x, end.y];
            }
            if (segments && segments.length)
            {
                last = dashes.length ? dashes[dashes.length-1] : null;
                prev = last ? {x:last[last.length-2], y:last[last.length-1], i:last.i} : null;
                if (prev && (start.i-1 === prev.i))
                {
                    mid = {x:points[(start.i << 1) + 0], y:points[(start.i << 1) + 1], i:start.i};
                    d1 = hypot((+prev.x-mid.x)/sx, (+prev.y-mid.y)/sy);
                    d2 = hypot((+mid.x-start.x)/sx, (+mid.y-start.y)/sy);
                    if (d1+d2+offset > prev_dash+prev_gap)
                    {
                        // add line join that is missed
                        left = {x:points[(prev.i << 1) + 0], y:points[(prev.i << 1) + 1], i:prev.i};
                        right = {x:points[(start.i << 1) + 2], y:points[(start.i << 1) + 3], i:start.i};
                        dashes.push([mid.x, {dx:+mid.x-left.x,dy:+mid.y-left.y,v:mid.y,valueOf:toVal}, mid.x, mid.y, mid.x, {dx:+right.x-mid.x,dy:+right.y-mid.y,v:mid.y,valueOf:toVal}]);
                        dashes[dashes.length-1].i = start.i;
                        dashes[dashes.length-1].alpha = last.alpha;
                    }
                }
                segments.i = end.i;
                segments.alpha = stdMath.max(0.7, 1 > ld[index] ? ld[index] : 1);
                dashes.push(segments);
            }
        }
        if (0 < dash) pos += dash;
        if (0 < gap) pos += gap;
        prev_dash = dash; prev_gap = gap;
        index += 2; if (index >= ld_length) {index = 0;}
    }
    return dashes;
}
function stroke_polyline(set_pixel, points, lw, lc1, lc2, lj, ml, sx, sy, xmin, ymin, xmax, ymax)
{
    var n = points.length, i,
        x1, y1, x2, y2, xp, yp, xn, yn,
        dx1, dy1, dx2, dy2, dx0, dy0, dx00, dy00, w1, w2, ljj = lj,
        alpha = 0, lcc1 = lc1, lcc2 = lc2;
    if (n < 6)
    {
        x1 = points[0];
        y1 = points[1];
        x2 = points[2];
        y2 = points[3];
        dx2 = stdMath.abs(+x2 - x1);
        dy2 = stdMath.abs(+y2 - y1);
        dx0 = null == y1.dx ? y2.dx : y1.dx;
        dy0 = null == y1.dy ? y2.dy : y1.dy;
        w2 = ww(lw, dx2, dy2, sx, sy, dx0, dy0);
        alpha = stroke_line(set_pixel, +x1, +y1, +x2, +y2, dx2, dy2, w2[0], w2[1], lc1, lc2, lw, xmin, ymin, xmax, ymax, dx0, dy0, points.alpha);
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
            dx0 = null == y1.dx ? y2.dx : y1.dx;
            dy0 = null == y1.dy ? y2.dy : y1.dy;
            w2 = ww(lw, dx2, dy2, sx, sy, dx0, dy0);
            if (x1.params && x1.params.lineCap) lcc1 = true === x1.params.lineCap ? lc1 : x1.params.lineCap;
            if (x2.params && x2.params.lineCap) lcc2 = true === x2.params.lineCap ? lc2 : x2.params.lineCap;
            alpha = stdMath.max(alpha, stroke_line(set_pixel, +x1, +y1, +x2, +y2, dx2, dy2, w2[0], w2[1], 0 === i ? lcc1 : null, n === i+2 ? lcc2 : null, lw, xmin, ymin, xmax, ymax, dx0, dy0, points.alpha));
            if (0 < i && (0 < w1[0] || 0 < w1[1] || 0 < w2[0] || 0 < w2[1]))
            {
                if (x1.params && x1.params.lineJoin) ljj = true === x1.params.lineJoin ? lj : x1.params.lineJoin;
                join_lines(set_pixel, +xp, +yp, +x1, +y1, +x2, +y2, dx00 || dx1, dy00 || dy1, w1[0], w1[1], dx0 || dx2, dy0 || dy2, w2[0], w2[1], ljj, ml, xmin, ymin, xmax, ymax, alpha);
            }
            xp = x1;
            yp = y1;
            dx1 = dx2;
            dy1 = dy2;
            dx00 = dx0;
            dy00 = dy0;
            w1 = w2;
        }
    }
    if (x2.params && x2.params.join)
    {
        xp = x2.params.join[0];
        yp = x2.params.join[1];
        dx1 = stdMath.abs(xp - x2);
        dy1 = stdMath.abs(yp - y2);
        dx00 = null;
        dy00 = null;
        w1 = ww(lw, dx1, dy1, sx, sy, dx00, dy00);
        if (0 < w1[0] || 0 < w1[1] || 0 < w2[0] || 0 < w2[1])
        {
            join_lines(set_pixel, +x1, +y1, +x2, +y2, +xp, +yp, dx0 || dx2, dy0 || dy2, w2[0], w2[1], dx00 || dx1, dy00 || dy1, w1[0], w1[1], ljj, ml, xmin, ymin, xmax, ymax, alpha);
        }
    }
}
function stroke_line(set_pixel, x1, y1, x2, y2, dx, dy, wx, wy, c1, c2, lw, xmin, ymin, xmax, ymax, dx0, dy0, alpha0)
{
    if (0 === wx && 0 === wy)
    {
        return wu_line(set_pixel, x1, y1, x2, y2, dx, dy, lw, xmin, ymin, xmax, ymax, true, true, alpha0);
    }
    else if (0 === dx && 0 === dy && null != dx0)
    {
        return wu_line(set_pixel, x1-wx, y1-(dx0*dy0<0 ? 1 : -1)*wy, x2+wx, y2+(dx0*dy0<0 ? 1 : -1)*wy, 2*wx, 2*wy, 1, xmin, ymin, xmax, ymax, false, false, alpha0);
    }
    else
    {
        return wu_thick_line(set_pixel, x1, y1, x2, y2, dx, dy, wx, wy, c1, c2, lw, xmin, ymin, xmax, ymax, dx0, dy0, alpha0);
    }
}
function ww(w, dx, dy, sx, sy, dx0, dy0)
{
    var wxy, n, w2, ox, oy;
    w2 = stdMath.max(0, (w-1)/2);
    ox = 1 === sx ? 0 : sx/2;
    oy = 1 === sy ? 0 : sy/2;
    if (null != dx0)
    {
        dx = stdMath.abs(dx0);
        dy = stdMath.abs(dy0);
    }
    if (0.5 > sx*w2+ox && 0.5 > sy*w2+oy)
    {
        wxy = [0, 0];
    }
    else if (is_strictly_equal(dx, 0))
    {
        wxy = [sx*w2+ox, 0];
    }
    else if (is_strictly_equal(dy, 0))
    {
        wxy = [0, sy*w2+oy];
    }
    else
    {
        n = hypot(dx, dy);
        wxy = [(sx*w2+ox)*dy/n, (sy*w2+oy)*dx/n];
    }
    return wxy;
}
function clip(x1, y1, x2, y2, xmin, ymin, xmax, ymax)
{
    // clip points to viewport
    // https://en.wikipedia.org/wiki/Liang%E2%80%93Barsky_algorithm
    if (null == xmin) return;
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
function fill_rect(set_pixel, x1, y1, x2, y2, xmin, ymin, xmax, ymax, alpha)
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
    if (null == alpha) alpha = 1;
    if (y1 === y2)
    {
        for (x=x1; x<=x2; ++x) set_pixel(x, y1, alpha);
    }
    else if (x1 === x2)
    {
        for (y=y1; y<=y2; ++y) set_pixel(x1, y, alpha);
    }
    else
    {
        for (y=y1; y<=y2; ++y)
        {
            for (x=x1; x<=x2; ++x) set_pixel(x, y, alpha);
        }
    }
}
function fill_triangle(set_pixel, ax, ay, bx, by, cx, cy, xmin, ymin, xmax, ymax, alpha)
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
    if (null == alpha) alpha = 1;
    if (by < ay)
    {
        t = ay;
        ay = by;
        by = t;
        t = ax;
        ax = bx;
        bx = t;
    }
    if (cy < ay)
    {
        t = ay;
        ay = cy;
        cy = t;
        t = ax;
        ax = cx;
        cx = t;
    }
    if (cy < by)
    {
        t = by;
        by = cy;
        cy = t;
        t = bx;
        bx = cx;
        cx = t;
    }
    yac = cy - ay;
    if (is_strictly_equal(yac, 0))
    {
        // line or single point
        y = stdMath.round(ay);
        x = stdMath.round(stdMath.min(ax, bx, cx));
        xx = stdMath.round(stdMath.max(ax, bx, cx));
        return fill_rect(set_pixel, x, y, xx, y, xmin, ymin, xmax, ymax, alpha);
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
        x = stdMath.round(x +  e);
        xx = stdMath.round(xx - e);
        if (clip) {x = stdMath.max(xmin, x); xx = stdMath.min(xmax, xx);}
        for (; x<=xx; ++x) set_pixel(x, y, alpha);
    }
}
function fill_trapezoid(set_pixel, ax, ay, bx, by, cx, cy, dx, dy, xmin, ymin, xmax, ymax, alpha)
{
    // fill the trapezoid defined by a, b, c, d, points in order
    var y = stdMath.min(ay, by, cy, dy),
        yy = stdMath.max(ay, by, cy, dy),
        x = stdMath.min(ax, bx, cx, dx),
        xx = stdMath.max(ax, bx, cx, dx),
        y1, y2, x1, x2, xi, edges,
        clip = null != xmin, t, i, j, e = 0.5;
    if (clip)
    {
        // if is outside viewport return
        if (yy < ymin || y > ymax || xx < xmin || x > xmax)
            return;
    }
    if (null == alpha) alpha = 1;
    if (is_strictly_equal(y, yy))
    {
        // line or single point
        y = stdMath.round(y);
        x = stdMath.round(x);
        xx = stdMath.round(xx);
        return fill_rect(set_pixel, x, y, xx, y, xmin, ymin, xmax, ymax, alpha);
    }
    y = stdMath.round(y);
    yy = stdMath.round(yy);
    if (clip) {y = stdMath.max(ymin, y); yy = stdMath.min(ymax, yy);}
    if (y > yy) return;
    edges = [
    by < ay ? [bx, by, ax, ay] : [ax, ay, bx, by],
    cy < by ? [cx, cy, bx, by] : [bx, by, cx, cy],
    dy < cy ? [dx, dy, cx, cy] : [cx, cy, dx, dy],
    ay < dy ? [ax, ay, dx, dy] : [dx, dy, ax, ay]
    ];
    /*if (a > b) swap(a,b)
    if (c > d) swap(c,d)
    if (a > c) swap(a,c)
    if (b > d) swap(b,d)
    if (b > c) swap(b,c)*/
    if (edges[1][1] < edges[0][1]) {t=edges[0]; edges[0]=edges[1]; edges[1]=t;}
    if (edges[3][1] < edges[2][1]) {t=edges[2]; edges[2]=edges[3]; edges[3]=t;}
    if (edges[2][1] < edges[0][1]) {t=edges[0]; edges[0]=edges[2]; edges[2]=t;}
    if (edges[3][1] < edges[1][1]) {t=edges[1]; edges[1]=edges[3]; edges[3]=t;}
    if (edges[2][1] < edges[1][1]) {t=edges[2]; edges[2]=edges[1]; edges[1]=t;}
    for (i=0; y<=yy; ++y)
    {
        while (i < 4 && edges[i][3] < y) ++i;
        if (i >= 4) return;
        x = INF;
        xx = -INF;
        for (j=i; j<4; ++j)
        {
            x1 = edges[j][0];
            y1 = edges[j][1];
            x2 = edges[j][2];
            y2 = edges[j][3];
            if (y1 <= y && y <= y2)
            {
                if (is_strictly_equal(y1, y2))
                {
                    x = stdMath.min(x, x1, x2);
                    xx = stdMath.max(xx, x1, x2);
                }
                else
                {
                    xi = (x2 - x1)*(y - y1)/(y2 - y1) + x1;
                    x = stdMath.min(x, xi);
                    xx = stdMath.max(xx, xi);
                }
            }
        }
        if (xx - x < 1)
        {
            if (!clip || (x >= xmin && x <= xmax)) set_pixel(stdMath.round(x), y, 1);
            continue;
        }
        x = stdMath.round(x + e);
        xx = stdMath.round(xx - e);
        if (clip) {x = stdMath.max(xmin, x); xx = stdMath.min(xmax, xx);}
        for (; x<=xx; ++x) set_pixel(x, y, alpha);
    }
}
function fill_sector(set_pixel, ax, ay, bx, by, px, py, r, xmin, ymin, xmax, ymax, alpha)
{
    // fill circular sector with radius r defined by line a - b and point p
    var y, yy, x, xx, xi,
        x1, x2, y1, y2, p, n,
        xab, yab, zab, tol = 0.5,
        t, i, j, k, m, e, c,
        cx, cy, ta, tb, t0, t1, tp, ccw,
        clip = null != xmin
    ;
    if (by < ay) {t = ay; ay = by; by = t; t = ax; ax = bx; bx = t;}
    p = point_line_project(px, py, ax, ay, bx, by);
    n = hypot(px - p[0], py - p[1]);
    cx = px + r/n*(p[0] - px);
    cy = py + r/n*(p[1] - py);
    tp = stdMath.atan2(py - cy, px - cx);
    ta = stdMath.atan2(ay - cy, ax - cx);
    tb = stdMath.atan2(by - cy, bx - cx);
    tp = cmod(tp);
    t0 = cmod(ta);
    t1 = cmod(tb);
    ccw = !((tp < t0 && tp < t1) || (tp > t0 && tp > t1) || (tp > t0 && tp < t1));
    p = arc_points(cx, cy, r, r, 0, ta, tb, ccw);
    m = p.length - 2;
    if (null == alpha) alpha = 1;
    // outline of sector
    for (i=0; i<m; i+=2) wu_line(set_pixel, p[i], p[i+1], p[i+2], p[i+3], null, null, alpha, xmin, ymin, xmax, ymax);
    p = path_to_segments([p]);
    y = stdMath.round(stdMath.min(ay, by, py, p.ymin));
    yy = stdMath.round(stdMath.max(ay, by, py, p.ymax));
    if (clip)
    {
        y = stdMath.max(y, ymin);
        yy = stdMath.min(yy, ymax);
    }
    xab = bx - ax;
    yab = by - ay;
    zab = is_strictly_equal(yab, 0);
    i = 0; m = p.length;
    // fill of sector
    for (; y<=yy; ++y)
    {
        while (i < m && p[i][3] < y) ++i;
        if (i >= m) break;
        e = p[i];
        if (e[1] > y)
        {
            y = stdMath.floor(e[1]);
            continue;
        }
        x = INF;
        xx = -INF;
        if (y >= ay && y <= by)
        {
            if (zab)
            {
                x = stdMath.min(x, ax, bx);
                xx = stdMath.max(xx, ax, bx);
            }
            else
            {
                xi = xab*(y - ay)/yab + ax;
                x = stdMath.min(x, xi);
                xx = stdMath.max(xx, xi);
            }
        }
        for (j=i; j<m && p[j][1]<=y; ++j)
        {
            e = p[j];
            if (e[3] >= y)
            {
                x1 = e[0];
                x2 = e[2];
                y1 = e[1];
                y2 = e[3];
                if (is_strictly_equal(y1, y2))
                {
                    x = stdMath.min(x, x1, x2);
                    xx = stdMath.max(xx, x1, x2);
                }
                else
                {
                    xi = (x2 - x1)*(y - y1)/(y2 - y1) + x1;
                    x = stdMath.min(x, xi);
                    xx = stdMath.max(xx, xi);
                }
            }
        }
        x = stdMath.round(x + tol);
        xx = stdMath.round(xx - tol);
        if (clip)
        {
            x = stdMath.max(x, xmin);
            xx = stdMath.min(xx, xmax);
        }
        for (; x<=xx; ++x) set_pixel(x, y, alpha);
    }
}
function wu_line(set_pixel, xs, ys, xe, ye, dx, dy, lw, xmin, ymin, xmax, ymax, gs, ge, alpha0)
{
    var xm = stdMath.min(xs, xe), xM = stdMath.max(xs, xe),
        ym = stdMath.min(ys, ye), yM = stdMath.max(ys, ye),
        alpha = 1 > lw ? lw : 1, do_clip = null != xmin;

    if (null != alpha0 && alpha0 < alpha) alpha = alpha0;

    if (!alpha) return alpha;
    // if line is outside viewport return
    if (do_clip && (xM < xmin || xm > xmax || yM < ymin || ym > ymax)) return alpha;

    if (null == dx)
    {
        dx = stdMath.abs(xe - xs);
        dy = stdMath.abs(ye - ys);
    }

    // clip it to viewport if needed
    if (do_clip && (xm < xmin || xM > xmax || ym < ymin || yM > ymax))
    {
        var clipped = clip(xs, ys, xe, ye, xmin, ymin, xmax, ymax);
        if (!clipped) return alpha;
        xs = clipped[0];
        ys = clipped[1];
        xe = clipped[2];
        ye = clipped[3];
    }

    if (is_strictly_equal(dx, 0) || is_strictly_equal(dy, 0))
    {
        fill_rect(set_pixel, stdMath.round(xs), stdMath.round(ys), stdMath.round(xe), stdMath.round(ye), null, null, null, null, alpha);
        return alpha;
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
    gap = gs ? 1 : (1 - (xs + e - stdMath.floor(xs + e)));
    x1 = xend;
    y1 = stdMath.floor(yend);
    fpart = yend - y1;
    rfpart = 1 - fpart;
    if (steep)
    {
        set_pixel(y1, x1, alpha*rfpart*gap);
        set_pixel(y1 + 1, x1, alpha*fpart*gap);
    }
    else
    {
        set_pixel(x1, y1, alpha*rfpart*gap);
        set_pixel(x1, y1 + 1, alpha*fpart*gap);
    }

    intersect = yend + gradient;

    // handle second endpoint
    xend = stdMath.round(xe);
    yend = ye + gradient * (xend - xe);
    gap = ge ? 1 : (xe + e - stdMath.floor(xe + e));
    x2 = xend;
    y2 = stdMath.floor(yend);
    fpart = yend - y2;
    rfpart = 1 - fpart;
    if (steep)
    {
        set_pixel(y2, x2, alpha*rfpart*gap);
        set_pixel(y2 + 1, x2, alpha*fpart*gap);
    }
    else
    {
        set_pixel(x2, y2, alpha*rfpart*gap);
        set_pixel(x2, y2 + 1, alpha*fpart*gap);
    }

    // main loop
    if (steep)
    {
        for (x=x1+1; x<x2; ++x)
        {
            y = stdMath.floor(intersect);
            fpart = intersect - y;
            rfpart = 1 - fpart;
            if (0 < rfpart) set_pixel(y, x, alpha*rfpart);
            if (0 < fpart) set_pixel(y + 1, x, alpha*fpart);
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
            if (0 < rfpart) set_pixel(x, y, alpha*rfpart);
            if (0 < fpart) set_pixel(x, y + 1, alpha*fpart);
            intersect += gradient;
        }
    }
    return alpha;
}
function wu_thick_line(set_pixel, xs, ys, xe, ye, dx, dy, wx, wy, cs, ce, lw, xmin, ymin, xmax, ymax, dx0, dy0, alpha0)
{
    var t, sx, sy,
        wsx, wsy,
        xa, xb, xc, xd,
        ya, yb, yc, yd,
        h = hypot(dx, dy),
        alpha = (1 > h ? h : 1) || 1;

    if (null != alpha0 && 1 > alpha0 && 0 < alpha0 /*&& alpha > alpha0*/) alpha = alpha0;

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

    if (is_strictly_equal(dx, 0) && (null == dx0 || 0 === dx0))
    {
        if ('square' === cs) ys -= sy*wx;
        if ('square' === ce) ye += sy*wx;
        if ('round' === cs)
        {
            fill_sector(set_pixel, xs-wx, ys, xs+wx, ys, xs, ys-sy*wx, wx, xmin, ymin, xmax, ymax, alpha);
        }
        if ('round' === ce)
        {
            fill_sector(set_pixel, xe-wx, ye, xe+wx, ye, xe, ye+sy*wx, wx, xmin, ymin, xmax, ymax, alpha);
        }
        fill_rect(set_pixel, stdMath.round(xs - wx), stdMath.round(ys), stdMath.round(xs + wx), stdMath.round(ye), xmin, ymin, xmax, ymax, alpha);
        return alpha;
    }
    if (is_strictly_equal(dy, 0) && (null == dy0 || 0 === dy0))
    {
        if ('square' === cs) xs -= sx*wy;
        if ('square' === ce) xe += sx*wy;
        if ('round' === cs)
        {
            fill_sector(set_pixel, xs, ys-wy, xs, ys+wy, xs-wy, ys, wy, xmin, ymin, xmax, ymax, alpha);
        }
        if ('round' === ce)
        {
            fill_sector(set_pixel, xe, ye-wy, xe, ye+wy, xe+wy, ye, wy, xmin, ymin, xmax, ymax, alpha);
        }
        fill_rect(set_pixel, stdMath.round(xs), stdMath.round(ys - wy), stdMath.round(xe), stdMath.round(ys + wy), xmin, ymin, xmax, ymax, alpha);
        return alpha;
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

    if ('round' === cs || 'round' === ce) lw = hypot(wx, wy);

    // outline
    if ('round' === cs)
    {
        fill_sector(set_pixel, xa, ya, xb, yb, (xa-sx*wy+xb-sx*wy)/2, (ya-sy*wx+yb-sy*wx)/2, lw, xmin, ymin, xmax, ymax, alpha)
    }
    else
    {
        wu_line(set_pixel, xa, ya, xb, yb, null, null, alpha, xmin, ymin, xmax, ymax);
    }
    wu_line(set_pixel, xb, yb, xd, yd, null, null, alpha, xmin, ymin, xmax, ymax);
    if ('round' === ce)
    {
        fill_sector(set_pixel, xd, yd, xc, yc, (xc+sx*wy+xd+sx*wy)/2, (yc+sy*wx+yd+sy*wx)/2, lw, xmin, ymin, xmax, ymax, alpha)
    }
    else
    {
        wu_line(set_pixel, xd, yd, xc, yc, null, null, alpha, xmin, ymin, xmax, ymax);
    }
    wu_line(set_pixel, xc, yc, xa, ya, null, null, alpha, xmin, ymin, xmax, ymax);
    // fill
    /*fill_triangle(set_pixel, xa, ya, xb, yb, xc, yc, xmin, ymin, xmax, ymax, alpha);
    fill_triangle(set_pixel, xb, yb, xc, yc, xd, yd, xmin, ymin, xmax, ymax, alpha);*/
    fill_trapezoid(set_pixel, xa, ya, xb, yb, xd, yd, xc, yc, xmin, ymin, xmax, ymax, alpha);
    return alpha;
}
function join_lines(set_pixel, x1, y1, x2, y2, x3, y3, dx1, dy1, wx1, wy1, dx2, dy2, wx2, wy2, j, ml, xmin, ymin, xmax, ymax, alpha)
{
    var sx1 = x1 > x2 ? -1 : (x1 === x2 && 0 > dx1 ? -1 : 1),
        sy1 = y1 > y2 ? -1 : (y1 === y2 && 0 > dy1 ? -1 : 1),
        sx2 = x2 > x3 ? -1 : (x2 === x3 && 0 > dx2 ? -1 : 1),
        sy2 = y2 > y3 ? -1 : (y2 === y3 && 0 > dy2 ? -1 : 1),
        wsx1, wsy1,
        wsx2, wsy2,
        a1, b1,
        c1, d1,
        a2, b2,
        c2, d2,
        p, q,
        p0, q0,
        t, s,
        mitl, lw;

    dx1 = stdMath.abs(dx1); dy1 = stdMath.abs(dy1);
    dx2 = stdMath.abs(dx2); dy2 = stdMath.abs(dy2);

    // no join needed, 2-3 is a continuation of 1-2 along same line
    if (is_almost_equal(sy1*dy1*sx2*dx2, sy2*dy2*sx1*dx1, 1e-6)) return;
    if (null == alpha) alpha = 1;

    /*if (x1 > x2 && x2 > x3)
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
    sy2 = y2 > y3 ? -1 : 1;*/
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

    if (sy1*dy1*sx2*dx2 > sy2*dy2*sx1*dx1)
    {
        p = c1;
        q = a2;
    }
    else
    {
        p = d1;
        q = b2;
    }
    if (0 > sx2*sy1*sx1*sy2)
    {
        p = d1 === p ? c1 : d1;
        q = b2 === q ? a2 : b2;
    }
    if (0 > sx1*sy2)
    {
        p = d1 === p ? c1 : d1;
    }
    if (0 > sx2*sy1)
    {
        q = b2 === q ? a2 : b2;
    }
    if (0 > sx1*sx2)
    {
        p = d1 === p ? c1 : d1;
        q = b2 === q ? a2 : b2;
    }
    if ('bevel' === j)
    {
        wu_line(set_pixel, p.x, p.y, q.x, q.y, null, null, alpha, xmin, ymin, xmax, ymax);
        fill_triangle(set_pixel, s.x, s.y, p.x, p.y, q.x, q.y, xmin, ymin, xmax, ymax, alpha);
    }
    else
    {
        p0 = p === d1 ? b1 : a1;
        q0 = q === b2 ? d2 : c2;
        t = intersect(p0.x, p0.y, p.x, p.y, q.x, q.y, q0.x, q0.y);
        mitl = hypot(t.x - s.x, t.y - s.y);
        lw = stdMath.min(hypot(wx1, wy1), hypot(wx2, wy2));
        if ('round' === j)
        {
            t = {x:s.x + lw*(t.x - s.x)/mitl, y:s.y + lw*(t.y - s.y)/mitl};
            fill_triangle(set_pixel, s.x, s.y, p.x, p.y, q.x, q.y, xmin, ymin, xmax, ymax, alpha);
            fill_sector(set_pixel, p.x, p.y, q.x, q.y, t.x, t.y, lw, xmin, ymin, xmax, ymax, alpha);
        }
        else//if('miter' === j)
        {
            if (mitl > ml*lw)
            {
                wu_line(set_pixel, p.x, p.y, q.x, q.y, null, null, alpha, xmin, ymin, xmax, ymax);
                fill_triangle(set_pixel, s.x, s.y, p.x, p.y, q.x, q.y, xmin, ymin, xmax, ymax, alpha);
            }
            else
            {
                wu_line(set_pixel, p.x, p.y, t.x, t.y, null, null, alpha, xmin, ymin, xmax, ymax);
                wu_line(set_pixel, q.x, q.y, t.x, t.y, null, null, alpha, xmin, ymin, xmax, ymax);
                fill_triangle(set_pixel, s.x, s.y, p.x, p.y, q.x, q.y, xmin, ymin, xmax, ymax, alpha);
                fill_triangle(set_pixel, t.x, t.y, p.x, p.y, q.x, q.y, xmin, ymin, xmax, ymax, alpha);
            }
        }
    }
}
function arc_angles(ts, te, ccw)
{
    var t0 = cmod(ts), t1 = te + (t0 - ts);
    if (!ccw && t1 - t0 >= TWO_PI) t1 = t0 + TWO_PI;
    else if (ccw && t0 - t1 >= TWO_PI) t1 = t0 - TWO_PI;
    else if (!ccw && t0 > t1) t1 = t0 + (TWO_PI - cmod(t0 - t1));
    else if (ccw && t0 < t1) t1 = t0 - (TWO_PI - cmod(t1 - t0));
    return [t0, t1];
}
function arc_points(cx, cy, rx, ry, a, ts, te, ccw, transform)
{
    var tt = arc_angles(ts, te, ccw);
    ts = tt[0]; te = tt[1];
    var cos = a ? stdMath.cos(a) : 1,
        sin = a ? stdMath.sin(a) : 0,
        delta = te - ts,
        hasTransform = transform && !transform.isIdentity,
        arc = function(t) {
            var p = ts + t*delta,
                x = rx*stdMath.cos(p),
                y = ry*stdMath.sin(p),
                xo = cx + cos*x - sin*y,
                yo = cy + sin*x + cos*y;
            return hasTransform ? transform.transform(xo, yo) : [xo, yo];
        },
        points = sample_curve(arc, hasTransform ? transform.sx : 1, hasTransform ? transform.sy : 1);

    // normally must call .closePath even if the whole TWO_PI arc is drawn
    //if (stdMath.abs(delta)+1e-3 >= TWO_PI && (!is_almost_equal(points[0], points[points.length-2], 1e-3) || !is_almost_equal(points[1], points[points.length-1], 1e-3))) points.push(points[0], points[1]);
    return points;
}
function arc2_points(x0, y0, x1, y1, x2, y2, r, transform)
{
    var p = [], params = arc2arc(x0, y0, x1, y1, x2, y2, r), p0;
    if (params && 2 <= params.length)
    {
        p0 = transform ? transform.transform(params[0], params[1]) : [params[0], params[1]];
        p.push(p0[0], p0[1]);
        if (2 < params.length)
        {
            p.push.apply(p, arc_points(params[2], params[3], r, r, 0, params[4], params[5], params[6], transform));
        }
    }
    return p;
}
function arc2arc(x0, y0, x1, y1, x2, y2, r)
{
    // adapted from node-canvas
    if (
        (is_almost_equal(x1, x0) && is_almost_equal(y1, y0))
        || (is_almost_equal(x1, x2) && is_almost_equal(y1, y2))
        || is_almost_equal(r, 0)
    )
    {
        return [x1, y1];
    }

    var p1p0, p1p2,
        p1p0_length, p1p2_length,
        cos_phi, factor_max, tangent,
        factor_p1p0, t_p1p0,
        factor_p1p2, t_p1p2,
        orth_p1p0, orth_p1p0_length,
        orth_p1p2, orth_p1p2_length,
        factor_ra, cos_alpha,
        center, sa, ea, ccw = false
    ;

    p1p0 = {x:x0 - x1, y:y0 - y1};
    p1p2 = {x:x2 - x1, y:y2 - y1};
    p1p0_length = hypot(p1p0.x, p1p0.y);
    p1p2_length = hypot(p1p2.x, p1p2.y);
    cos_phi = (p1p0.x * p1p2.x + p1p0.y * p1p2.y) / (p1p0_length * p1p2_length);

    // all points on a line
    if (is_strictly_equal(cos_phi, -1))
    {
        return [x1, y1];
    }

    if (is_strictly_equal(cos_phi, 1))
    {
        // infinite far away point
        factor_max = 65535 / p1p0_length;
        return [x0 + factor_max * p1p0.x, y0 + factor_max * p1p0.y];
    }

    tangent = r / stdMath.tan(stdMath.acos(cos_phi) / 2);
    factor_p1p0 = tangent / p1p0_length;
    t_p1p0 = {x:x1 + factor_p1p0 * p1p0.x, y:y1 + factor_p1p0 * p1p0.y};

    orth_p1p0 = {x:p1p0.y, y:-p1p0.x};
    orth_p1p0_length = hypot(orth_p1p0.x, orth_p1p0.y);
    factor_ra = r / orth_p1p0_length;

    cos_alpha = (orth_p1p0.x * p1p2.x + orth_p1p0.y * p1p2.y) / (orth_p1p0_length * p1p2_length);
    if (cos_alpha < 0)
    {
        orth_p1p0 = {x:-orth_p1p0.x, y:-orth_p1p0.y};
    }

    center = {x:t_p1p0.x + factor_ra * orth_p1p0.x, y:t_p1p0.y + factor_ra * orth_p1p0.y};

    orth_p1p0 = {x:-orth_p1p0.x, y:-orth_p1p0.y};
    sa = stdMath.acos(orth_p1p0.x / orth_p1p0_length);
    if (orth_p1p0.y < 0) sa = TWO_PI - sa;

    factor_p1p2 = tangent / p1p2_length;
    t_p1p2 = {x:x1 + factor_p1p2 * p1p2.x, y:y1 + factor_p1p2 * p1p2.y};
    orth_p1p2 = {x:t_p1p2.x - center.x, y:t_p1p2.y - center.y};
    orth_p1p2_length = hypot(orth_p1p2.x, orth_p1p2.y);
    ea = stdMath.acos(orth_p1p2.x / orth_p1p2_length);

    if (orth_p1p2.y < 0) ea = TWO_PI - ea;
    if ((sa > ea) && ((sa - ea) < PI)) ccw = true;
    if ((sa < ea) && ((ea - sa) > PI)) ccw = true;

    return [
     t_p1p0.x
    ,t_p1p0.y
    ,center.x
    ,center.y
    ,sa
    ,ea
    ,ccw && !is_almost_equal(TWO_PI, r) ? true : false
    ];
}
function bezier_points(c, transform)
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
        },
        hasTransform = transform && !transform.isIdentity;
    return sample_curve(6 < c.length ? cubic : quadratic, hasTransform ? transform.sx : 1, hasTransform ? transform.sy : 1);
}
function stroke_path(set_pixel, path, lineWidth, lineDash, lineDashOffset, lineCap, lineJoin, miterLimit, sx, sy, xmin, ymin, xmax, ymax)
{
    var patternInfo = {length:0, min:INF, offset:lineDashOffset};
    lineDash.forEach(function(segment) {
        patternInfo.length += segment;
        patternInfo.min = stdMath.min(patternInfo.min, segment);
    });
    if (patternInfo.min >= 1) patternInfo.min = 1;
    if (patternInfo.offset >= patternInfo.length) patternInfo.offset -= stdMath.floor(patternInfo.offset/patternInfo.length)*patternInfo.length;
    if (patternInfo.offset < 0) patternInfo.offset += stdMath.ceil(-patternInfo.offset/patternInfo.length)*patternInfo.length;
    patternInfo.offset /= patternInfo.min;
    for (var i=0,d=path._d,n=d.length,p; i<n; ++i)
    {
        p = d[i];
        if (p && (2 < p.length))
        {
            var _p = lineDash.length ? dashed_polyline(p, lineDash, patternInfo.offset, patternInfo.length, patternInfo.min, sx, sy) : [p];
            for (var j=0,m=_p.length; j<m; ++j)
            {
                if (0 < _p[j].length) stroke_polyline(set_pixel, _p[j], lineWidth, 0 === j ? lineCap : 'butt', m === 1+j ? lineCap : 'butt', lineJoin, miterLimit, sx, sy, xmin, ymin, xmax, ymax);
            }
        }
    }
}
function fill_path(set_pixel, path, rule, xmin, ymin, xmax, ymax)
{
    var edges = path._sd;
    if (!edges.length) return;
    var n = edges.length,
        edg = new Array(n),
        y = edges.ymin, yM = edges.ymax,
        i = 0, j, k, d, e, c, tol = 0.5,
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
        e[8] = xi;
        e[9] = 0;
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
                e[8] = xi;
                e[9] = 0;
                edg[k++] = e;
            }
        }
        // some edges found are redundant, mark them
        c = redundant(edg, k, y);
        if (c+2 > k) continue; // at least two edges are needed
        xm = stdMath.max(xmin, stdMath.round(xm + tol));
        xM = stdMath.min(xmax, stdMath.round(xM - tol));
        if (xm > xM) continue; // no fill at this point
        if (evenodd)
        {
            // evenodd fill rule
            for (x=xm; x<=xM; ++x)
            {
                for (insidel=false,insider=false,j=0; j<k; ++j)
                {
                    e = edg[j];
                    if (e[9]) continue; // redundant
                    xi = e[8];
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
                    if (e[9]) continue; // redundant
                    xi = e[8];
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
/*function point_in_stroke(x, y, path, lw)
{
    // NOTE: lineDashes, lineJoins, etc are not taken account of
    var i, j, p, m,
        d = path._d, n = d.length,
        x1, y1, x2, y2,
        sx = stdMath.abs(path.transform.sx),
        sy = stdMath.abs(path.transform.sy);
    if (null == lw) lw = 1;
    for (i=0; i<n; ++i)
    {
        p = d[i];
        m = p.length - 2;
        if (0 < m)
        {
            for (j=0; j<m; j+=2)
            {
                x1 = +p[j];
                y1 = p[j+1];
                x2 = +p[j+2];
                y2 = p[j+3];
                //if (is_almost_equal((y2 - y1)*(x - x1), (y - y1)*(x2 - x1), 1e-4))
                if (2*point_line_segment_distance(x, y, x1, y1, x2, y2, sx, sy) <= lw)
                {
                    return true;
                }
            }
        }
    }
    return false;
}*/
function point_in_path(x, y, path, rule)
{
    var edges = path._sd;
    if (!edges.length || y < edges.ymin || y > edges.ymax) return false;
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
    e[8] = xi;
    e[9] = 0;
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
            e[8] = xi;
            e[9] = 0;
            edg[k++] = e;
        }
    }
    // some edges found are redundant, mark them
    c = redundant(edg, k, y);
    if (c+2 > k) return false === edg[0][8] ? false : is_almost_equal(x, edg[0][8]);
    if (xm > xM || x < xm || x > xM) return false;
    if (evenodd)
    {
        // evenodd fill rule
        for (insidel=false,insider=false,j=0; j<k; ++j)
        {
            e = edg[j];
            if (e[9]) continue; // redundant
            xi = e[8];
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
            if (e[9]) continue; // redundant
            xi = e[8];
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
function path_to_segments(polylines)
{
    if (!polylines) return [];
    var segments = [],
        m = polylines.length,
        n, i, j, k, l, h, p,
        ymin = INF, ymax = -INF;
    for (k=0,l=0,j=0; j<m; ++j)
    {
        p = polylines[j];
        if (!p) continue;
        n = p.length - 2;
        if (0 >= n) continue;
        ++k; l = 1; h = -1;
        for (i=0; i<n; i+=2)
        {
            if (p[i].params && p[i].params.type)
            {
                if ((0 <= h) && h < segments.length)
                {
                    // relate start and end of curve segments
                    segments[h][7] = segments[h+l-2][6] + 1;
                    segments[h+l-2][7] = segments[h][6] + 1;
                }
                ++k;
                l = 1;
                h = segments.length;
            }
            ymin = stdMath.min(ymin, p[i+1]);
            ymax = stdMath.max(ymax, p[i+1]);
            if (p[i+1] > p[i+3])
            {
                segments.push([+p[i+2], p[i+3], +p[i], p[i+1], -1, k, l, l, 0, 0]);
            }
            else
            {
                segments.push([+p[i], p[i+1], +p[i+2], p[i+3], 1, k, l, l, 0, 0]);
            }
            ++l;
        }
        ymin = stdMath.min(ymin, p[n+1]);
        ymax = stdMath.max(ymax, p[n+1]);
    }
    segments = segments.sort(asc);
    segments.ymin = ymin;
    segments.ymax = ymax;
    return segments;
}
function redundant(edg, n, y)
{
    var i, j, e, f, c = 0;
    for (i=0; i<n; ++i)
    {
        e = edg[i];
        if (e[9]) continue;
        for (j=i+1; j<n; ++j)
        {
            f = edg[j];
            if (f[9] || (e[4] !== f[4]) || (e[5] !== f[5])
                || ((1 < stdMath.abs(e[6] - f[6])) && (1 < stdMath.abs(e[7] - f[7])))) continue;
            if (
                (is_almost_equal(e[0], f[0], 1e-6)
                && is_almost_equal(e[1], f[1], 1e-6)
                && is_almost_equal(e[2], f[2], 1e-6)
                && is_almost_equal(e[3], f[3], 1e-6))
                || is_almost_equal(e[3], f[1], 1e-6)
                || is_almost_equal(e[1], f[3], 1e-6)
            )
            {
                f[9] = 1;
                ++c;
            }
        }
    }
    return c;
}
function sample_curve(f, sx, sy)
{
    var i, p, points = [], n = NUM_POINTS;
    p = f(0);
    points.push(p[0], p[1]);
    for (i=0; i<n; ++i)
    {
        p = subdivide_curve(points, f, sx, sy, 0 === i ? 0 : i/n, n === i+1 ? 1 : (i+1)/n, p, null);
    }
    return points;
}
function subdivide_curve(points, f, sx, sy, l, r, left, right)
{
    if ((l >= r) || is_almost_equal(l, r, 1e-6)) return left;
    left = left || f(l); right = right || f(r);
    var m, middle, sc = stdMath.max(sx, sy),
        d = hypot((right[0] - left[0]), (right[1] - left[1]))*sc;
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
        if (point_line_distance(middle[0], middle[1], left[0], left[1], right[0], right[1])*sc < PIXEL_SIZE)
        {
            // no more refinement
            // return linear interpolation between left and right
            points.push(right[0], right[1]);
        }
        else
        {
            // recursively subdivide to refine samples with high enough curvature
            subdivide_curve(points, f, sx, sy, l, m, left, middle);
            subdivide_curve(points, f, sx, sy, m, r, middle, right);
        }
    }
    return right;
}
function parse_path(d, path)
{
    var c = trim(String(d)).match(COMMAND),
        p = d.split(COMMAND),
        curr = [0, 0], start = [curr[0], curr[1]],
        prev = null, hasPath = false, hasMoveTo = false;
    c && c.forEach(function(c, i) {
        var isRelative = c === c.toLowerCase(),
            pp = (trim(p[i+1] || '').match(NUMBER) || []).map(parse_number),
            p1, p2, p3, p4, tmp, implicitLine;
        switch (c.toUpperCase())
        {
            case 'M':
            implicitLine = false;
            while (2 <= pp.length)
            {
                if (implicitLine)
                {
                    p1 = [curr[0], curr[1]];
                    p2 = [
                    (isRelative ? p1[0] : 0) + pp.shift(),
                    (isRelative ? p1[1] : 0) + pp.shift(),
                    ];
                    curr[0] = p2[0];
                    curr[1] = p2[1];
                    path.lineTo(curr[0], curr[1]);
                    hasPath = true;
                }
                else
                {
                    curr[0] = (isRelative ? curr[0] : 0) + pp.shift();
                    curr[1] = (isRelative ? curr[1] : 0) + pp.shift();
                    start = [curr[0], curr[1]];
                    path.moveTo(curr[0], curr[1]);
                    hasMoveTo = true;
                }
                implicitLine = true;
            }
            prev = null;
            break;
            case 'H':
            hasPath = hasMoveTo || hasPath;
            while (1 <= pp.length)
            {
                p1 = [curr[0], curr[1]];
                p2 = [
                (isRelative ? p1[0] : 0) + pp.shift(),
                p1[1]
                ];
                curr[0] = p2[0];
                curr[1] = p2[1];
                path.lineTo(curr[0], curr[1]);
                if (hasMoveTo) hasPath = true;
                hasMoveTo = true;
            }
            prev = null;
            break;
            case 'V':
            hasPath = hasMoveTo || hasPath;
            while (1 <= pp.length)
            {
                p1 = [curr[0], curr[1]];
                p2 = [
                p1[0],
                (isRelative ? p1[1] : 0) + pp.shift()
                ];
                curr[0] = p2[0];
                curr[1] = p2[1];
                path.lineTo(curr[0], curr[1]);
                if (hasMoveTo) hasPath = true;
                hasMoveTo = true;
            }
            prev = null;
            break;
            case 'L':
            hasPath = hasMoveTo || hasPath;
            while (2 <= pp.length)
            {
                p1 = [curr[0], curr[1]];
                p2 = [
                (isRelative ? p1[0] : 0) + pp.shift(),
                (isRelative ? p1[1] : 0) + pp.shift()
                ];
                curr[0] = p2[0];
                curr[1] = p2[1];
                path.lineTo(curr[0], curr[1]);
                if (hasMoveTo) hasPath = true;
                hasMoveTo = true;
            }
            prev = null;
            break;
            case 'A':
            hasPath = true;
            hasMoveTo = true;
            while (7 <= pp.length)
            {
                tmp = {
                    start: null,
                    end: null,
                    radiusX: pp.shift(),
                    radiusY: pp.shift(),
                    angle: pp.shift(),
                    largeArc: pp.shift(),
                    sweep: pp.shift()
                };
                p1 = [curr[0], curr[1]];
                p2 = [
                (isRelative ? p1[0] : 0) + pp.shift(),
                (isRelative ? p1[1] : 0) + pp.shift()
                ];
                curr[0] = p2[0];
                curr[1] = p2[1];
                tmp.start = p1;
                tmp.end = p2;
                path.ellipse.apply(path, svgarc2ellipse(tmp.start[0], tmp.start[1], tmp.end[0], tmp.end[1], tmp.largeArc, tmp.sweep, tmp.radiusX, tmp.radiusY, tmp.angle));
            }
            prev = null;
            break;
            case 'Q':
            hasPath = true;
            hasMoveTo = true;
            while (4 <= pp.length)
            {
                p1 = [curr[0], curr[1]];
                p2 = [
                (isRelative ? p1[0] : 0) + pp.shift(),
                (isRelative ? p1[1] : 0) + pp.shift()
                ];
                p3 = [
                (isRelative ? p1[0] : 0) + pp.shift(),
                (isRelative ? p1[1] : 0) + pp.shift()
                ];
                curr[0] = p3[0];
                curr[1] = p3[1];
                path.quadraticCurveTo(p2[0], p2[1], p3[0], p3[1]);
                prev = ['Q', p1, p2, p3];
            }
            break;
            case 'T':
            hasPath = true;
            hasMoveTo = true;
            while (2 <= pp.length)
            {
                p1 = [curr[0], curr[1]];
                p3 = [
                (isRelative ? p1[0] : 0) + pp.shift(),
                (isRelative ? p1[1] : 0) + pp.shift()
                ];
                p2 = prev && 'Q' === prev[0] ? [
                2*p1[0] - prev[2][0],
                2*p1[1] - prev[2][1],
                ] : [p1[0], p1[1]];
                curr[0] = p3[0];
                curr[1] = p3[1];
                path.quadraticCurveTo(p2[0], p2[1], p3[0], p3[1]);
                prev = ['Q', p1, p2, p3];
            }
            break;
            case 'C':
            hasPath = true;
            hasMoveTo = true;
            while (6 <= pp.length)
            {
                p1 = [curr[0], curr[1]];
                p2 = [
                (isRelative ? p1[0] : 0) + pp.shift(),
                (isRelative ? p1[1] : 0) + pp.shift()
                ];
                p3 = [
                (isRelative ? p1[0] : 0) + pp.shift(),
                (isRelative ? p1[1] : 0) + pp.shift()
                ];
                p4 = [
                (isRelative ? p1[0] : 0) + pp.shift(),
                (isRelative ? p1[1] : 0) + pp.shift()
                ];
                curr[0] = p4[0];
                curr[1] = p4[1];
                path.bezierCurveTo(p2[0], p2[1], p3[0], p3[1], p4[0], p4[1]);
                prev = ['C', p1, p2, p3, p4];
            }
            break;
            case 'S':
            hasPath = true;
            hasMoveTo = true;
            while (4 <= pp.length)
            {
                p1 = [curr[0], curr[1]];
                p3 = [
                (isRelative ? p1[0] : 0) + pp.shift(),
                (isRelative ? p1[1] : 0) + pp.shift()
                ];
                p4 = [
                (isRelative ? p1[0] : 0) + pp.shift(),
                (isRelative ? p1[1] : 0) + pp.shift()
                ];
                p2 = prev && 'C' === prev[0] ? [
                2*p1[0] - prev[3][0],
                2*p1[1] - prev[3][1],
                ] : [p1[0], p1[1]];
                curr[0] = p4[0];
                curr[1] = p4[1];
                path.bezierCurveTo(p2[0], p2[1], p3[0], p3[1], p4[0], p4[1]);
                prev = ['C', p1, p2, p3, p4];
            }
            break;
            case 'Z':
            p1 = [curr[0], curr[1]],
            p2 = [start[0], start[1]];
            curr[0] = p2[0];
            curr[1] = p2[1];
            start = [curr[0], curr[1]];
            path.closePath();
            hasPath = false;
            hasMoveTo = false;
            prev = null;
            break;
        }
    });
    if (hasPath) path.moveTo(curr[0], curr[1]);
}
function wn(x, y, x1, y1, x2, y2)
{
    // orientation winding number
    return 0 > (x - x1)*(y2 - y1) - (x2 - x1)*(y - y1) ? -1 : 1;
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
function point_line_distance(x, y, x1, y1, x2, y2)
{
    var dx = x2 - x1,
        dy = y2 - y1,
        d = hypot(dx, dy)
    ;
    if (is_strictly_equal(d, 0)) return hypot(x - x1, y - y1);
    return stdMath.abs(dx*(y1 - y) - dy*(x1 - x)) / d;
}
/*function point_line_segment_distance(x, y, x1, y1, x2, y2, sx, sy)
{
    var t = 0, dx = (x2 - x1)/sx, dy = (y2 - y1)/sy,
        dx1 = (x - x1)/sx, dy1 = (y - y1)/sy,
        d = hypot(dx, dy)
    ;
    if (is_strictly_equal(d, 0)) return hypot(dx1, dy1);
    t = (dx1*dx + dy1*dy) / d;
    return 0.0 <= t && t <= 1.0 ? hypot(dx1 - t*dx, dy1 - t*dy) : INF;
}*/
function point_line_project(x, y, x1, y1, x2, y2)
{
    var dx = x2 - x1,
        dy = y2 - y1,
        dxp = x - x1,
        dyp = y - y1,
        d = dx*dxp + dy*dyp,
        l = hypot(dx, dy),
        lp = hypot(dxp, dyp),
        ll = d / l;
    return [x1 + ll * dx / l, y1 + ll * dy / l];
}
function dotp(x1, y1, x2, y2)
{
    return x1*x2 + y1*y2;
}
function crossp(x1, y1, x2, y2)
{
    return x1*y2 - y1*x2;
}
function angle(x1, y1, x2, y2)
{
    var n1 = hypot(x1, y1), n2 = hypot(x2, y2);
    if (is_strictly_equal(n1, 0) || is_strictly_equal(n2, 0)) return 0;
    return stdMath.acos(clamp(dotp(x1/n1, y1/n1, x2/n2, y2/n2), -1, 1));
}
function vector_angle(ux, uy, vx, vy)
{
    var p = crossp(ux, uy, vx, vy), a = angle(ux, uy, vx, vy);
    return (0 > p ? -1 : 1)*a;
}
function svgarc2ellipse(x1, y1, x2, y2, fa, fs, rx, ry, angle)
{
    // Step 1: simplify through translation/rotation
    var cos = angle ? stdMath.cos(angle) : 1,
        sin = angle ? stdMath.sin(angle) : 0,
        x =  cos*(x1 - x2)/2 + sin*(y1 - y2)/2,
        y = -sin*(x1 - x2)/2 + cos*(y1 - y2)/2,
        px = x*x, py = y*y, prx = rx*rx, pry = ry*ry,
        L = px/prx + py/pry;

    // correct out-of-range radii
    if (L > 1)
    {
        L = stdMath.sqrt(L);
        rx *= L;
        ry *= L;
        prx = rx*rx;
        pry = ry*ry;
    }

    // Step 2 + 3: compute center
    var M = stdMath.sqrt(stdMath.abs((prx*pry - prx*py - pry*px)/(prx*py + pry*px)))*(fa === fs ? -1 : 1),
        _cx = M*rx*y/ry,
        _cy = -M*ry*x/rx,

        cx = cos*_cx - sin*_cy + (x1 + x2)/2,
        cy = sin*_cx + cos*_cy + (y1 + y2)/2
    ;

    // Step 4: compute θ and dθ
    var theta = cmod(vector_angle(1, 0, (x - _cx)/rx, (y - _cy)/ry)),
        dtheta = vector_angle((x - _cx)/rx, (y - _cy)/ry, (-x - _cx)/rx, (-y - _cy)/ry);
    dtheta -= stdMath.floor(dtheta/TWO_PI)*TWO_PI; // % 360

    if (!fs && dtheta > 0) dtheta -= TWO_PI;
    if (fs && dtheta < 0) dtheta += TWO_PI;

    return [cx, cy, rx, ry, angle, theta, theta+dtheta, !fs];
}
function is_almost_equal(a, b, eps)
{
    return stdMath.abs(+a - b) < (eps || 1e-6);
}
function is_strictly_equal(a, b)
{
    return stdMath.abs(+a - b) < EPSILON;
}
function clamp(x, min, max)
{
    return stdMath.min(stdMath.max(x, min), max);
}
function mod(x, m, xmin, xmax)
{
    x -= m*stdMath.floor(x/m);
    if (xmin > x) x += m;
    if (xmax < x) x -= m;
    return x;
}
function cmod(x)
{
    return mod(x, TWO_PI, 0, TWO_PI);
}
function asc(a, b)
{
    var d = a[1] - b[1];
    return is_almost_equal(d, 0) ? (a[3] - b[3]) : d;
}
function parse_number(s)
{
    return parseFloat(s || '') || 0;
}
function trim(s)
{
    return s.trim();
}
function err(msg)
{
    throw new Error(msg);
}
function NOOP() {}

// export it
return Rasterizer;
});
