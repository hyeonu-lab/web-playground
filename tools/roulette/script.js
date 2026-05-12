const canvas = document.querySelector("#rouletteCanvas");
const ctx = canvas.getContext("2d");
const itemInput = document.querySelector("#itemInput");
const resultCard = document.querySelector("#resultCard");
const resultText = document.querySelector("#resultText");
const resultBadge = document.querySelector("#resultBadge");
const resultNote = document.querySelector("#resultNote");
const itemCount = document.querySelector("#itemCount");
const winRate = document.querySelector("#winRate");
const listStatus = document.querySelector("#listStatus");
const spinButton = document.querySelector("#spinButton");
const resetButton = document.querySelector("#resetButton");
const clearHistoryButton = document.querySelector("#clearHistoryButton");
const historyList = document.querySelector("#historyList");

const DEFAULT_ITEMS = ["당첨", "꽝", "꽝", "꽝", "꽝", "꽝"];
const MAX_ITEMS = 24;
const COLORS = ["#f7d873", "#6c9b60", "#e9b47a", "#8fbf86", "#f2c46f", "#b77a45"];
const RESULT_STATE = {
    idle: {
        badge: "READY",
        note: "돌리기 버튼을 누르면 결과가 여기에 크게 표시됩니다.",
    },
    spinning: {
        badge: "SPINNING",
        note: "룰렛이 멈추면 최종 결과가 표시됩니다.",
    },
    win: {
        badge: "당첨",
        note: "축하합니다. 당첨 결과입니다.",
    },
    lose: {
        badge: "꽝",
        note: "이번에는 꽝입니다. 다시 도전해 보세요.",
    },
};

const state = {
    items: [],
    history: [],
    rotation: 0,
    spinning: false,
    audioContext: null,
    spinSoundTimer: null,
};

function parseItems() {
    return itemInput.value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, MAX_ITEMS);
}

function isWinningItem(item) {
    return item.includes("당첨");
}

function ensureAudio() {
    if (!state.audioContext) {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (state.audioContext.state === "suspended") {
        state.audioContext.resume();
    }

    return state.audioContext;
}

function playTone({ frequency, type = "sine", start = 0, duration = 0.12, volume = 0.08 }) {
    const audio = ensureAudio();
    const now = audio.currentTime + start;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
}

function playSpinTick(speed = 1) {
    const audio = ensureAudio();
    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const filter = audio.createBiquadFilter();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(240 + speed * 90, now);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(900, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.07);
}

function scheduleSpinSound(duration) {
    clearInterval(state.spinSoundTimer);
    const start = performance.now();

    playSpinTick(1);
    state.spinSoundTimer = window.setInterval(() => {
        const progress = Math.min((performance.now() - start) / duration, 1);
        if (progress >= 1 || !state.spinning) {
            clearInterval(state.spinSoundTimer);
            state.spinSoundTimer = null;
            return;
        }

        playSpinTick(1 - progress);
    }, 95);
}

function playWinSound() {
    playTone({ frequency: 523.25, start: 0, duration: 0.13, volume: 0.1 });
    playTone({ frequency: 659.25, start: 0.12, duration: 0.13, volume: 0.1 });
    playTone({ frequency: 783.99, start: 0.24, duration: 0.18, volume: 0.11 });
    playTone({ frequency: 1046.5, start: 0.4, duration: 0.28, volume: 0.09 });
}

function playLoseSound() {
    playTone({ frequency: 196, type: "triangle", start: 0, duration: 0.18, volume: 0.09 });
    playTone({ frequency: 146.83, type: "triangle", start: 0.16, duration: 0.26, volume: 0.08 });
}

function updateResult(mode, text = "") {
    const config = RESULT_STATE[mode] || RESULT_STATE.idle;
    resultCard.classList.remove("is-idle", "is-spinning", "is-win", "is-lose");
    resultCard.classList.add(`is-${mode}`);
    resultText.textContent = text || (mode === "idle" ? "대기 중" : "돌아가는 중");
    resultBadge.textContent = config.badge;
    resultNote.textContent = config.note;
}

function syncItems() {
    state.items = parseItems();
    const wins = state.items.filter(isWinningItem).length;
    itemCount.textContent = `${state.items.length}/${MAX_ITEMS}`;
    winRate.textContent = state.items.length ? `${Math.round((wins / state.items.length) * 100)}%` : "0%";
    listStatus.textContent = state.items.length > 0
        ? `현재 ${state.items.length}개 항목으로 룰렛을 돌릴 수 있습니다.`
        : "항목을 하나 이상 입력하세요.";
    spinButton.disabled = state.items.length === 0 || state.spinning;
    drawWheel();
}

function drawWheel(highlightIndex = -1) {
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 42;
    const items = state.items.length ? state.items : ["항목 없음"];
    const arc = (Math.PI * 2) / items.length;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(state.rotation);

    items.forEach((item, index) => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, index * arc, (index + 1) * arc);
        ctx.closePath();
        ctx.fillStyle = index === highlightIndex ? "#fffdf7" : COLORS[index % COLORS.length];
        ctx.fill();
        ctx.strokeStyle = "rgba(59, 42, 29, 0.28)";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.rotate(index * arc + arc / 2);
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#3b2a1d";
        ctx.font = "900 26px Malgun Gothic, Apple SD Gothic Neo, system-ui, sans-serif";
        ctx.fillText(item, radius - 24, 0, radius * 0.58);
        ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(0, 0, 74, 0, Math.PI * 2);
    ctx.fillStyle = "#fff9ed";
    ctx.fill();
    ctx.strokeStyle = "rgba(59, 42, 29, 0.2)";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fillStyle = "#315f44";
    ctx.font = "900 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SPIN", 0, 0);
    ctx.restore();
}

function selectedIndex(rotation) {
    const count = state.items.length;
    const arc = (Math.PI * 2) / count;
    const pointerAngle = (Math.PI * 1.5 - rotation + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(pointerAngle / arc) % count;
}

function spin() {
    if (state.spinning || state.items.length === 0) return;

    const targetIndex = Math.floor(Math.random() * state.items.length);
    const arc = (Math.PI * 2) / state.items.length;
    const targetAngle = Math.PI * 1.5 - (targetIndex + 0.5) * arc;
    const fullTurns = 7 + Math.floor(Math.random() * 3);
    const startRotation = state.rotation;
    const endRotation = targetAngle + Math.PI * 2 * fullTurns;
    const start = performance.now();
    const duration = 4200;

    state.spinning = true;
    spinButton.disabled = true;
    updateResult("spinning");
    scheduleSpinSound(duration);

    function frame(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - (1 - progress) ** 4;
        state.rotation = startRotation + (endRotation - startRotation) * eased;
        drawWheel();

        if (progress < 1) {
            requestAnimationFrame(frame);
            return;
        }

        state.rotation %= Math.PI * 2;
        const index = selectedIndex(state.rotation);
        const result = state.items[index];
        const won = isWinningItem(result);
        state.spinning = false;
        clearInterval(state.spinSoundTimer);
        state.spinSoundTimer = null;
        updateResult(won ? "win" : "lose", result);
        won ? playWinSound() : playLoseSound();
        state.history.unshift(result);
        state.history = state.history.slice(0, 12);
        renderHistory();
        drawWheel(index);
        syncItems();
    }

    requestAnimationFrame(frame);
}

function renderHistory() {
    historyList.innerHTML = "";
    state.history.forEach((result) => {
        const item = document.createElement("li");
        const label = document.createElement("strong");
        label.textContent = result;
        item.className = isWinningItem(result) ? "history-win" : "history-lose";
        item.append(label);
        historyList.append(item);
    });
}

itemInput.addEventListener("input", syncItems);
spinButton.addEventListener("click", spin);
canvas.addEventListener("click", spin);
resetButton.addEventListener("click", () => {
    itemInput.value = DEFAULT_ITEMS.join("\n");
    updateResult("idle");
    syncItems();
});
clearHistoryButton.addEventListener("click", () => {
    state.history = [];
    renderHistory();
});

updateResult("idle");
syncItems();
