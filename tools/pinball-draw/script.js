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
const duplicateToggle = document.querySelector("#duplicateToggle");
const duplicateModeText = document.querySelector("#duplicateModeText");
const listStatus = document.querySelector("#listStatus");

const MAX_ENTRIES = 8;
const MASTER_VOLUME = 10.0;

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
    settledBalls: [],
    drawnLabels: [],
    cycleComplete: false,
    restartButtonBounds: null,
};

let audioContext = null;

function ensureAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
}

function volume(level) {
    return Math.max(0.0001, level * MASTER_VOLUME);
}

function playBounceSound() {
    if (!audioContext) {
        return;
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(760 + Math.random() * 260, now);
    oscillator.frequency.exponentialRampToValueAtTime(360 + Math.random() * 120, now + 0.08);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(6, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume(0.12), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
}

function playRollInSound() {
    if (!audioContext) {
        return;
    }

    const now = audioContext.currentTime;
    const duration = 0.52;
    const bufferSize = audioContext.sampleRate * duration;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < bufferSize; index += 1) {
        const progress = index / bufferSize;
        const tick = Math.sin(progress * Math.PI * 96) > 0.68 ? 1 : 0;
        data[index] = (Math.random() * 2 - 1) * tick * (1 - progress) * 0.72;
    }

    const noise = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    const sparkle = audioContext.createOscillator();
    const sparkleGain = audioContext.createGain();

    noise.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1450, now);
    filter.frequency.exponentialRampToValueAtTime(720, now + duration);
    filter.Q.setValueAtTime(5.5, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume(0.08), now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    sparkle.type = "triangle";
    sparkle.frequency.setValueAtTime(940, now);
    sparkle.frequency.exponentialRampToValueAtTime(520, now + duration);
    sparkleGain.gain.setValueAtTime(0.0001, now);
    sparkleGain.gain.exponentialRampToValueAtTime(volume(0.035), now + 0.035);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);
    sparkle.connect(sparkleGain);
    sparkleGain.connect(audioContext.destination);
    noise.start(now);
    sparkle.start(now);
    noise.stop(now + duration);
    sparkle.stop(now + duration);
}

function rawEntryItems() {
    return nameInput.value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function entryLabel(item) {
    return item.replace(/\s*\*\s*\d+$/, "").trim();
}

function limitedRawItems() {
    const seenLabels = new Set();
    const items = [];

    rawEntryItems().forEach((item) => {
        const label = entryLabel(item);

        if (!label || seenLabels.has(label) || items.length >= MAX_ENTRIES) {
            return;
        }

        seenLabels.add(label);
        items.push(item);
    });

    return items;
}

function enforceEntryLimit() {
    const items = rawEntryItems();

    if (items.length <= MAX_ENTRIES) {
        return;
    }

    nameInput.value = items.slice(0, MAX_ENTRIES).join("\n");
}

function parseEntries() {
    return limitedRawItems().flatMap((item) => {
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

function duplicateAllowed() {
    return duplicateToggle.checked;
}

function updateListStatus() {
    const rawCount = rawEntryItems().length;
    const visibleCount = uniqueLabels(state.entries).length;

    duplicateModeText.textContent = duplicateAllowed() ? "중복 가능" : "중복 불가능";

    if (rawCount > MAX_ENTRIES) {
        listStatus.textContent = `최대 ${MAX_ENTRIES}명까지만 사용합니다. 현재 ${visibleCount}명이 뽑기 목록에 반영되었습니다.`;
        return;
    }

    listStatus.textContent = `최대 ${MAX_ENTRIES}명까지 입력할 수 있습니다. 현재 ${visibleCount}명입니다.`;
}

function syncEntries() {
    enforceEntryLimit();
    const labels = uniqueLabels(parseEntries());
    state.entries = parseEntries();
    state.activeSlots = null;
    state.settledBalls = [];
    state.cycleComplete = false;
    state.restartButtonBounds = null;
    state.drawnLabels = state.drawnLabels.filter((label) => labels.includes(label));
    itemCount.textContent = `${labels.length}/${MAX_ENTRIES}`;
    startButton.disabled = false;
    updateListStatus();
    draw();
}

function drawableEntries() {
    if (duplicateAllowed()) {
        return state.entries;
    }

    const drawnSet = new Set(state.drawnLabels);
    const candidates = state.entries.filter((entry) => !drawnSet.has(entry.label));

    if (candidates.length > 0) {
        return candidates;
    }

    state.drawnLabels = [];
    state.settledBalls = [];
    return state.entries;
}

function pickWinner() {
    const candidates = drawableEntries();

    if (candidates.length === 0) {
        return null;
    }

    return candidates[Math.floor(Math.random() * candidates.length)].label;
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
    const slotCount = Math.min(Math.max(visibleLabels.length, 2), MAX_ENTRIES);
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

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function buildBouncePath(endX, endY) {
    const points = [{ x: board.width / 2, y: 50 }];
    let currentX = board.width / 2;
    let direction = Math.random() > 0.5 ? 1 : -1;
    const rows = [...new Set(pins.map((pin) => pin.y))]
        .filter((y) => y < board.slotTop - 30)
        .sort((a, b) => a - b);

    rows.forEach((y, index) => {
        const rowPins = pins.filter((pin) => pin.y === y);
        const targetPull = (endX - currentX) * 0.24;
        const nearestPin = rowPins.reduce((nearest, pin) => {
            const pinScore = Math.abs(pin.x - currentX - targetPull);
            const nearestScore = Math.abs(nearest.x - currentX - targetPull);
            return pinScore < nearestScore ? pin : nearest;
        }, rowPins[0]);
        const sideOffset = direction * (28 + Math.random() * 22);
        const randomKick = (Math.random() - 0.5) * 36;
        const routePull = (endX - board.width / 2) * ((index + 1) / rows.length) * 0.28;

        currentX = clamp(nearestPin.x + sideOffset + randomKick + routePull, board.left + 28, board.right - 28);
        direction *= Math.random() > 0.22 ? -1 : 1;
        points.push({
            x: currentX,
            y: y + 16,
            hitX: nearestPin.x,
            hitY: nearestPin.y,
        });
    });

    points.push({ x: clamp(endX + (Math.random() - 0.5) * 26, board.left + 28, board.right - 28), y: board.slotTop - 22 });
    points.push({ x: endX, y: endY });
    return points;
}

function launchBall() {
    if (state.cycleComplete) {
        return;
    }

    ensureAudioContext();
    const winner = pickWinner();

    if (!winner || state.running) {
        return;
    }

    const totalDrawsInCycle = uniqueLabels(state.entries).length;

    const slots = slotData(winner);
    const slotIndex = targetSlotIndex(winner, slots);
    const slot = slots[slotIndex];
    const endX = slot.x + slot.width / 2;
    const endY = board.slotTop + 78;
    const points = buildBouncePath(endX, endY);

    state.running = true;
    state.winner = winner;
    state.activeSlots = slots;
    state.ball = {
        points,
        slotIndex,
        slotLabel: slot.label,
        settledX: endX,
        settledY: endY,
        start: performance.now(),
        duration: 3100,
        trail: [],
        lastBounceIndex: -1,
        rollSoundPlayed: false,
        squash: 1,
        x: points[0].x,
        y: points[0].y,
    };
    winnerName.textContent = "구슬이 굴러가는 중";
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
    const bounce = Math.sin(local * Math.PI);
    const jitter = Math.sin((now - ball.start) / 38 + index * 1.7) * 5 * (1 - progress);
    const landingBounce = progress > 0.88 ? Math.sin((progress - 0.88) * Math.PI * 7) * (1 - progress) * 34 : 0;

    return {
        progress,
        index,
        x: current.x + (next.x - current.x) * local + jitter,
        y: current.y + (next.y - current.y) * local - bounce * 16 - landingBounce,
        squash: 1 + bounce * 0.12,
    };
}

function finishDraw() {
    const result = state.winner;
    const completedBall = state.ball;
    const totalDrawsInCycle = uniqueLabels(state.entries).length;
    state.running = false;
    state.ball = null;
    state.settledBalls.push({
        x: completedBall.settledX,
        y: completedBall.settledY,
        slotIndex: completedBall.slotIndex,
        label: completedBall.slotLabel,
    });

    if (!duplicateAllowed() && !state.drawnLabels.includes(result)) {
        state.drawnLabels.push(result);
    }

    state.cycleComplete = totalDrawsInCycle > 0 && state.settledBalls.length >= totalDrawsInCycle;
    startButton.disabled = state.cycleComplete;
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
    if (position.index > 0 && position.index < state.ball.points.length - 2 && position.index !== state.ball.lastBounceIndex) {
        state.ball.lastBounceIndex = position.index;
        playBounceSound();
    }

    if (!state.ball.rollSoundPlayed && position.progress > 0.88) {
        state.ball.rollSoundPlayed = true;
        playRollInSound();
    }

    state.ball.x = position.x;
    state.ball.y = position.y;
    state.ball.squash = position.squash;
    state.ball.trail.push({ x: position.x, y: position.y, age: 0 });
    state.ball.trail = state.ball.trail
        .map((point) => ({ ...point, age: point.age + 1 }))
        .filter((point) => point.age < 10);
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
    const ball = state.ball;

    pins.forEach((pin) => {
        const distance = ball ? Math.hypot(ball.x - pin.x, ball.y - pin.y) : Infinity;
        const isNearBall = distance < 34;

        ctx.beginPath();
        ctx.arc(pin.x, pin.y, isNearBall ? 10 : 8, 0, Math.PI * 2);
        ctx.fillStyle = isNearBall ? "#ffffff" : "#dfe7f2";
        ctx.fill();
        ctx.strokeStyle = isNearBall ? "rgba(255, 209, 102, 0.86)" : "rgba(57, 213, 255, 0.55)";
        ctx.lineWidth = isNearBall ? 5 : 3;
        ctx.stroke();

        if (isNearBall) {
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, 18 + (34 - distance) * 0.22, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 209, 102, 0.28)";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
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
        ctx.fillText(slot.label, slot.x + slot.width / 2, board.slotTop + 38, slot.width - 20);
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

function drawBallAt(x, y, radius = 18, glow = 0.32, squash = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(squash, 1 / squash);

    const gradient = ctx.createRadialGradient(-7, -7, 2, 0, 0, 20);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.32, "#ffd166");
    gradient.addColorStop(1, "#ff5ca8");

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.shadowColor = `rgba(255, 92, 168, ${glow})`;
    ctx.shadowBlur = 22;
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
}

function drawBallTrail() {
    if (!state.ball || !state.ball.trail) {
        return;
    }

    state.ball.trail.forEach((point) => {
        const alpha = Math.max(0, 0.34 - point.age * 0.035);
        const radius = Math.max(4, 14 - point.age);

        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 209, 102, ${alpha})`;
        ctx.fill();
    });
}

function drawSettledBalls() {
    state.settledBalls.forEach((ball, index) => {
        const sameSlotCount = state.settledBalls
            .slice(0, index)
            .filter((settledBall) => settledBall.slotIndex === ball.slotIndex).length;
        const offsetX = (sameSlotCount % 3 - 1) * 20;
        const offsetY = -Math.floor(sameSlotCount / 3) * 18;
        drawBallAt(ball.x + offsetX, ball.y + offsetY, 14, 0.58);
    });
}

function drawBall() {
    const ball = state.ball || { x: board.width / 2, y: 50 };
    const glow = state.running ? 0.85 : 0.32;
    drawBallAt(ball.x, ball.y, 18, glow, ball.squash || 1);
}

function drawTitle() {
    ctx.textAlign = "center";
    ctx.fillStyle = "#f7f9fc";
    ctx.font = "900 34px system-ui, sans-serif";
    ctx.fillText("PINBALL DRAW", board.width / 2, 34);
}

function drawRestartOverlay() {
    if (!state.cycleComplete) {
        state.restartButtonBounds = null;
        return;
    }

    const buttonWidth = 230;
    const buttonHeight = 72;
    const x = board.width / 2 - buttonWidth / 2;
    const y = board.top + 210;

    state.restartButtonBounds = { x, y, width: buttonWidth, height: buttonHeight };

    ctx.save();
    ctx.fillStyle = "rgba(9, 12, 18, 0.48)";
    ctx.fillRect(board.left, board.top + 115, board.right - board.left, 250);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const gradient = ctx.createLinearGradient(x, y, x + buttonWidth, y + buttonHeight);
    gradient.addColorStop(0, "#ffd166");
    gradient.addColorStop(1, "#ff5ca8");
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(255, 92, 168, 0.55)";
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.roundRect(x, y, buttonWidth, buttonHeight, 18);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,255,255,0.68)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#101114";
    ctx.font = "900 30px system-ui, sans-serif";
    ctx.fillText("다시하기", board.width / 2, y + buttonHeight / 2);
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, board.width, board.height);
    drawBackground();
    drawTitle();
    drawGuides();
    drawPins();
    drawSlots();
    drawSettledBalls();
    drawBallTrail();
    drawBall();
    drawRestartOverlay();
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
    const lines = limitedRawItems();

    for (let index = lines.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [lines[index], lines[swapIndex]] = [lines[swapIndex], lines[index]];
    }

    nameInput.value = lines.join("\n");
    syncEntries();
}

function restartCycle() {
    state.settledBalls = [];
    state.drawnLabels = [];
    state.cycleComplete = false;
    state.restartButtonBounds = null;
    startButton.disabled = false;
    winnerName.textContent = "대기 중";
    draw();
}

function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
    };
}

function pointInBounds(point, bounds) {
    return (
        bounds &&
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height
    );
}

nameInput.addEventListener("input", syncEntries);
duplicateToggle.addEventListener("change", () => {
    state.drawnLabels = [];
    state.settledBalls = [];
    state.cycleComplete = false;
    state.restartButtonBounds = null;
    startButton.disabled = false;
    updateListStatus();
    draw();
});
shuffleButton.addEventListener("click", shuffleInput);
startButton.addEventListener("click", launchBall);
canvas.addEventListener("click", (event) => {
    if (!state.cycleComplete || !pointInBounds(canvasPoint(event), state.restartButtonBounds)) {
        return;
    }

    restartCycle();
});
canvas.addEventListener("mousemove", (event) => {
    const isOverRestart = state.cycleComplete && pointInBounds(canvasPoint(event), state.restartButtonBounds);
    canvas.style.cursor = isOverRestart ? "pointer" : "default";
});
canvas.addEventListener("mouseleave", () => {
    canvas.style.cursor = "default";
});
clearHistoryButton.addEventListener("click", () => {
    state.history = [];
    drawCount.textContent = "0";
    renderHistory();
});

syncEntries();
