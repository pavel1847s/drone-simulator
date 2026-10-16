const buildRouteButton = document.getElementById("build-route-button");
const startFlightButton = document.getElementById("start-flight-button");
const flightStatus = document.getElementById("flight-status");
const drone = document.getElementById("drone");

const flightRoute = [
    [10, 70],
    [10, 50],
    [25, 50],
    [25, 30],
    [45, 30],
    [45, 55],
    [65, 55],
    [65, 35],
    [82, 35],
    [82, 70]
];

let routeBuilt = false;
let flying = false;

/*
Картинки дрона

drone-front = задняя часть
drone-back  = передняя часть
drone-left  = левая сторона
drone-right = правая сторона
*/

const droneImages = {
    front: "/static/images/drone-front.jpg",
    back: "/static/images/drone-back.jpg",
    left: "/static/images/drone-left.jpg",
    right: "/static/images/drone-right.jpg"
};

/*
Определяем направление полёта
*/

function setDroneDirection(previousPoint, nextPoint) {

    const previousX = previousPoint[0];
    const previousY = previousPoint[1];

    const nextX = nextPoint[0];
    const nextY = nextPoint[1];

    // Полёт вправо
    if (nextX > previousX) {
        drone.src = droneImages.right;
    }

    // Полёт влево
    else if (nextX < previousX) {
        drone.src = droneImages.left;
    }

    // Полёт вниз
    else if (nextY > previousY) {
        drone.src = droneImages.back;
    }

    // Полёт вверх
    else if (nextY < previousY) {
        drone.src = droneImages.front;
    }
}

/*
Построение маршрута
*/

buildRouteButton.addEventListener("click", () => {

    routeBuilt = true;

    flightStatus.textContent = "МАРШРУТ ПОСТРОЕН";

    buildRouteButton.textContent = "МАРШРУТ ПОСТРОЕН";

    // Ставим дрон в начало маршрута
    drone.style.left = flightRoute[0][0] + "%";
    drone.style.top = flightRoute[0][1] + "%";
});

/*
Движение дрона между двумя точками
*/

function moveDrone(start, end, duration) {

    return new Promise((resolve) => {

        const startTime = performance.now();

        function animate(currentTime) {

            const elapsed = currentTime - startTime;

            const progress = Math.min(elapsed / duration, 1);

            const currentX =
                start[0] + (end[0] - start[0]) * progress;

            const currentY =
                start[1] + (end[1] - start[1]) * progress;

            drone.style.left = currentX + "%";
            drone.style.top = currentY + "%";

            if (progress < 1) {

                requestAnimationFrame(animate);

            } else {

                resolve();
            }
        }

        requestAnimationFrame(animate);
    });
}

/*
Запуск полёта
*/

startFlightButton.addEventListener("click", async () => {

    // Если маршрут ещё не построен
    if (!routeBuilt) {

        flightStatus.textContent = "СНАЧАЛА ПОСТРОЙТЕ МАРШРУТ";

        return;
    }

    // Если дрон уже летит
    if (flying) {

        return;
    }

    flying = true;

    flightStatus.textContent = "ПОЛЁТ";

    startFlightButton.textContent = "БПЛА В ПОЛЁТЕ";

    /*
    Проходим все точки маршрута
    */

    for (let i = 0; i < flightRoute.length - 1; i++) {

        const currentPoint = flightRoute[i];

        const nextPoint = flightRoute[i + 1];

        // Меняем ракурс дрона
        setDroneDirection(
            currentPoint,
            nextPoint
        );

        // Летим к следующей точке
        await moveDrone(
            currentPoint,
            nextPoint,
            1200
        );
    }

    /*
    Полёт завершён
    */

    flightStatus.textContent = "ПОЛЁТ ЗАВЕРШЁН";

    startFlightButton.textContent = "ПОЛЁТ ЗАВЕРШЁН";

    flying = false;
});