const game = document.getElementById("game");
const road = document.getElementById("road");
const mycar = document.getElementById("mycar");
const scoreEl = document.getElementById("score");
const startBtn = document.getElementById("start");

const socket = new WebSocket("ws://localhost:8080");

const lanes = [40, 140, 240];
const MAX_ENEMIES = 2;

let running = false;
let score = 0;
let speed = 4;
let carLane = 1;
let frame = 0;

mycar.style.left = lanes[carLane] + "px";

/* ================= ENEMIGOS ================= */

class Enemy {
    constructor(el) {
        this.el = el;
        this.active = false;
        this.lane = 0;
        this.y = -150;
    }

    spawn(used) {
        const free = lanes.filter(l => !used.includes(l));
        if (!free.length) return;

        this.lane = lanes.indexOf(
            free[Math.floor(Math.random() * free.length)]
        );
        this.y = -150;
        this.active = true;

        this.el.style.left = lanes[this.lane] + "px";
        this.el.style.top = this.y + "px";
        this.el.style.display = "block";
    }

    update() {
        if (!this.active) return;

        this.y += speed;
        this.el.style.top = this.y + "px";

        if (this.y > 600) {
            this.reset();
            score++;
        }
    }

    reset() {
        this.active = false;
        this.el.style.display = "none";
    }
}

const enemies = [
    new Enemy(document.getElementById("enemy1")),
    new Enemy(document.getElementById("enemy2")),
    new Enemy(document.getElementById("enemy3"))
];

/* ================= GHOST CAR ================= */

class GhostCar {
    constructor() {
        this.lane = 1;
        this.el = document.createElement("div");
        this.el.innerHTML = `<img src="car_remote.png" width="80" style="opacity:0.4">`;
        this.el.style.position = "absolute";
        this.el.style.bottom = "120px";
        this.el.style.left = lanes[this.lane] + "px";
        game.appendChild(this.el);
    }

    think() {
        const danger = [false, false, false];

        enemies.forEach(e => {
            if (!e.active) return;
            if (e.y > 200 && e.y < 420) {
                danger[e.lane] = true;
            }
        });

        if (!danger[this.lane]) return;

        const safe = danger
            .map((d, i) => (!d ? i : null))
            .filter(v => v !== null);

        if (safe.length) {
            this.lane = safe[Math.floor(Math.random() * safe.length)];
        }
    }

    update() {
        this.think();
        this.el.style.left = lanes[this.lane] + "px";
    }
}

const ghost = new GhostCar();

/* ================= INPUT JUGADOR ================= */

window.addEventListener("keydown", e => {
    if (!running) return;

    if (e.key === "ArrowLeft" && carLane > 0) carLane--;
    if (e.key === "ArrowRight" && carLane < 2) carLane++;

    mycar.style.left = lanes[carLane] + "px";

    socket.send(JSON.stringify({
        type: "INPUT",
        dir: e.key === "ArrowLeft" ? "LEFT" : "RIGHT"
    }));
});

/* ================= SPAWN CONTROLADO ================= */

function spawnEnemies() {
    const active = enemies.filter(e => e.active);
    if (active.length >= MAX_ENEMIES) return;

    const used = active.map(e => lanes[e.lane]);
    const e = enemies.find(x => !x.active);
    if (e) e.spawn(used);
}

/* ================= LOOP ================= */

startBtn.onclick = () => {
    running = true;
    startBtn.style.display = "none";
    gameLoop();
};

function gameLoop() {
    if (!running) return;

    frame++;
    road.style.top = (parseInt(road.style.top || "-200%") + speed) + "px";
    if (parseInt(road.style.top) >= 0) road.style.top = "-200%";

    if (frame % 90 === 0) spawnEnemies();
    if (frame % 300 === 0) speed += 0.4;

    enemies.forEach(e => {
        e.update();
        if (collision(e, mycar)) endGame();
    });

    ghost.update();

    scoreEl.innerText = "Score: " + score;

    sendState();
    requestAnimationFrame(gameLoop);
}

/* ================= UTILIDADES ================= */

function collision(enemy, player) {
    if (!enemy.active) return false;

    const r1 = enemy.el.getBoundingClientRect();
    const r2 = player.getBoundingClientRect();

    return !(
        r1.bottom < r2.top ||
        r1.top > r2.bottom ||
        r1.right < r2.left ||
        r1.left > r2.right
    );
}

function endGame() {
    running = false;
    alert("GAME OVER");
    location.reload();
}

function sendState() {
    if (socket.readyState === 1) {
        socket.send(JSON.stringify({
            type: "STATE",
            lane: carLane,
            score,
            speed
        }));
    }
}
