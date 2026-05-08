const canvas = document.querySelector("#pinballCanvas");
const ctx = canvas.getContext("2d");
const nameInput = document.querySelector("#nameInput");
const winnerName = document.querySelector("#winnerName");
const itemCount = document.querySelector("#itemCount");
const drawCount = document.querySelector("#drawCount");
const historyList = document.querySelector("#historyList");
const shuffleButton = document.querySelector("#shuffleButton");
const startButton = document.querySelector("#startButton");
const clearHistoryButton = document.querySelector("#clearHistoryButton");

const board = {
    width: canvas.width,
    height: canvas.height,
    left: 58,
    right: canvas.width - 58,
    top: 88,
    slotTop: canvas.height - 145,
};

const state = {
    entries: [],
    history: [],
    ball: null,
    running: false,
    winner: null,
    activeSlots: null,
};

function parseEntries() {
    return nameInput.value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
        .flatMap((item) => {
            const match = item.match(/^(.*?)\s*\*\s*(\d+)$/);
            if (!match) {
                return [{ label: item, display: item }];
            }

            const label = match[1].trim();
            const weight = Math.min(Number(match[2]), 20);
            return Array.from({ length: Math.max(weight, 1) }, () => ({ label, display: item }));
        });
}

function uniqueLabels(entries) {
    return [...new Set(entries.map((entry) => entry.label))];
}

function syncEntries() {
    state.entries = parseEntries();
    state.activeSlots = null;
    itemCount.textContent = uniqueLabels(state.entries).length;
    draw();
}

function pickWinner() {
    if (state.entries.length === 0) {
        return null;
    }

    return state.entries[Math.floor(Math.random() * state.entries.length)].label;
}

function buildPins() {
    const pins = [];
    const rows = 9;
    const gapY = 60;
    const gapX = 72;

    for (let row = 0; row < rows; row += 1) {
        const count = row % 2 === 0 ? 7 : 8;
        const y = board.top + 70 + row * gapY;
        const startX = board.width / 2 - ((count - 1) * gapX) / 2;

        for (let col = 0; col < count; col += 1) {
            pins.push({ x: startX + col * gapX, y });
        }
    }

    return pins;
}

const pins = buildPins();

function slotData(preferredLabel = null) {
    const labels = uniqueLabels(state.entries);
    const visibleLabels = labels.length > 0 ? labels : ["목록을 입력하세요"];
    const slotCount = Math.min(Math.max(visibleLabels.length, 2), 8);
    const slotLabels = visibleLabels.slice(0, slotCount);

    if (preferredLabel && !slotLabels.includes(preferredLabel)) {
        slotLabels[slotLabels.length - 1] = preferredLabel;
    }

    const slotWidth = (board.right - board.left) / slotCount;

    return Array.from({ length: slotCount }, (_, index) => ({
        index,
        x: board.left + index * slotWidth,
        width: slotWidth,
        label: slotLabels[index % slotLabels.length],
    }));
}

function targetSlotIndex(label, slots) {
    const index = slots.findIndex((slot) => slot.label === label);
    return index >= 0 ? index : Math.floor(Math.random() * slots.length);
}

function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function launchBall() {
    const winner = pickWinner();

    if (!winner || state.running) {
        return;
    }

    const slots = slotData(winner);
    const slotIndex = targetSlotIndex(winner, slots);
    const slot = slots[slotIndex];
    const endX = slot.x + slot.width / 2;
    const points = [{ x: board.width / 2, y: 50 }];

    pins
        .filter((pin) => pin.y < board.slotTop - 30)
        .forEach((pin, index) => {
            const drift = (Math.random() - 0.5) * 96;
            const pull = (endX - board.width / 2) * (index / pins.length);
            points.push({
                x: Math.max(board.left + 24, Math.min(board.right - 24, board.width / 2 + pull + drift)),
                y: pin.y + 18,
            });
        });

    points.push({ x: endX, y: board.slotTop - 22 });

    state.running = true;
    state.winner = winner;
    state.activeSlots = slots;
    state.ball = {
        points,
        start: performance.now(),
        duration: 2400,
        x: points[0].x,
        y: points[0].y,
    };
    winnerName.textContent = "굴러가는 중";
    startButton.disabled = true;
    animate();
}

function ballPosition(ball, now) {
    const progress = Math.min((now - ball.start) / ball.duration, 1);
    const scaled = easeInOut(progress) * (ball.points.length - 1);
    const index = Math.min(Math.floor(scaled), ball.points.length - 2);
    const local = scaled - index;
    const current = ball.points[index];
    const next = ball.points[index + 1];

    return {
        progress,
        x: current.x + (next.x - current.x) * local,
        y: current.y + (next.y - current.y) * local,
    };
}

function finishDraw() {
    const result = state.winner;
    state.running = false;
    state.ball = null;
    startButton.disabled = false;
    winnerName.textContent = result;
    state.history.unshift(result);
    drawCount.textContent = state.history.length;
    renderHistory();
    draw();
}

function animate(now = performance.now()) {
    if (!state.ball) {
        return;
    }

    const position = ballPosition(state.ball, now);
    state.ball.x = position.x;
    state.ball.y = position.y;
    draw();

    if (position.progress >= 1) {
        finishDraw();
        return;
    }

    requestAnimationFrame(animate);
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, board.height);
    gradient.addColorStop(0, "#222936");
    gradient.addColorStop(1, "#12151d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, board.width, board.height);

    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 4;
    ctx.strokeRect(board.left, 30, board.right - board.left, board.height - 62);
}

function drawPins() {
    pins.forEach((pin) => {
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#dfe7f2";
        ctx.fill();
        ctx.strokeStyle = "rgba(57, 213, 255, 0.55)";
        ctx.lineWidth = 3;
        ctx.stroke();
    });
}

function drawSlots() {
    const slots = state.activeSlots || slotData();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    slots.forEach((slot, index) => {
        const hue = index % 2 === 0 ? "rgba(182, 242, 74, 0.16)" : "rgba(57, 213, 255, 0.14)";
        ctx.fillStyle = hue;
        ctx.fillRect(slot.x, board.slotTop, slot.width, 108);
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.lineWidth = 2;
        ctx.strokeRect(slot.x, board.slotTop, slot.width, 108);

        ctx.save();
        ctx.beginPath();
        ctx.rect(slot.x + 6, board.slotTop + 8, slot.width - 12, 92);
        ctx.clip();
        ctx.fillStyle = "#f7f9fc";
        ctx.font = "800 18px system-ui, sans-serif";
        ctx.fillText(slot.label, slot.x + slot.width / 2, board.slotTop + 54, slot.width - 20);
        ctx.restore();
    });
}

function drawGuides() {
    ctx.strokeStyle = "rgba(255, 209, 102, 0.6)";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(board.left + 20, 64);
    ctx.lineTo(board.width / 2 - 18, 64);
    ctx.moveTo(board.width / 2 + 18, 64);
    ctx.lineTo(board.right - 20, 64);
    ctx.stroke();
}

function drawBall() {
    const ball = state.ball || { x: board.width / 2, y: 50 };
    const glow = state.running ? 0.85 : 0.32;
    const gradient = ctx.createRadialGradient(ball.x - 7, ball.y - 7, 2, ball.x, ball.y, 20);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.32, "#ffd166");
    gradient.addColorStop(1, "#ff5ca8");

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.shadowColor = `rgba(255, 92, 168, ${glow})`;
    ctx.shadowBlur = 22;
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawTitle() {
    ctx.textAlign = "center";
    ctx.fillStyle = "#f7f9fc";
    ctx.font = "900 34px system-ui, sans-serif";
    ctx.fillText("PINBALL DRAW", board.width / 2, 34);
}

function draw() {
    ctx.clearRect(0, 0, board.width, board.height);
    drawBackground();
    drawTitle();
    drawGuides();
    drawPins();
    drawSlots();
    drawBall();
}

function renderHistory() {
    historyList.innerHTML = "";
    state.history.slice(0, 12).forEach((name) => {
        const item = document.createElement("li");
        const label = document.createElement("strong");
        label.textContent = name;
        item.append(label);
        historyList.append(item);
    });
}

function shuffleInput() {
    const lines = nameInput.value
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    for (let index = lines.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [lines[index], lines[swapIndex]] = [lines[swapIndex], lines[index]];
    }

    nameInput.value = lines.join("\n");
    syncEntries();
}

nameInput.addEventListener("input", syncEntries);
shuffleButton.addEventListener("click", shuffleInput);
startButton.addEventListener("click", launchBall);
clearHistoryButton.addEventListener("click", () => {
    state.history = [];
    drawCount.textContent = "0";
    renderHistory();
});

syncEntries();
