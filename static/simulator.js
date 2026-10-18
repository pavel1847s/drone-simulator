// ===== НАСТРОЙКИ =====
const COLS = 5;              // столбцов сетки
const ROWS = 4;              // строк сетки
const CELL_W = 100 / COLS;
const CELL_H = 100 / ROWS;
const HOUSE_W = 12;
const HOUSE_H = 14;
const HOUSE_CHANCE = 0.6;    // плотность домов
const DRONE_RADIUS = 3;      // "толщина" дрона в %
const DRONE_SPEED = 30;      // % в секунду
const WIN_DISTANCE = 4;      // % до точки B

const city = document.getElementById("city");
const drone = document.getElementById("drone");
const pointA = document.getElementById("point-a");
const pointB = document.getElementById("point-b");
const winMessage = document.getElementById("win-message");
const distanceEl = document.getElementById("distance");
const statusEl = document.getElementById("flight-status");
const restartBtn = document.getElementById("restart-button");

const droneImages = {
    front: drone.dataset.front,
    back:  drone.dataset.back,
    left:  drone.dataset.left,
    right: drone.dataset.right
};

const houseImages = [
    "/static/images/house1.jpg",
    "/static/images/house2.jpg",
    "/static/images/house3.jpg"
];

let houses = [];
let dronePos = { x: 0, y: 0 };
let targetPos = { x: 0, y: 0 };
let flying = false;
let won = false;
const keys = {};

const rand = (a, b) => a + Math.random() * (b - a);

// ===== ГЕНЕРАЦИЯ ДОМОВ =====
function generateHouses() {
    houses = [];
    // Гарантируем минимум 1 проход в каждой строке и каждом столбце
    const freeRow = Math.floor(Math.random() * ROWS);
    const freeCol = Math.floor(Math.random() * COLS);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (r === freeRow || c === freeCol) continue;   // свободная линия
            if (Math.random() > HOUSE_CHANCE) continue;     // случайная пустота

            const cx = c * CELL_W + CELL_W / 2;
            const cy = r * CELL_H + CELL_H / 2;
            houses.push({
                x: cx - HOUSE_W / 2,
                y: cy - HOUSE_H / 2,
                w: HOUSE_W,
                h: HOUSE_H
            });
        }
    }
}

// ===== ПРОВЕРКА СВОБОДНОГО МЕСТА =====
function pointFree(x, y) {
    const m = DRONE_RADIUS;
    if (x - m < 0 || x + m > 100) return false;
    if (y - m < 0 || y + m > 100) return false;
    for (const h of houses) {
        if (x + m > h.x && x - m < h.x + h.w &&
            y + m > h.y && y - m < h.y + h.h) return false;
    }
    return true;
}

function findFreePoint() {
    for (let i = 0; i < 500; i++) {
        const x = rand(5, 95), y = rand(5, 95);
        if (pointFree(x, y)) return { x, y };
    }
    return { x: 50, y: 50 };
}

function findTargetFarFrom(start) {
    for (let i = 0; i < 800; i++) {
        const p = findFreePoint();
        if (Math.hypot(p.x - start.x, p.y - start.y) > 40) return p;
    }
    return findFreePoint();
}

// ===== ОТРИСОВКА ДОМОВ =====
function renderHouses() {
    city.querySelectorAll(".house").forEach(el => el.remove());
    for (const h of houses) {
        const img = document.createElement("img");
        img.className = "house";
        img.src = houseImages[Math.floor(Math.random() * houseImages.length)];
        img.style.left = h.x + "%";
        img.style.top = h.y + "%";
        img.style.width = h.w + "%";
        img.style.height = h.h + "%";
        city.insertBefore(img, city.firstChild);
    }
}

// ===== ДВИЖЕНИЕ =====
function update(dt) {
    if (won || !flying) return;

    let dx = 0, dy = 0;
    if (keys["KeyW"] || keys["ArrowUp"])    dy -= 1;
    if (keys["KeyS"] || keys["ArrowDown"])  dy += 1;
    if (keys["KeyA"] || keys["ArrowLeft"])  dx -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) dx += 1;

    if (!dx && !dy) return;

    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;

    const step = DRONE_SPEED * dt;
    const nx = dronePos.x + dx * step;
    const ny = dronePos.y + dy * step;

    // Раздельные оси — можно скользить вдоль стен
    if (pointFree(nx, dronePos.y)) dronePos.x = nx;
    if (pointFree(dronePos.x, ny)) dronePos.y = ny;

    updateDroneImage(dx, dy);
    updateDronePosition();
    checkWin();
}

function updateDroneImage(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
        drone.src = dx > 0 ? droneImages.right : droneImages.left;
    } else {
        drone.src = dy < 0 ? droneImages.back : droneImages.front;
    }
}

function updateDronePosition() {
    drone.style.left = dronePos.x + "%";
    drone.style.top = dronePos.y + "%";
    const d = Math.hypot(dronePos.x - targetPos.x, dronePos.y - targetPos.y);
    distanceEl.textContent = d.toFixed(1) + " %";
}

function checkWin() {
    const d = Math.hypot(dronePos.x - targetPos.x, dronePos.y - targetPos.y);
    if (d < WIN_DISTANCE) {
        won = true;
        flying = false;
        statusEl.textContent = "ЦЕЛЬ ДОСТИГНУТА";
        winMessage.classList.add("visible");
    }
}

// ===== НОВАЯ ИГРА =====
function newGame() {
    won = false;
    flying = false;
    winMessage.classList.remove("visible");
    statusEl.textContent = "НА ЗЕМЛЕ";

    generateHouses();
    renderHouses();

    dronePos = findFreePoint();
    targetPos = findTargetFarFrom(dronePos);

    pointA.style.left = dronePos.x + "%";
    pointA.style.top = dronePos.y + "%";
    pointB.style.left = targetPos.x + "%";
    pointB.style.top = targetPos.y + "%";

    updateDronePosition();
    drone.src = droneImages.back;
}

// ===== ПРОБЕЛ: ВЗЛЁТ/ПОСАДКА =====
function toggleFlight() {
    if (won) return;
    flying = !flying;
    statusEl.textContent = flying ? "В ПОЛЁТЕ" : "НА ЗЕМЛЕ";
    // Визуальный индикатор: на земле дрон чуть меньше
    drone.style.transform = flying
        ? "translate(-50%, -50%) scale(1)"
        : "translate(-50%, -50%) scale(0.85)";
}

// ===== КЛАВИШИ =====
document.addEventListener("keydown", e => {
    keys[e.code] = true;

    if (e.code === "KeyR") newGame();
    if (e.code === "Space") toggleFlight();

    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener("keyup", e => keys[e.code] = false);
restartBtn.addEventListener("click", newGame);

// ===== ЦИКЛ =====
let lastTime = performance.now();
function loop(t) {
    const dt = Math.min((t - lastTime) / 1000, 0.05);
    lastTime = t;
    update(dt);
    requestAnimationFrame(loop);
}

newGame();
requestAnimationFrame(loop);
