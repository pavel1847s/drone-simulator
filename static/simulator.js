// ===== НАСТРОЙКИ =====
const DRONE_RADIUS = 2.5;   // Радиус дрона
const DRONE_SPEED = 30;
const WIN_DISTANCE = 4;

const city = document.getElementById("city");
const drone = document.getElementById("drone");
const pointA = document.getElementById("point-a");
const pointB = document.getElementById("point-b");
const winMessage = document.getElementById("win-message");
const distanceEl = document.getElementById("distance");
const statusEl = document.getElementById("flight-status");
const restartBtn = document.getElementById("restart-button");
const explosionOverlay = document.getElementById("explosion-overlay");

const urlParams = new URLSearchParams(window.location.search);
const droneSerial = urlParams.get('serial') || '12345';
const droneBattery = urlParams.get('battery') || '75';

const serialDisplay = document.getElementById("drone-serial-display");
const batteryDisplay = document.getElementById("drone-battery-display");
if (serialDisplay) serialDisplay.textContent = droneSerial;
if (batteryDisplay) batteryDisplay.textContent = droneBattery + "%";

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
let startPos = { x: 0, y: 0 };
let flying = false;
let won = false;
const keys = {};

const rand = (a, b) => a + Math.random() * (b - a);

// ===== ПРОВЕРКА СТОЛКНОВЕНИЙ ДЛЯ ДРОНА =====
function pointFree(x, y) {
    const m = DRONE_RADIUS;
    if (x - m < 0 || x + m > 100) return false;
    if (y - m < 0 || y + m > 100) return false;

    const PAD_X = 3.5; // Отступ сбоку (чтобы дрон не задевал прозрачные пиксели PNG)
    const PAD_Y = 3;   // Отступ сверху/снизу

    for (const h of houses) {
        if (x + m > h.x + PAD_X && x - m < h.x + h.w - PAD_X &&
            y + m > h.y + PAD_Y && y - m < h.y + h.h - PAD_Y) return false;
    }
    return true;
}

// ===== ПРОВЕРКА ПЕРЕСЕЧЕНИЯ ДОМОВ =====
// Эта функция не дает домам спавниться друг на друге
function isHouseOverlapping(x, y, w, h) {
    const padding = -1; // Небольшое перекрытие (дома могут слегка касаться)
    for (const other of houses) {
        if (x < other.x + other.w + padding &&
            x + w > other.x - padding &&
            y < other.y + other.h + padding &&
            y + h > other.y - padding) {
            return true;
        }
    }
    return false;
}

function findFreePoint() {
    for (let i = 0; i < 500; i++) {
        const x = rand(5, 95), y = rand(5, 95);
        if (pointFree(x, y)) return { x, y };
    }
    return { x: 50, y: 50 };
}

function findTargetFarFrom(start) {
    for (let i = 0; i < 100; i++) {
        const p = findFreePoint();
        if (Math.hypot(p.x - start.x, p.y - start.y) > 35) return p;
    }
    return findFreePoint();
}

// ===== ПРОВЕРКА ПУТИ (BFS) =====
function checkPath(start, end) {
    const step = 2;
    const visited = new Set();
    const queue = [{ x: start.x, y: start.y }];
    visited.add(`${Math.floor(start.x/step)},${Math.floor(start.y/step)}`);
    
    const endX = Math.floor(end.x/step);
    const endY = Math.floor(end.y/step);
    const dirs = [[1,0], [-1,0], [0,1], [0,-1]];
    
    while (queue.length > 0) {
        const p = queue.shift();
        const px = Math.floor(p.x/step);
        const py = Math.floor(p.y/step);
        
        if (Math.abs(px - endX) <= 2 && Math.abs(py - endY) <= 2) return true;
        
        for (const [dx, dy] of dirs) {
            const nx = px + dx;
            const ny = py + dy;
            const key = `${nx},${ny}`;
            
            if (!visited.has(key)) {
                const realX = nx * step + step/2;
                const realY = ny * step + step/2;
                
                if (realX > 0 && realX < 100 && realY > 0 && realY < 100) {
                    if (pointFree(realX, realY)) {
                        visited.add(key);
                        queue.push({ x: realX, y: realY });
                    }
                }
            }
        }
    }
    return false;
}

// ===== ГЕНЕРАЦИЯ ДОМОВ =====
function generateHouses() {
    let attempts = 0;
    
    while (attempts < 100) {
        attempts++;
        houses = [];
        
        // Создаем 8-12 кластеров (кварталов)
        const numSeeds = 8 + Math.floor(Math.random() * 5); 
        for (let i = 0; i < numSeeds; i++) {
            const cx = rand(15, 85);
            const cy = rand(15, 85);
            const count = 2 + Math.floor(Math.random() * 3); // 2-4 дома в кластере
            
            let placedInCluster = 0;
            let clusterTries = 0;
            
            // Пытаемся поставить дома в этом кластере
            while (placedInCluster < count && clusterTries < 20) {
                clusterTries++;
                const w = rand(8, 12);
                const h = rand(10, 14);
                
                // Разброс внутри кластера (было -6..6, стало -12..12)
                const hx = Math.max(2, Math.min(98 - w, cx + rand(-12, 12) - w/2));
                const hy = Math.max(2, Math.min(98 - h, cy + rand(-12, 12) - h/2));
                
                // Если дом не налазит на другие - ставим его
                if (!isHouseOverlapping(hx, hy, w, h)) {
                    houses.push({ x: hx, y: hy, w: w, h: h });
                    placedInCluster++;
                }
            }
        }
        
        // Ищем стартовые точки
        dronePos = findFreePoint();
        targetPos = findTargetFarFrom(dronePos);
        
        // Проверяем, есть ли путь
        if (checkPath(dronePos, targetPos)) {
            startPos = { x: dronePos.x, y: dronePos.y };
            return; // Путь есть! Оставляем карту.
        }
    }
    
    // Запасной вариант
    houses = [];
    dronePos = { x: 10, y: 10 };
    startPos = { x: 10, y: 10 };
    targetPos = { x: 90, y: 90 };
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

// ===== ДВИЖЕНИЕ И СТОЛКНОВЕНИЕ =====
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

    if (!pointFree(nx, ny)) {
        triggerExplosion();
        return;
    }

    dronePos.x = nx;
    dronePos.y = ny;

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

function triggerExplosion() {
    won = true;
    flying = false;
    statusEl.textContent = "УНИЧТОЖЕН";
    if (explosionOverlay) {
        explosionOverlay.classList.add("visible");
    }
}

// ===== НОВАЯ ИГРА =====
function newGame() {
    won = false;
    flying = false;
    winMessage.classList.remove("visible");
    if (explosionOverlay) explosionOverlay.classList.remove("visible");
    statusEl.textContent = "НА ЗЕМЛЕ";

    generateHouses();
    renderHouses();

    pointA.style.left = startPos.x + "%";
    pointA.style.top = startPos.y + "%";
    pointB.style.left = targetPos.x + "%";
    pointB.style.top = targetPos.y + "%";

    dronePos = { x: startPos.x, y: startPos.y };
    updateDronePosition();
    drone.src = droneImages.back;
    drone.style.transform = "translate(-50%, -50%) scale(0.85)";
}

// ===== СБРОС ДРОНА НА СТАРТ (Клавиша R) =====
function resetToStart() {
    if (won || flying) {
        won = false;
        flying = false;
        if (explosionOverlay) explosionOverlay.classList.remove("visible");
        winMessage.classList.remove("visible");
        statusEl.textContent = "НА ЗЕМЛЕ";
        
        dronePos = { x: startPos.x, y: startPos.y };
        updateDronePosition();
        drone.src = droneImages.back;
        drone.style.transform = "translate(-50%, -50%) scale(0.85)";
    }
}

// ===== ПРОБЕЛ: ВЗЛЁТ/ПОСАДКА =====
function toggleFlight() {
    if (won) return;
    flying = !flying;
    statusEl.textContent = flying ? "В ПОЛЁТЕ" : "НА ЗЕМЛЕ";
    drone.style.transform = flying
        ? "translate(-50%, -50%) scale(1)"
        : "translate(-50%, -50%) scale(0.85)";
}

// ===== КЛАВИШИ =====
document.addEventListener("keydown", e => {
    keys[e.code] = true;

    if (e.code === "KeyR") resetToStart();
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
