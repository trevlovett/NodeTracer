var Camera = function() {
    this.position = [-3.3002711295718457,0.2,0.690178281791961]
    this.lookAt = [-1, 0.5, 0];
}

// Based on AsciiTracer : https://github.com/trevlovett/AsciiTracer
var AsciiTracer = function(width, height)
{
        this.palette = ' .:;!|?1OC&@XEBW#\u2591\u2591\u2591\u2592\u2592\u2592\u2592\u2592\u2593\u2593\u2593\u2593\u2593\u2588'.split('').reverse();
        this.plen = this.palette.length - 1;
        this.width = width;
        this.height = height;
        this.xincr = 0.5 / width;
        this.yincr = 0.5 / height;
        this.interval = null;
        this.vel = [0, 0, 0];
        this.camera = new Camera();

        var ylt = this.ylut = [];
        var xlt = this.xlut = [];
        var rows = this.rows = [];
        var html = this.html = [];
        var idx = 1;
        var r_idx = 0;
        

        for(var y = 0; y < height; y++)
        {
                var r = rows[r_idx] = [];

                for(var x = 0; x < width; x++)
                        r[x] = 0.0;

                r_idx++;
        }

        var height_inv = 1.0 / height;
        var width_inv = 1.0 / width;
        var aspect_ratio = width / height;

        for(var y = 0; y < height; y++)
                ylt[y] = (-y * height_inv) + 0.5;

        for (var x = 0; x < width; x++)
                xlt[x] = ((x * width_inv) - 0.5) * aspect_ratio;

}

AsciiTracer.prototype.writeImage = function(scene, width, height)
{
        var html = this.html;
        var idx = 1;
        var mb = this.motion_blur_amount;
        var mb_inv = 1.0 - mb;
        var xlut = this.xlut;
        var ylut = this.ylut;
        var yincr = this.yincr;
        var xincr = this.xincr;
        var p = this.palette;
        var plen = this.plen;
        var w = this.width, h = this.height;
        var rows = this.rows;
        var aa = this.antialias;
        var div6 = 1.0 / 6.0;

        for(var y = 0; y < h; y++)
        {
                var yl = ylut[y];
                var r = rows[y];

                for(var x = 0; x < w; x++)
                {
                        var xl = xlut[x];
                        var v = this.sample(scene, xl, yl);

                        if(aa)
                        {
                                var t = this.sample(scene, xl, yl - yincr);

                                t += this.sample(scene, xl - xincr, yl + yincr);
                                t += this.sample(scene, xl + xincr, yl + yincr);

                                v = (v * 0.5) + (t * div6);
                        }

                        if(mb > 0)
                                v = (r[x] * mb) + (v * mb_inv);

                        var c = Math.round(v * plen);

                        html[idx++] = c < plen ? p[c] : ' ';
                        r[x] = v;
                }
                html[idx] = '\n';

                idx++;
        }
        return html.join('');
}

AsciiTracer.prototype.setAntiAlias = function(amount) {
        this.antialias = amount > 0.0;
}

AsciiTracer.prototype.setMotionBlur = function(amount) {
        this.motion_blur_amount = (amount < 0.0 ? 0.0 : amount > 1.0 ? 1.0 : amount) * 0.95;
}

AsciiTracer.prototype.vectorAdd = function(v1, v2) {
        return [v1[0]+v2[0], v1[1]+v2[1], v1[2]+v2[2]];
}

AsciiTracer.prototype.vectorSub = function(v1, v2) {
        return [v1[0]-v2[0], v1[1]-v2[1], v1[2]-v2[2]];
}

AsciiTracer.prototype.vectorScale = function(v1, x) {
        return [v1[0]*x, v1[1]*x, v1[2]*x];
}

AsciiTracer.prototype.vectorCross3 = function(v1, v2) {
        return [v1[1] * v2[2] - v1[2] * v2[1],
                v1[2] * v2[0] - v1[0] * v2[2],
                v1[0] * v2[1] - v1[1] * v2[0]];
}

AsciiTracer.prototype.vectorLength = function(v1) {
        return Math.sqrt((v1[0]*v1[0]) + (v1[1]*v1[1]) + (v1[2]*v1[2]));
}

AsciiTracer.prototype.vectorNormalize = function(v1) {
        var d = this.vectorLength(v1);
        var fact = 1.0;

        if(d > 0.0)
                fact /= d;

        return [v1[0]*fact, v1[1]*fact, v1[2]*fact];
}

AsciiTracer.prototype.intersectPlane = function(start, dir, plane) {
        var n = plane.normal;
        var denom = dir[0]*n[0] + dir[1]*n[1] + dir[2]*n[2];

        if(denom == 0)
                return;

        var res = plane.offset - (start[0]*n[0] + start[1]*n[1] + start[2]*n[2]) / denom;

        if(res <= 0)
                return;

        return res;
}

AsciiTracer.prototype.intersectSphere = function(start, dir, sphere) {
        var y = [];

        y[0] = start[0] - sphere.centre[0];
        y[1] = start[1] - sphere.centre[1];
        y[2] = start[2] - sphere.centre[2];

        var beta = dir[0]*y[0] + dir[1]*y[1] + dir[2]*y[2];
        var gamma = y[0]*y[0] + y[1]*y[1] + y[2]*y[2] - sphere.radius2;
        var descriminant = beta * beta - gamma;

        if (descriminant <= 0)
                return;

        var sqrt = Math.sqrt(descriminant);

        return -beta - sqrt > 0 ? -beta - sqrt : -beta + sqrt > 0 ? -beta + sqrt : null;
}

AsciiTracer.prototype.sample = function (scene, x, y) {
        var cam = this.camera;
        var cf = cam.forward, cr = cam.right, cu = cam.up;
        var rayDir = [cf[0] + x * cr[0] + y * cu[0],
                      cf[1] + x * cr[1] + y * cu[1],
                      cf[2] + x * cr[2] + y * cu[2]];

        var d = this.vectorLength(rayDir);
        var fact = 1.0;

        if(d > 0.0)
                fact /= d;

        rayDir[0] *= fact;
        rayDir[1] *= fact;
        rayDir[2] *= fact;

        return this.traceRay(scene, cam.position, rayDir, null, 1, 0);
}

AsciiTracer.prototype.shade = function(pos, dir, shape, scene, contrib, level) {
        var luma = null;
        var reflect = null;
        var smooth = null;

        if(shape.surface == 0)
        {
                luma = 1;
                reflect = 0.63;
                smooth = 100;
        }
        else if(Math.abs(pos[0]) < 10 && Math.abs(pos[2]) < 10 && (Math.round(pos[0]) + Math.round(pos[2])) % 2 == 0)
        {
                luma = 1;
                reflect = 0;
                smooth = 0;
        }
        else
        {
                luma = 0;
                reflect = 0;
                smooth = 0;
        }

        var norm = shape.type == 0 ? shape.normal : shape.type == 1 ? this.vectorScale(this.vectorSub(pos, shape.centre), 1.0 / shape.radius) : [0, 0, 0];
        var dirDotNorm = (dir[0] * norm[0]) + (dir[1] * norm[1]) + (dir[2] * norm[2]);
        var _2dirDotNorm = 2 * dirDotNorm;

        contrib = contrib * reflect;

        norm = dirDotNorm > 0 ? -norm: norm;

        var reflectDir = [];

        reflectDir[0] = dir[0] - (_2dirDotNorm * norm[0]);
        reflectDir[1] = dir[1] - (_2dirDotNorm * norm[1]);
        reflectDir[2] = dir[2] - (_2dirDotNorm * norm[2]);

        var light = 0;
        var lights = scene.lights;

        for(var i = 0; i < lights.length; i++)
        {
                var lLuma = lights[i].luma;
                var lPos = lights[i].position;
                var lDir = [lPos[0] - pos[0],
                            lPos[1] - pos[1],
                            lPos[2] - pos[2]];

                var lDist = Math.sqrt((lDir[0] * lDir[0]) + (lDir[1] * lDir[1]) + (lDir[2] * lDir[2]));
                var fact = 1.0;

                if(lDist > 0.0)
                {
                        fact /= lDist;

                        lDir[0] *= fact;
                        lDir[1] *= fact;
                        lDir[2] *= fact;
                }

                var illum = (lDir[0] * norm[0]) + (lDir[1] * norm[1]) + (lDir[2] * norm[2]);

                if(illum > 0)
                        light += lLuma * luma * illum;

                if(reflect > 0)
                {
                        var spec = (lDir[0] * reflectDir[0]) + (lDir[1] * reflectDir[1]) + (lDir[2] * reflectDir[2]);

                        if(spec > 0)
                                light += lLuma * Math.pow(spec, smooth) * reflect;
                }
        }

        if (contrib > 0.1)
                light += reflect * this.traceRay(scene, pos, reflectDir, shape, contrib, level);

        return light;
},

AsciiTracer.prototype.testRay = function (scene, src, dir, curShape) {
        var res = [];
        var shp = scene.shapes;

        for(var i = 0; i < shp.length; i++)
        {
                var shape = shp[i];

                if(shape.id == curShape.id)
                        continue;

                var inter = scene.shape_funcs[shape.type](src, dir, shape);

                if(inter != null)
                        res.push(inter);
        }

        return res;
}

AsciiTracer.prototype.traceRay = function (scene, src, dir, ignore, contrib, level) {
        level++;

        if(level > 4)
                return;

        var tmp = null;
        var shp = scene.shapes;
        var sf = scene.shape_funcs = scene.shape_funcs;

        for(var i = 0; i < shp.length; i++)
        {
                var shape = shp[i];

                if(ignore && ignore.id == shape.id)
                        continue;

                var dist = sf[shape.type](src, dir, shape);

                if(dist != null && (tmp == null || dist < tmp[0]))
                        tmp = [dist, this.vectorAdd(src, this.vectorScale(dir, dist)), shape];
        }

        if(tmp != null)
                return this.shade(tmp[1], dir, tmp[2], scene, contrib, level);

        return scene.background;
}

AsciiTracer.prototype.traceTo = function(scene) {
        var cam = this.camera;
        cam.lookAt = this.vectorAdd(cam.position, [1.0, 0.0, 0.0]);
        cam.forward = this.vectorNormalize(this.vectorSub(cam.lookAt, cam.position));
        cam.right = this.vectorNormalize(this.vectorCross3(cam.forward, [0, -1, 0]));
        cam.up = this.vectorCross3(cam.forward, cam.right);

        // Precalc radius**2 for all spheres
        for(var i=0; i<scene.shapes.length; i++)
        {
                var s = scene.shapes[i];

                if(s.type == 1)
                        s.radius2 = s.radius * s.radius;
        }

        scene.shape_funcs = [this.intersectPlane, this.intersectSphere];
        return this.writeImage(scene, this.width, this.height);
}

var scene = {
        background: 0.6,

        shapes: [
                {    // checkerboard plane
                        id:       0,
                        type:     0,  // plane
                        offset:   0,
                        surface:  1, // checkerboard
                        normal: [0, 1, 0]
                },

                {   // big sphere
                        id:       1,
                        type:     1, // sphere
                        radius:   1,
                        surface:  0, // shiny
                        centre:   [0, 1.0, 0],
                },

                {    // sphere
                        id:       2,
                        type:     1,
                        radius:   0.5,
                        surface:  0, // shiny
                        centre:   [-1, 0.5, 1.5],
                },
                {    // sphere
                        id:       2,
                        type:     1,
                        radius:   0.5,
                        surface:  0, // shiny
                        centre:   [-2, 1.5, 1.5],
                },
        ],

       
        lights: [
                {
                        position: [0.0, 7.0, 0.0],
                        luma: 1.0,
                }
        ]
};

var http = require('http');
var url = require('url');

// for now map tracers by IP. TODO; use sessions
var tracers = {};

// boilerplate, styling + code to catch key signals and make the corresponding requests
var boiler = "<!DOCTYPE html><html xmlns='http://www.w3.org/1999/xhtml' xml:lang='en' lang='en'><head><meta http-equiv='Content-Type' content='text/html; charset=utf-8'/><style type='text/css'> #screen { font-family: Courier New, Monospace; font-size: 6pt; font-weight: normal; position: relative; top: -4px; }</style><script type='text/javascript' src='http://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js'></script><script type='text/javascript'>$(document).keydown(function (e) { var keyCode = e.keyCode || e.which, arrow = {left: 37, up: 38, right: 39, down: 40 }; switch(keyCode) { case arrow.left: $.get('/?dirx=0&diry=0&dirz=0.2'); break; case arrow.right: $.get('/?dirx=0&diry=0&dirz=-0.2'); break; case arrow.up: $.get('/?dirx=0.2&diry=0.0&dirz=0.0'); break; case arrow.down: $.get('/?dirx=-0.2&diry=0&dirz=0'); break; } });</script></head><body><div id='screen'></div>";

var deccel = 0.93;

function render(res, tracer) {
    var dirty = true;
    tracer.interval = setInterval(function() {
        if (dirty) {
            image = tracer.traceTo(scene)
            // TODO JSON.stringify really needed?
            comet_script = "<script type='text/javascript'>document.getElementById('screen').innerHTML = '<pre>'+" + JSON.stringify(image) + "+ '</pre>';</script>";
            res.write(comet_script);
        }
            
        tracer_mag = tracer.vel[0]*tracer.vel[0]+tracer.vel[1]*tracer.vel[1]+tracer.vel[2]*tracer.vel[2]; 
        if (tracer_mag < 0.0005) {
            dirty = false;
        }
        else { 
            // update vel, camera pos
            tracer.vel = tracer.vectorScale(tracer.vel, deccel);
            tracer.camera.position = tracer.vectorAdd(tracer.camera.position, tracer.vel);
            console.log("cam position = " + tracer.camera.position);
            dirty = true;
        }
    }, 20); // adjust as needed
}

http.createServer(function (req, res) {
    var ip = req.connection.remoteAddress;
    var query = url.parse(req.url, true).query;
    console.log(query);

    if ('launch' in query) {
        tracers[ip] = new AsciiTracer(300, 100);

        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(boiler);

        // enter render 'loop'
        render(res, tracers[ip]);
    }
    else if ('dirx' in query && 'diry' in query && 'dirz' in query) {
        tracer = tracers[ip];
        if (tracer) {
            tracer.vel = [parseFloat(query['dirx']), parseFloat(query['diry']), parseFloat(query['dirz'])];
            console.log("direction change = " + tracer.vel);
        }
        res.end("velocity changed");
    }
    else {
        res.end("Unexpected query params.");
    }

}).listen(1337, "127.0.0.1");

console.log('Server running at http://127.0.0.1:1337/?launch=true');
