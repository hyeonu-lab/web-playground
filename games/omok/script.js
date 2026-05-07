const boardElement = document.querySelector("#board");
const turnStone = document.querySelector("#turnStone");
const turnText = document.querySelector("#turnText");
const gameMessage = document.querySelector("#gameMessage");
const blackScoreElement = document.querySelector("#blackScore");
const whiteScoreElement = document.querySelector("#whiteScore");
const newGameButton = document.querySelector("#newGameButton");
const undoButton = document.querySelector("#undoButton");

const BOARD_SIZE = 15;
const BLACK = "black";
const WHITE = "white";
const DIRECTIONS = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
];

let board = [];
let currentPlayer = BLACK;
let gameOver = false;
let inputLocked = false;
let history = [];
let scores = {
    [BLACK]: 0,
    [WHITE]: 0,
};
let messageTimer = null;

function initGame() {
    clearTimeout(messageTimer);
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
    currentPlayer = BLACK;
    gameOver = false;
    inputLocked = false;
    history = [];
    renderBoard();
    updateStatus();
}

function renderBoard() {
    boardElement.innerHTML = "";

    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            const cell = document.createElement("button");
            cell.className = "cell";
            cell.type = "button";
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.setAttribute("aria-label", `${row + 1}행 ${col + 1}열`);
            boardElement.appendChild(cell);
        }
    }
}

function updateStatus(message) {
    const playerText = currentPlayer === BLACK ? "흑돌" : "백돌";
    turnText.textContent = playerText;
    turnStone.className = `turn-stone ${currentPlayer}`;
    showGameMessage(message || `${playerText} 차례입니다.`);
    blackScoreElement.textContent = scores[BLACK];
    whiteScoreElement.textContent = scores[WHITE];
}

function showGameMessage(message, type = "normal") {
    gameMessage.textContent = message;
    gameMessage.classList.toggle("message-error", type === "error");
}

function handleBoardClick(event) {
    const cell = event.target.closest(".cell");

    if (!cell || gameOver || inputLocked) {
        return;
    }

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    if (!isEmpty(row, col)) {
        return;
    }

    placeStone(row, col, currentPlayer);
    history.push({ row, col, player: currentPlayer });

    if (currentPlayer === BLACK) {
        const forbiddenMove = getForbiddenMove(row, col);

        if (forbiddenMove) {
            history.pop();
            handleForbiddenMove(row, col, forbiddenMove);
            return;
        }

        const blackLine = getExactFiveLine(row, col, BLACK);

        if (blackLine.length === 5) {
            finishGame(blackLine, BLACK);
            return;
        }
    } else {
        const whiteLine = getWinLine(row, col, WHITE);

        if (whiteLine.length >= 5) {
            finishGame(whiteLine, WHITE);
            return;
        }
    }

    if (history.length === BOARD_SIZE * BOARD_SIZE) {
        gameOver = true;
        updateStatus("무승부입니다. 새 게임을 시작하세요.");
        return;
    }

    currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
    updateStatus();
}

function placeStone(row, col, player) {
    board[row][col] = player;
    const cell = getCell(row, col);
    cell.classList.remove("foul", "shake");
    cell.classList.add(player);
    cell.disabled = true;
}

function removeStone(row, col) {
    board[row][col] = null;
    const cell = getCell(row, col);
    cell.className = "cell";
    cell.disabled = false;
}

function handleForbiddenMove(row, col, forbiddenMove) {
    const cell = getCell(row, col);
    inputLocked = true;
    cell.classList.remove(BLACK);
    cell.classList.add("foul", "shake");
    showGameMessage(`${forbiddenMove} 금수입니다.`, "error");

    clearTimeout(messageTimer);
    messageTimer = window.setTimeout(() => {
        removeStone(row, col);
        inputLocked = false;
        updateStatus();
    }, 800);
}

function finishGame(winLine, winner) {
    gameOver = true;
    scores[winner] += 1;

    winLine.forEach(({ row, col }) => {
        getCell(row, col).classList.add("win");
    });

    updateStatus(`${winner === BLACK ? "흑돌" : "백돌"} 승리!`);
}

function undoMove() {
    if (history.length === 0 || gameOver) {
        return;
    }

    const lastMove = history.pop();
    removeStone(lastMove.row, lastMove.col);
    currentPlayer = lastMove.player;
    updateStatus("수를 물렸습니다.");
}

function getForbiddenMove(row, col) {
    if (isOverline(row, col)) {
        return "장목";
    }

    if (countFourThreats(row, col) >= 2) {
        return "44";
    }

    if (countOpenThreeThreats(row, col) >= 2) {
        return "33";
    }

    return null;
}

function isOverline(row, col) {
    return DIRECTIONS.some(([rowStep, colStep]) => (
        getConnectedLine(row, col, rowStep, colStep, BLACK).length >= 6
    ));
}

function countFourThreats(row, col) {
    return DIRECTIONS.filter(([rowStep, colStep]) => (
        directionCreatesFive(row, col, rowStep, colStep)
    )).length;
}

function countOpenThreeThreats(row, col) {
    return DIRECTIONS.filter(([rowStep, colStep]) => (
        directionCreatesOpenFour(row, col, rowStep, colStep)
    )).length;
}

function directionCreatesFive(row, col, rowStep, colStep) {
    for (let offset = -4; offset <= 4; offset += 1) {
        const nextRow = row + rowStep * offset;
        const nextCol = col + colStep * offset;

        if (!isEmpty(nextRow, nextCol)) {
            continue;
        }

        board[nextRow][nextCol] = BLACK;
        const createsFive = getConnectedCount(nextRow, nextCol, rowStep, colStep) === 5;
        const includesOriginalMove = connectedLineContains(nextRow, nextCol, rowStep, colStep, row, col);
        board[nextRow][nextCol] = null;

        if (createsFive && includesOriginalMove) {
            return true;
        }
    }

    return false;
}

function directionCreatesOpenFour(row, col, rowStep, colStep) {
    for (let offset = -4; offset <= 4; offset += 1) {
        const nextRow = row + rowStep * offset;
        const nextCol = col + colStep * offset;

        if (!isEmpty(nextRow, nextCol)) {
            continue;
        }

        board[nextRow][nextCol] = BLACK;
        const createsOpenFour = isOpenFour(nextRow, nextCol, rowStep, colStep);
        const includesOriginalMove = connectedLineContains(nextRow, nextCol, rowStep, colStep, row, col);
        board[nextRow][nextCol] = null;

        if (createsOpenFour && includesOriginalMove) {
            return true;
        }
    }

    return false;
}

function isOpenFour(row, col, rowStep, colStep) {
    if (getConnectedCount(row, col, rowStep, colStep) !== 4) {
        return false;
    }

    const forwardCount = countStones(row, col, rowStep, colStep);
    const backwardCount = countStones(row, col, -rowStep, -colStep);
    const forwardEndRow = row + rowStep * (forwardCount + 1);
    const forwardEndCol = col + colStep * (forwardCount + 1);
    const backwardEndRow = row - rowStep * (backwardCount + 1);
    const backwardEndCol = col - colStep * (backwardCount + 1);

    return isEmpty(forwardEndRow, forwardEndCol) && isEmpty(backwardEndRow, backwardEndCol);
}

function getExactFiveLine(row, col, player) {
    for (const [rowStep, colStep] of DIRECTIONS) {
        const line = getConnectedLine(row, col, rowStep, colStep, player);

        if (line.length === 5) {
            return line;
        }
    }

    return [];
}

function getWinLine(row, col, player) {
    for (const [rowStep, colStep] of DIRECTIONS) {
        const line = getConnectedLine(row, col, rowStep, colStep, player);

        if (line.length >= 5) {
            return line;
        }
    }

    return [];
}

function getConnectedLine(row, col, rowStep, colStep, player) {
    const line = [{ row, col }];

    line.push(...collectStones(row, col, rowStep, colStep, player));
    line.unshift(...collectStones(row, col, -rowStep, -colStep, player).reverse());

    return line;
}

function getConnectedCount(row, col, rowStep, colStep) {
    return (
        1 +
        countStones(row, col, rowStep, colStep) +
        countStones(row, col, -rowStep, -colStep)
    );
}

function connectedLineContains(row, col, rowStep, colStep, targetRow, targetCol) {
    return getConnectedLine(row, col, rowStep, colStep, BLACK)
        .some((stone) => stone.row === targetRow && stone.col === targetCol);
}

function collectStones(row, col, rowStep, colStep, player) {
    const stones = [];
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (isInside(nextRow, nextCol) && board[nextRow][nextCol] === player) {
        stones.push({ row: nextRow, col: nextCol });
        nextRow += rowStep;
        nextCol += colStep;
    }

    return stones;
}

function countStones(row, col, rowStep, colStep) {
    let count = 0;
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (isInside(nextRow, nextCol) && board[nextRow][nextCol] === BLACK) {
        count += 1;
        nextRow += rowStep;
        nextCol += colStep;
    }

    return count;
}

function isEmpty(row, col) {
    return isInside(row, col) && board[row][col] === null;
}

function isInside(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getCell(row, col) {
    return boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

boardElement.addEventListener("click", handleBoardClick);
newGameButton.addEventListener("click", initGame);
undoButton.addEventListener("click", undoMove);

initGame();
