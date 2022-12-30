'use strict';

// Vector helpers
const unit = (angle) => { return { x: Math.cos(angle), y: Math.sin(angle) } };
const scale = (v, c) => { return { x: v.x * c, y: v.y * c } };
const add = (v1, v2) => { return { x: v1.x + v2.x, y: v1.y + v2.y } };
const dot = (v1, v2) => v1.x*v2.x + v1.y*v2.y;
const neg = (v) => scale(v, -1);
const mag = (v) => dot(v, v);
const sub = (v1, v2) => add(v1, neg(v2));
function projection_rejection(vector, onto) {
    // ONTO is a unit vector already
    const withMag = dot(vector, onto);
    const with_ = scale(onto, withMag);
    const perp = sub(vector, with_);
    return [with_, perp]
}
const cross2d = (v1, v2) => (v1.x*v2.y - v1.y*v2.x); // Determinant. Points either into or out of the screen.

// Random helpers
const randomFloat = (a, b) => Math.random()*(b-a)+a;
const randomInt = (a,b) => Math.floor(randomFloat(a, b+1));
const randomChoice = (a) => a[randomInt(0, a.length-1)];
const randomPosition = (w, h) => { return {x: randomFloat(0, w), y: randomFloat(0, h)} };
const randomAngle = () => randomFloat(0, 2*Math.PI);
const randomColor = () => `#${Math.floor(Math.random()*16777215).toString(16)}`;
const randomVelocity = (speed) => scale(unit(randomAngle()), speed);


// Print debug info about an object
function debug(o, g, ctx) {
    // Print in red text: position, velocity
    let text = `${o.constructor.name}`;
    //if (o.state.position) text += `\nx: ${Math.floor(o.state.position.x)} y: ${Math.floor(o.state.position.y)}`;
    if (o.state.velocity) text += `\ndx: ${Math.floor(o.state.velocity.x)} dy: ${Math.floor(o.state.velocity.y)}`;
    if (o.state.angle) text += `\nθ: ${Math.floor(o.state.angle)} dθ: ${Math.floor(o.state.angleVelocity)}`;

    ctx.fillStyle = "red";
    ctx.textAlign = "Center"
    ctx.font = "30px";
    let yOffset = 0;
    const offset = o.radius ? o.radius + 2 : 50;
    for (let line of text.split("\n")) {
        ctx.fillText(line, o.state.position.x + offset, o.state.position.y - offset + yOffset);
        yOffset += 15;
    }
}

const GRAVITY = 980; // + is down
const INELASTIC = -0.7; // Model inelastic collisions as a 30% damper
// Make an object affected by gravity
function gravity(o, g) {
    o.state.velocity.y += g.elapsed * GRAVITY;
}
// todo: water currents

// Make an object obey inertia
function drift(o, g) {
    if (o.state.position) {
        o.state.position.x += g.elapsed * o.state.velocity.x;
        o.state.position.y += g.elapsed * o.state.velocity.y;
    }
    if (o.state.angle) {
        o.state.angle += g.elapsed * o.state.angleVelocity;
        o.state.angle %= 2* Math.PI;
    }
}
// Make a class bounce off the edges (with perfect elasticity)
function bounce(o, g) {
    // todo?: Actual collision box instead of origin point vs edge
    if (o.state.position.x < 0) {
        o.state.position.x *= -1;
        o.state.velocity.x *= INELASTIC;
    } else if (o.state.position.x >= g.w) {
        o.state.position.x = 2*g.w - o.state.position.x;
        o.state.velocity.x *= INELASTIC;
    }
    // TODO: Fix vibration at the bottom of the screen under gravity
    if (o.state.position.y < 0) {
        o.state.position.y *= -1;
        o.state.velocity.y *= INELASTIC;
    } else if (o.state.position.y >= g.h) {
        o.state.position.y = 2*g.h - o.state.position.y;
        o.state.velocity.y *= INELASTIC;
    }
}
// TODO: Fix small orbits

// TODO: Some connections should be draggable
class Connection {
    constructor(parent, name, fs) {
        this.parent = parent; // Debug only atm
        this.name = name; // Debug only atm
        this.fs = fs;
    }
    get position() { return this.fs.position(); }
    get velocity() { return this.fs.velocity(); }
    applyMomentum(v) { return this.fs.applyMomentum(v); }
    attach(otherConnection, k, b) {
        window.game.add(new Spring(this, otherConnection, k, b));
    }
}

class Sphere {
    // Weight

    // State
    // Linear position -- Len, Len, Len
    // Linear velocity -- Len/s, Len/s, Len/s

    constructor(radius, color, state) {
        const SPHERE_DENSITY = 0.001; // Per pixel
        this.radius = radius;
        this.mass = Math.PI * radius * radius * SPHERE_DENSITY;
        this.color = color;
        this.state = state;
        this.connections = {
            center: new Connection(this, "center", {
                position: () => this.state.position,
                velocity: () => this.state.velocity,
                applyMomentum: this.applyMomentum.bind(this),
            })
        };
    }
    tick(g) {
        drift(this, g);
        //gravity(this, g);
        bounce(this, g);
    }
    render(g, ctx) {
        ctx.beginPath();
        ctx.arc(
            this.state.position.x,
            this.state.position.y,
            this.radius,
            0, 2*Math.PI,
            false
        );
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = Math.min(5, this.radius * 0.2);
        ctx.stroke();
        debug(this, g, ctx);

        ctx.fillStyle = "#000";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
    }
    applyMomentum(v) {
        this.state.velocity.x += v.x / this.mass;
        this.state.velocity.y += v.y / this.mass;
        if (!this.printedNaN) {
            this.xs ||= [];
            this.xs.push([this.state.position.x, this.state.velocity.x, v.x]);
            if (isNaN(this.state.velocity.x)) {
                this.printedNaN = true;
                console.log(this.xs);
            }
                
        }
    }
}

class Spring { // Connect two connection points
    constructor(c1, c2, k, b) {
        this.c1 = c1;
        this.c2 = c2;
        this.k = k || -100; // Spring constant (how hard spring pulls)
        this.b = b || 0.2; // Damping factor (how fast spring oscillation dies)
    }
    tick(g) {
        const deltaPos = sub(this.c1.position, this.c2.position);
        const deltaVel = sub(this.c1.velocity, this.c2.velocity);

        const force = add(scale(deltaPos, this.k), scale(deltaVel, -this.b)); // in kg * m / s
        const momentum = scale(force, g.elapsed); // in kg * m / s / s
        this.c1.applyMomentum(momentum);
        this.c2.applyMomentum(neg(momentum));
    }
    render(g, ctx) { // A dashed line
        const p1 = this.c1.position;
        const p2 = this.c2.position;

        ctx.beginPath();
        ctx.setLineDash([5, 15]);
        ctx.strokeStyle = "#0000ff";
        ctx.lineWidth = 2;
        
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
    }
}

class Stick {
    // Treated as a line, not a thin rectangle.

    // State
    // Angular position -- Rad
    // Angular velocity -- Rad/s
    // Absolute position -- Len, Len, Len -- of center of mass
    // Linear velocity -- Len/s, Len/s, Len/s

    constructor(length, color, state) {
        const LINEAR_DENSITY = 1;
        this.mass = length * LINEAR_DENSITY;
        this.length = length;
        this.radius = length / 2;
        this.moment = this.mass * (this.radius*this.radius);
        this.color = color;
        this.state = state;
        this.connections = {
            a: this.makeConnection("a", -this.radius),
            b: this.makeConnection("b", this.radius),
            center: this.makeConnection("center", 0),
        };
    }
    tick(g) {
        drift(this, g);
        bounce(this, g);
    }
    render(g, ctx) {
        const p1 = this.connections.a.position;
        const p2 = this.connections.b.position;

        ctx.beginPath();
        ctx.strokeStyle = "#ff00ff";
        ctx.lineWidth = 2;
        
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        debug(this, g, ctx);
        ctx.stroke();

        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1;
    }
    makeConnection(name, offset) {
        return new Connection(this, name, {
            position: () => this.offsetPos(offset),
            velocity: () => this.offsetVel(offset),
            applyMomentum: (f) => this.applyMomentum(offset, f)
        });
    }
    applyMomentum(offset, v) {
        // Calculate the portion of the force which becomes linear movement, and the part that becomes torque

        // Portion along the stick, portion perpendictular to the stick
        const lineDir = unit(this.state.angle);
        const [along, perp] = projection_rejection(v, lineDir);

        this.state.velocity = add(this.state.velocity, scale(v, 1.0 / this.mass));
        this.state.angleVelocity += cross2d(perp, lineDir) * -offset / this.moment;
    }
    offsetPos(offset) {
        return add(this.state.position, scale(unit(this.state.angle), offset));
    }
    offsetVel(offset) {
        const angleVel = scale(unit(this.state.angle+Math.PI/2), this.state.angleVelocity);
        return add(this.state.velocity, angleVel);
    }
}

class Game {
    constructor(canvas) {
        this.lastTick = Date.now() / 1000.0;
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.objects = [];
    }
    add(o) {
        this.objects.push(o);
    }
    tick() {
        const now = Date.now() / 1000.0;
        const elapsed = Math.min(now - this.lastTick, 1.0/30);
        this.lastTick = now;
        this.g = { elapsed, w: this.canvas.width, h: this.canvas.height };

        for (let object of this.objects) {
            object.tick(this.g);
        }
    }
    render() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let object of this.objects) {
            object.render(this.g, this.context);
        }
    }
    loop() {
        const start = Date.now();
        let frames = 0;
        setInterval(() => {
            this.tick();
            this.render();
            $(".objects").text(this.objects.length);
            $(".fps").text(`${Math.floor(frames++ * 1000 / (Date.now()-start))}`);
        }, (1000/60.0));
    }
}


function main() {
    const canvas = document.getElementById("game");
    const game = window.game = new Game(canvas);
    const w = canvas.width = $(canvas).width();
    const h = canvas.height = $(canvas).height();
    const speed=100;
    const spheres = [];
    const lines = [];
    for (let i=0; i<12; i++) {
        spheres.push(new Sphere(
            randomInt(10, 50),
            randomColor(),
            {
                position: randomPosition(w, h),
                velocity: randomVelocity(speed),
            }
        ));
    }
    for (let i=0; i<4; i++) {
        lines.push(new Stick(
            randomInt(50, 100),
            randomColor(),
            {
                position: randomPosition(w, h),
                velocity: randomVelocity(speed),
                angle: randomAngle(),
                angleVelocity: randomFloat(-1, 1),
            }
        ));
    }
    for (let s of spheres) game.add(s);
    for (let s of lines) game.add(s);

    for (let i=0,j=0; i<12; i+=3,j++) {
        const s1 = spheres[i];
        const s2 = spheres[i+1];
        const s3 = spheres[i+2];
        const l1 = lines[j];
        s1.connections.center.attach(l1.connections.a, -1000, 0.9)
        l1.connections.b     .attach(s2.connections.center, -1000, 0.9);
        s2.connections.center.attach(s3.connections.center, -100);
    }

    game.loop();
}

(function(fn) { if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(fn, 1); else document.addEventListener("DOMContentLoaded", fn); })(main);
