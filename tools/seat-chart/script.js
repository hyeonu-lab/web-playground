const STORAGE_KEY = "web-playground-seat-chart";
const STORAGE_VERSION = 5;
const SHUFFLE_DURATION = 1000;
const SHUFFLE_ROUNDS = 3;

// 기본 설정은 localStorage에 저장된 값이 없거나 저장 버전이 바뀐 경우에만 사용된다.
const defaultState = {
    storageVersion: STORAGE_VERSION,
    title: "학급 명을 입력해주세요",
    names: "",
    groupCount: 2,
    cols: 2,
    rows: 5,
    shuffledNames: [],
    revealMode: false,
    revealedSeats: [],
};

// DOM 참조는 한 곳에 모아 두어 HTML id 변경 시 이 객체만 먼저 확인하면 된다.
const elements = {
    classTitleInput: document.querySelector("#classTitleInput"),
    panelTitleInput: document.querySelector("#panelTitleInput"),
    studentNamesInput: document.querySelector("#studentNamesInput"),
    groupCountInput: document.querySelector("#groupCountInput"),
    colsInput: document.querySelector("#colsInput"),
    rowsInput: document.querySelector("#rowsInput"),
    shuffleSeatsButton: document.querySelector("#shuffleSeatsButton"),
    printButton: document.querySelector("#printButton"),
    resetButton: document.querySelector("#resetButton"),
    seatArea: document.querySelector("#seatArea"),
    unassignedArea: document.querySelector("#unassignedArea"),
    statusMessage: document.querySelector("#statusMessage"),
};

let state = loadState();
let isShuffling = false;
let shuffleTimer = null;

document.documentElement.style.setProperty("--shuffle-duration", `${SHUFFLE_DURATION}ms`);

// -----------------------------
// Storage
// -----------------------------

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved?.storageVersion !== STORAGE_VERSION) {
            return { ...defaultState };
        }

        return saved ? { ...defaultState, ...saved } : { ...defaultState };
    } catch {
        return { ...defaultState };
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// -----------------------------
// Data helpers
// -----------------------------

function parseNames(value) {
    return value
        .split(/\n/)
        .map((name) => name.trim())
        .filter(Boolean);
}

function numberFromInput(input, min, max) {
    const value = Number(input.value);
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.max(min, Math.min(max, Math.floor(value)));
}

function optionalNumberFromInput(input, currentValue, min, max) {
    if (input.value === "") {
        return currentValue;
    }

    return numberFromInput(input, min, max);
}

function shuffleNames(names) {
    const result = [...names];

    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }

    return result;
}

function shuffledSeatOrder(source) {
    // 빈 책상 위치는 유지하고, 이름이 있는 책상끼리만 섞는다.
    const filledNames = shuffleNames(source.map((name) => name.trim()).filter(Boolean));
    let filledIndex = 0;

    return source.map((name) => {
        if (!name.trim()) {
            return "";
        }

        const nextName = filledNames[filledIndex];
        filledIndex += 1;
        return nextName;
    });
}

function totalSeatCount() {
    return state.groupCount * state.cols * state.rows;
}

function currentSeatSource() {
    const names = parseNames(state.names);
    return state.shuffledNames.length > 0 ? state.shuffledNames : names;
}

function assignedNames() {
    return currentSeatSource()
        .map((name) => name.trim())
        .filter(Boolean);
}

// -----------------------------
// Input/state sync
// -----------------------------

function syncInputsFromState() {
    elements.classTitleInput.value = state.title;
    elements.panelTitleInput.value = state.title;
    elements.studentNamesInput.value = state.names;
    elements.groupCountInput.value = state.groupCount;
    elements.colsInput.value = state.cols;
    elements.rowsInput.value = state.rows;
}

function syncStateFromInputs({ commitNumbers = false } = {}) {
    state.names = elements.studentNamesInput.value;
    state.groupCount = optionalNumberFromInput(elements.groupCountInput, state.groupCount, 1, 6);
    state.cols = optionalNumberFromInput(elements.colsInput, state.cols, 1, 4);
    state.rows = optionalNumberFromInput(elements.rowsInput, state.rows, 1, 8);

    if (commitNumbers) {
        elements.groupCountInput.value = state.groupCount;
        elements.colsInput.value = state.cols;
        elements.rowsInput.value = state.rows;
    }
}

// -----------------------------
// Render helpers
// -----------------------------

function seatAssignments() {
    const names = assignedNames();
    const sourceNames = currentSeatSource();
    const seats = totalSeatCount();

    return {
        names,
        placed: sourceNames.slice(0, seats),
        unassigned: sourceNames.slice(seats),
        emptyCount: Math.max(0, seats - sourceNames.length),
        seats,
    };
}

function createDeskCard(name, seatNumber, seatIndex) {
    const card = document.createElement("div");

    card.className = name ? "desk-card" : "desk-card empty";
    card.dataset.seatIndex = String(seatIndex);
    card.dataset.studentName = name || "";
    card.setAttribute("role", "listitem");
    card.setAttribute("aria-label", name ? `${seatNumber}번 좌석 ${name}` : `${seatNumber}번 좌석 빈자리`);

    if (state.revealMode && state.revealedSeats.includes(seatIndex)) {
        card.classList.add("revealed");
    }

    if (state.revealMode && !state.revealedSeats.includes(seatIndex)) {
        card.classList.add("hidden");
        card.textContent = "?";
        card.setAttribute("aria-label", `${seatNumber}번 좌석 결과 숨김`);
        return card;
    }

    const input = document.createElement("input");
    input.className = "desk-name-input";
    input.type = "text";
    input.value = name || "";
    input.placeholder = "빈자리";
    input.dataset.seatIndex = String(seatIndex);
    input.setAttribute("aria-label", `${seatNumber}번 좌석 학생 이름`);
    card.append(input);
    return card;
}

function renderSeats() {
    const { placed, seats } = seatAssignments();
    elements.seatArea.innerHTML = "";
    elements.seatArea.style.gridTemplateColumns = `repeat(${state.groupCount}, minmax(0, 1fr))`;

    for (let groupIndex = 0; groupIndex < state.groupCount; groupIndex += 1) {
        const group = document.createElement("section");
        const title = document.createElement("h2");
        const grid = document.createElement("div");

        group.className = "seat-group";
        title.className = "seat-group-title";
        title.textContent = `${groupIndex + 1}분단`;
        grid.className = "seat-grid";
        grid.style.gridTemplateColumns = `repeat(${state.cols}, minmax(86px, 1fr))`;
        grid.setAttribute("role", "list");

        for (let seatIndex = 0; seatIndex < state.cols * state.rows; seatIndex += 1) {
            const globalIndex = groupIndex * state.cols * state.rows + seatIndex;
            grid.append(createDeskCard(placed[globalIndex], globalIndex + 1, globalIndex));
        }

        group.append(title, grid);
        elements.seatArea.append(group);
    }

    if (seats === 0) {
        elements.seatArea.textContent = "좌석 설정을 입력해 주세요.";
    }
}

function renderUnassigned() {
    const { unassigned } = seatAssignments();
    elements.unassignedArea.innerHTML = "";
    elements.unassignedArea.classList.toggle("visible", unassigned.length > 0);

    if (unassigned.length === 0) {
        return;
    }

    const title = document.createElement("p");
    const list = document.createElement("ul");

    title.className = "unassigned-title";
    title.textContent = "배치되지 않은 학생";
    list.className = "unassigned-list";

    unassigned.forEach((name) => {
        const item = document.createElement("li");
        item.textContent = name;
        list.append(item);
    });

    elements.unassignedArea.append(title, list);
}

function renderStatus() {
    const { names, unassigned, emptyCount, seats } = seatAssignments();
    elements.statusMessage.classList.toggle("warning", unassigned.length > 0);

    if (isShuffling) {
        elements.statusMessage.textContent = "카드를 뒤집어 섞고 있습니다.";
        return;
    }

    if (state.revealMode) {
        elements.statusMessage.textContent = "셔플이 끝났습니다. 책상 카드를 하나씩 눌러 이름을 확인하세요.";
        return;
    }

    if (names.length === 0) {
        elements.statusMessage.textContent = "책상에 직접 학생 이름을 입력하면 자리표가 생성됩니다.";
        return;
    }

    if (unassigned.length > 0) {
        elements.statusMessage.textContent = `좌석 ${seats}개보다 학생이 ${unassigned.length}명 더 많습니다. 아래에 배치되지 않은 학생을 흐리게 표시했습니다.`;
        return;
    }

    if (emptyCount > 0) {
        elements.statusMessage.textContent = `학생 ${names.length}명을 배치했습니다. 남은 ${emptyCount}개 좌석은 빈자리로 표시됩니다.`;
        return;
    }

    elements.statusMessage.textContent = `학생 ${names.length}명이 모든 좌석에 배치되었습니다.`;
}

function render() {
    renderSeats();
    renderUnassigned();
    renderStatus();
}

// -----------------------------
// Seat order updates
// -----------------------------

function normalizeSeatOrder(list) {
    return list.map((name) => name.trim());
}

function updateTextareaFromSeatOrder() {
    state.names = assignedNames().join("\n");
    elements.studentNamesInput.value = state.names;
}

// -----------------------------
// Shuffle animation
// -----------------------------

function wait(ms) {
    return new Promise((resolve) => {
        shuffleTimer = window.setTimeout(resolve, ms);
    });
}

function shuffledIndexes(length) {
    return shuffleNames(Array.from({ length }, (_, index) => index));
}

function applyShuffleAnimationRound() {
    const cards = [...elements.seatArea.querySelectorAll(".desk-card")];
    const rects = cards.map((card) => card.getBoundingClientRect());
    const targets = shuffledIndexes(cards.length);

    cards.forEach((card, index) => {
        const currentRect = rects[index];
        const targetRect = rects[targets[index]];
        const x = targetRect.left - currentRect.left + (Math.random() - 0.5) * 36;
        const y = targetRect.top - currentRect.top + (Math.random() - 0.5) * 28;
        const x2 = x * 0.45 + (Math.random() - 0.5) * 70;
        const y2 = y * 0.45 + (Math.random() - 0.5) * 54;
        const rotate = (Math.random() - 0.5) * 16;
        const delay = Math.min(index * 8, 80);

        card.classList.remove("shuffling");
        void card.offsetWidth;
        card.classList.add("shuffling");
        card.style.setProperty("--shuffle-x", `${x}px`);
        card.style.setProperty("--shuffle-y", `${y}px`);
        card.style.setProperty("--shuffle-x2", `${x2}px`);
        card.style.setProperty("--shuffle-y2", `${y2}px`);
        card.style.setProperty("--shuffle-rotate", `${rotate}deg`);
        card.style.animationDelay = `${delay}ms`;
        card.style.zIndex = String(100 + index);
    });
}

async function runShuffleAnimation(seatOrder) {
    for (let round = 0; round < SHUFFLE_ROUNDS; round += 1) {
        applyShuffleAnimationRound();
        await wait(SHUFFLE_DURATION + 120);
    }

    state.shuffledNames = shuffledSeatOrder(seatOrder);
    state.revealMode = true;
    state.revealedSeats = [];
    updateTextareaFromSeatOrder();
    isShuffling = false;
    elements.shuffleSeatsButton.disabled = false;
    saveState();
    render();
}

// -----------------------------
// Event handlers
// -----------------------------

function handleSettingChange() {
    syncStateFromInputs();
    state.revealMode = false;
    state.revealedSeats = [];

    const names = assignedNames();
    const currentNames = new Set(names);
    const keptNames = state.shuffledNames.filter((name) => currentNames.has(name));
    const keptSet = new Set(keptNames);
    const addedNames = names.filter((name) => !keptSet.has(name));
    state.shuffledNames = state.shuffledNames.length > 0 ? [...keptNames, ...addedNames] : [];
    saveState();
    render();
}

function handleTitleInput(sourceInput, targetInput) {
    state.title = sourceInput.value;
    targetInput.value = state.title;
    saveState();
}

function handleNumberCommit() {
    syncStateFromInputs({ commitNumbers: true });
    state.revealMode = false;
    state.revealedSeats = [];
    saveState();
    render();
}

function handleShuffle() {
    if (isShuffling) {
        return;
    }

    syncStateFromInputs();
    const names = assignedNames();

    if (names.length === 0) {
        elements.statusMessage.classList.add("warning");
        elements.statusMessage.textContent = "섞을 학생 이름을 먼저 책상에 입력해 주세요.";
        return;
    }

    const source = currentSeatSource();
    const seats = totalSeatCount();
    const seatOrder = Array.from({ length: Math.max(source.length, seats) }, (_, index) => source[index] || "");
    isShuffling = true;
    state.revealMode = true;
    state.revealedSeats = [];
    elements.shuffleSeatsButton.disabled = true;
    saveState();
    render();
    renderStatus();
    runShuffleAnimation(seatOrder);
}

function handlePrint() {
    if (isShuffling) {
        return;
    }

    syncStateFromInputs({ commitNumbers: true });
    state.revealMode = false;
    state.revealedSeats = [];
    saveState();
    render();

    window.requestAnimationFrame(() => {
        window.print();
    });
}

function handleReset() {
    window.clearTimeout(shuffleTimer);
    isShuffling = false;
    state = { ...defaultState, shuffledNames: [], revealMode: false, revealedSeats: [] };
    elements.shuffleSeatsButton.disabled = false;
    syncInputsFromState();
    saveState();
    render();
}

function handleDeskInputChange(input) {
    const seatIndex = Number(input.dataset.seatIndex);
    const seats = totalSeatCount();
    const source = currentSeatSource();
    const nextOrder = Array.from({ length: Math.max(source.length, seats) }, (_, index) => source[index] || "");

    nextOrder[seatIndex] = input.value.trim();
    state.shuffledNames = normalizeSeatOrder(nextOrder);
    state.revealMode = false;
    state.revealedSeats = [];
    updateTextareaFromSeatOrder();
    saveState();
    render();
}

function handleSeatReveal(card) {
    const seatIndex = Number(card.dataset.seatIndex);

    if (isShuffling || !state.revealMode || state.revealedSeats.includes(seatIndex)) {
        return;
    }

    card.classList.add("revealing");
    window.setTimeout(() => {
        state.revealedSeats.push(seatIndex);

        if (state.revealedSeats.length >= totalSeatCount()) {
            state.revealMode = false;
            state.revealedSeats = [];
        }

        saveState();
        render();
    }, 260);
}

// -----------------------------
// Event binding
// -----------------------------

elements.panelTitleInput.addEventListener("input", () => {
    handleTitleInput(elements.panelTitleInput, elements.classTitleInput);
});
elements.classTitleInput.addEventListener("input", () => {
    handleTitleInput(elements.classTitleInput, elements.panelTitleInput);
});
elements.studentNamesInput.addEventListener("input", handleSettingChange);
elements.groupCountInput.addEventListener("input", handleSettingChange);
elements.groupCountInput.addEventListener("change", handleNumberCommit);
elements.groupCountInput.addEventListener("blur", handleNumberCommit);
elements.colsInput.addEventListener("input", handleSettingChange);
elements.colsInput.addEventListener("change", handleNumberCommit);
elements.colsInput.addEventListener("blur", handleNumberCommit);
elements.rowsInput.addEventListener("input", handleSettingChange);
elements.rowsInput.addEventListener("change", handleNumberCommit);
elements.rowsInput.addEventListener("blur", handleNumberCommit);
elements.shuffleSeatsButton.addEventListener("click", handleShuffle);
elements.printButton.addEventListener("click", handlePrint);
elements.resetButton.addEventListener("click", handleReset);

elements.seatArea.addEventListener("click", (event) => {
    const card = event.target.closest(".desk-card");

    if (card) {
        handleSeatReveal(card);
    }
});

elements.seatArea.addEventListener("change", (event) => {
    if (event.target.matches(".desk-name-input")) {
        handleDeskInputChange(event.target);
    }
});

elements.seatArea.addEventListener("keydown", (event) => {
    if (event.target.matches(".desk-name-input") && event.key === "Enter") {
        event.preventDefault();
        event.target.blur();
    }
});

syncInputsFromState();
render();
