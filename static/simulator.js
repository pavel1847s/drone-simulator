// ===== НАСТРОЙКИ =====
const DRONE_RADIUS = 2;     
const DRONE_SPEED = 30;
const WIN_DISTANCE = 4;
const TOTAL_CARGOS = 3; // Сколько грузов нужно собрать

const city = document.getElementById("city");
const drone = document.getElementById("drone");
const pointA = document.getElementById("point-a");
const pointB = document.getElementById("point-b");
const winMessage = document.getElementById("win-message");
const distanceEl = document.getElementById("distance");
const statusEl = document.getElementById("flight-status");
const restartBtn = document.getElementById("restart-button");
const explosionOverlay = document.getElementById("explosion-overlay");
const cargoDisplay = document.getElementById("cargo-display"); // Добавим в HTML

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
let cargos = []; // Массив для грузов
let collectedCargos = 0; // Счетчик собранных
let dronePos = { x: 0, y: 0 };
let targetPos = { x: 0, y: 0 };
let startPos = { x: 0, y: 0 };
let flying = false;
let won = false;
const keys = {};

const rand = (a, b) => a + Math.random() * (b - a);

// ===== ПРОВЕРКА СТОЛКНОВЕНИЙ =====
function pointFree(x, y) {
    const m = DRONE_RADIUS;
    if (x - m < 0 || x + m > 100) return false;
    if (y - m < 0 || y + m > 100) return false;
    const PAD_X = 3; const PAD_Y = 3;   
    for (const h of houses) {
        if (x + m > h.x + PAD_X && x - m < h.x + h.w - PAD_X &&
            y + m > h.y + PAD_Y && y - m < h.y + h.h - PAD_Y) return false;
    }
    return true;
}

function isHouseOverlapping(x, y, w, h) {
    const padding = -1.5; 
    for (const other of houses) {
        if (x < other.x + other.w + padding && x + w > other.x - padding &&
            y < other.y + other.h + padding && y + h > other.y - padding) return true;
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
    const step = 1.5; 
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
        if (Math.abs(px - endX) <= 3 && Math.abs(py - endY) <= 3) return true;
        for (const [dx, dy] of dirs) {
            const nx = px + dx; const ny = py + dy;
            const key = `${nx},${ny}`;
            if (!visited.has(key)) {
                const realX = nx * step + step/2; const realY = ny * step + step/2;
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

// ===== ГЕНЕРАЦИЯ КАРТЫ И ГРУЗОВ =====
function generateMap() {
    let attempts = 0;
    while (attempts < 100) {
        attempts++;
        houses = [];
        const GRID_COLS = 7; const GRID_ROWS = 5; 
        const CELL_W = 100 / GRID_COLS; const CELL_H = 100 / GRID_ROWS;
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (Math.random() > 0.8) continue;
                const w = rand(9, 12); const h = rand(12, 15); 
                let hx = c * CELL_W + (CELL_W - w) / 2 + rand(-1, 1);
                let hy = r * CELL_H + (CELL_H - h) / 2 + rand(-1, 1);
                if (!isHouseOverlapping(hx, hy, w, h)) {
                    houses.push({ x: hx, y: hy, w: w, h: h });
                    if (Math.random() < 0.6) {
                        const dir = Math.floor(Math.random() * 4); let dx = 0, dy = 0;
                        if (dir === 0) dx = w - 1; if (dir === 1) dx = -w + 1;
                        if (dir === 2) dy = h - 1; if (dir === 3) dy = -h + 1;
                        const w2 = rand(8, 11); const h2 = rand(10, 14);
                        const hx2 = hx + dx; const hy2 = hy + dy;
                        if (hx2 > 0 && hx2 + w2 < 100 && hy2 > 0 && hy2 + h2 < 100) {
                            if (!isHouseOverlapping(hx2, hy2, w2, h2)) houses.push({ x: hx2, y: hy2, w: w2, h: h2 });
                        }
                    }
                }
            }
        }
        
        dronePos = findFreePoint();
        targetPos = findTargetFarFrom(dronePos);
        
        // Спавним грузы в случайных свободных местах
        cargos = [];
        let cargoTries = 0;
        while (cargos.length < TOTAL_CARGOS && cargoTries < 100) {
            cargoTries++;
            const p = findFreePoint();
            // Груз не должен быть слишком близко к старту или финишу
            if (Math.hypot(p.x - startPos.x, p.y - startPos.y) > 15 && Math.hypot(p.x - targetPos.x, p.y - targetPos.y) > 15) {
                cargos.push({ x: p.x, y: p.y, collected: false });
            }
        }
        
        if (checkPath(dronePos, targetPos)) {
            startPos = { x: dronePos.x, y: dronePos.y };
            return; 
        }
    }
}

function renderHouses() {
    city.querySelectorAll(".house").forEach(el => el.remove());
    for (const h of houses) {
        const img = document.createElement("img");
        img.className = "house";
        img.src = houseImages[Math.floor(Math.random() * houseImages.length)];
        img.style.left = h.x + "%"; img.style.top = h.y + "%";
        img.style.width = h.w + "%"; img.style.height = h.h + "%";
        city.insertBefore(img, city.firstChild);
    }
}

// ===== ОТРИСОВКА ГРУЗОВ =====
function renderCargos() {
    city.querySelectorAll(".cargo").forEach(el => el.remove());
    for (const c of cargos) {
        if (c.collected) continue;
        const div = document.createElement("div");
        div.className = "cargo";
        div.style.left = c.x + "%";
        div.style.top = c.y + "%";
        city.appendChild(div);
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
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    const step = DRONE_SPEED * dt;
    const nx = dronePos.x + dx * step;
    const ny = dronePos.y + dy * step;

    if (!pointFree(nx, ny)) {
        triggerExplosion();
        return;
    }
    dronePos.x = nx; dronePos.y = ny;
    updateDroneImage(dx, dy);
    updateDronePosition();
}

function updateDroneImage(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) drone.src = dx > 0 ? droneImages.right : droneImages.left;
    else drone.src = dy < 0 ? droneImages.back : droneImages.front;
}

function updateDronePosition() {
    drone.style.left = dronePos.x + "%"; drone.style.top = dronePos.y + "%";
    const d = Math.hypot(dronePos.x - targetPos.x, dronePos.y - targetPos.y);
    distanceEl.textContent = d.toFixed(1) + " %";
}

// ===== СБОР ГРУЗА (Клавиша E) =====
function tryCollectCargo() {
    if (won || !flying) return;
    for (let i = 0; i < cargos.length; i++) {
        if (cargos[i].collected) continue;
        const dist = Math.hypot(dronePos.x - cargos[i].x, dronePos.y - cargos[i].y);
        if (dist < 5) { // Если дрон подлетел близко
            cargos[i].collected = true;
            collectedCargos++;
            cargoDisplay.textContent = `${collectedCargos} / ${TOTAL_CARGOS}`;
            renderCargos(); // Перерисовываем, чтобы исчез
            
            // Звуковой сигнал (опционально, если добавишь)
            if (collectedCargos === TOTAL_CARGOS) {
                statusEl.textContent = "ВСЕ ГРУЗЫ СОБРАНЫ! ЛЕТИМ В Б!";
                statusEl.style.color = "#55d66b";
                pointB.style.animation = "pulse 0.5s infinite"; // Ускоряем пульсацию точки Б
            }
            return;
        }
    }
}

// ===== ПОБЕДА И ОТПРАВКА СТАТИСТИКИ =====
function checkWin() {
    const d = Math.hypot(dronePos.x - targetPos.x, dronePos.y - targetPos.y);
    if (d < WIN_DISTANCE) {
        if (collectedCargos < TOTAL_CARGOS) {
            statusEl.textContent = "СНАЧАЛА СОБЕРИТЕ ГРУЗЫ!";
            statusEl.style.color = "#d87528";
            return;
        }
        won = true;
        flying = false;
        statusEl.textContent = "ЦЕЛЬ ДОСТИГНУТА";
        statusEl.style.color = "#55d66b";
        winMessage.classList.add("visible");
        sendStats('win'); // Отправляем на сервер
    }
}

function triggerExplosion() {
    won = true; flying = false;
    statusEl.textContent = "УНИЧТОЖЕН";
    statusEl.style.color = "#ff0000";
    if (explosionOverlay) explosionOverlay.classList.add("visible");
    sendStats('loss'); // Отправляем на сервер
}

// ===== ФУНКЦИЯ ОТПРАВКИ ДАННЫХ =====
function sendStats(result) {
    fetch('/api/update_stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: result })
    }).catch(err => console.log("Ошибка отправки статистики:", err));
}

// ===== НОВАЯ ИГРА =====
function newGame() {
    won = false; flying = false;
    winMessage.classList.remove("visible");
    if (explosionOverlay) explosionOverlay.classList.remove("visible");
    statusEl.textContent = "НА ЗЕМЛЕ";
    statusEl.style.color = "#eee";
    pointB.style.animation = "pulse 1.5s infinite"; // Возвращаем стандартную пульсацию

    collectedCargos = 0;
    cargoDisplay.textContent = `0 / ${TOTAL_CARGOS}`;

    generateMap();
    renderHouses();
    renderCargos();

    pointA.style.left = startPos.x + "%"; pointA.style.top = startPos.y + "%";
    pointB.style.left = targetPos.x + "%"; pointB.style.top = targetPos.y + "%";

    dronePos = { x: startPos.x, y: startPos.y };
    updateDronePosition();
    drone.src = droneImages.back;
    drone.style.transform = "translate(-50%, -50%) scale(0.85)";
}

function resetToStart() {
    if (won || flying) {
        won = false; flying = false;
        if (explosionOverlay) explosionOverlay.classList.remove("visible");
        winMessage.classList.remove("visible");
        statusEl.textContent = "НА ЗЕМЛЕ";
        statusEl.style.color = "#eee";
        dronePos = { x: startPos.x, y: startPos.y };
        updateDronePosition();
        drone.src = droneImages.back;
        drone.style.transform = "translate(-50%, -50%) scale(0.85)";
    }
}

function toggleFlight() {
    if (won) return;
    flying = !flying;
    statusEl.textContent = flying ? "В ПОЛЁТЕ" : "НА ЗЕМЛЕ";
    statusEl.style.color = "#eee";
    drone.style.transform = flying ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -50%) scale(0.85)";
}

// ===== ОБРАБОТКА КЛАВИШ =====
document.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (e.code === "KeyR") newGame();
    if (e.code === "Space") toggleFlight();
    if (e.code === "KeyE") tryCollectCargo(); // Кнопка E

    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space", "KeyE"].includes(e.code)) {
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
