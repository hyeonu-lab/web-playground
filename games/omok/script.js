const boardElement = document.querySelector("#board");
const turnStone = document.querySelector("#turnStone");
const turnText = document.querySelector("#turnText");
const gameMessage = document.querySelector("#gameMessage");
const blackScoreElement = document.querySelector("#blackScore");
const whiteScoreElement = document.querySelector("#whiteScore");
const newGameButton = document.querySelector("#newGameButton");
const undoButton = document.querySelector("#undoButton");

const size = 15;
const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
];

let board = [];
let currentPlayer = "black";
let gameOver = false;
let moveHistory = [];
let messageResetTimer = null;
let messageLocked = false;
let scores = {
    black: 0,
    white: 0,
};

function createBoard() {
    clearTimeout(messageResetTimer);
    messageLocked = false;
    boardElement.innerHTML = "";
    board = Array.from({ length: size }, () => Array(size).fill(null));
    moveHistory = [];
    currentPlayer = "black";
    gameOver = false;

    for (let row = 0; row < size; row += 1) {
        for (let col = 0; col < size; col += 1) {
            const cell = document.createElement("button");
            cell.className = "cell";
            cell.type = "button";
            cell.dataset.row = row;
            cell.dataset.col = col;
            cell.setAttribute("aria-label", `${row + 1}행 ${col + 1}열`);
            boardElement.appendChild(cell);
        }
    }

    updateStatus();
}

function updateStatus(message) {
    const playerText = currentPlayer === "black" ? "흑돌" : "백돌";
    turnText.textContent = playerText;
    turnStone.className = `turn-stone ${currentPlayer}`;

    if (!messageLocked) {
        showGameMessage(message || `${playerText} 차례입니다.`);
    }

    blackScoreElement.textContent = scores.black;
    whiteScoreElement.textContent = scores.white;
}

function showGameMessage(message, type = "normal") {
    gameMessage.textContent = message;
    gameMessage.classList.toggle("message-error", type === "error");
}

function getCell(row, col) {
    return boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

function handleMove(event) {
    const cell = event.target.closest(".cell");

    if (!cell || gameOver) {
        return;
    }

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    if (board[row][col]) {
        return;
    }

    board[row][col] = currentPlayer;
    cell.classList.add(currentPlayer);
    cell.disabled = true;

    if (currentPlayer === "black") {
        const overlineLine = isOverline(row, col);

        if (overlineLine.length >= 6) {
            moveHistory.push({ row, col, player: currentPlayer });
            finishForbiddenGame("장목", row, col);
            return;
        }

        const forbiddenMove = findForbiddenMove(row, col);

        if (forbiddenMove) {
            moveHistory.push({ row, col, player: currentPlayer });
            finishForbiddenGame(forbiddenMove, row, col);
            return;
        }

        const blackWinLine = findExactWinLine(row, col, currentPlayer);

        if (blackWinLine.length === 5) {
            moveHistory.push({ row, col, player: currentPlayer });
            finishGame(blackWinLine);
            return;
        }
    }

    const winLine = findWinLine(row, col, currentPlayer);

    if (winLine.length >= 5) {
        moveHistory.push({ row, col, player: currentPlayer });
        finishGame(winLine);
        return;
    }

    moveHistory.push({ row, col, player: currentPlayer });

    if (moveHistory.length === size * size) {
        gameOver = true;
        updateStatus("무승부입니다. 새 게임을 시작하세요.");
        return;
    }

    currentPlayer = currentPlayer === "black" ? "white" : "black";
    updateStatus();
}

function findWinLine(row, col, player) {
    for (const [rowStep, colStep] of directions) {
        const line = getConnectedLine(row, col, rowStep, colStep, player);

        if (line.length >= 5) {
            return line;
        }
    }

    return [];
}

function findExactWinLine(row, col, player) {
    for (const [rowStep, colStep] of directions) {
        const line = getConnectedLine(row, col, rowStep, colStep, player);

        if (line.length === 5) {
            return line;
        }
    }

    return [];
}

function isOverline(row, col) {
    for (const [rowStep, colStep] of directions) {
        const line = getConnectedLine(row, col, rowStep, colStep, "black");

        if (line.length >= 6) {
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

function findForbiddenMove(row, col) {
    const fourCount = countFourThreats(row, col);

    if (fourCount >= 2) {
        return "44";
    }

    const threeCount = countOpenThreeThreats(row, col);

    if (threeCount >= 2) {
        return "33";
    }

    return null;
}

function countFourThreats(row, col) {
    let fourCount = 0;

    for (const [rowStep, colStep] of directions) {
        if (directionHasFiveThreat(row, col, rowStep, colStep)) {
            fourCount += 1;
        }

        console.log("현재 착수:", row, col);
        console.log("검사 방향:", rowStep, colStep);
        console.log("4 개수:", fourCount);
    }

    return fourCount;
}

function countOpenThreeThreats(row, col) {
    let threeCount = 0;

    for (const [rowStep, colStep] of directions) {
        if (directionHasOpenThreeThreat(row, col, rowStep, colStep)) {
            threeCount += 1;
        }

        console.log("현재 착수:", row, col);
        console.log("검사 방향:", rowStep, colStep);
        console.log("3 개수:", threeCount);
    }

    return threeCount;
}

function directionHasFiveThreat(row, col, rowStep, colStep) {
    for (let offset = -4; offset <= 4; offset += 1) {
        const nextRow = row + rowStep * offset;
        const nextCol = col + colStep * offset;

        if (!isOpenEnd(nextRow, nextCol)) {
            continue;
        }

        board[nextRow][nextCol] = "black";
        const makesFive = createsFive(nextRow, nextCol, rowStep, colStep);
        const containsMove = connectedLineContains(nextRow, nextCol, rowStep, colStep, row, col);
        board[nextRow][nextCol] = null;

        if (makesFive && containsMove) {
            return true;
        }
    }

    return false;
}

function directionHasOpenThreeThreat(row, col, rowStep, colStep) {
    for (let offset = -4; offset <= 4; offset += 1) {
        const nextRow = row + rowStep * offset;
        const nextCol = col + colStep * offset;

        if (!isOpenEnd(nextRow, nextCol)) {
            continue;
        }

        board[nextRow][nextCol] = "black";
        const makesOpenFour = createsOpenFour(nextRow, nextCol, rowStep, colStep);
        const containsMove = connectedLineContains(nextRow, nextCol, rowStep, colStep, row, col);
        board[nextRow][nextCol] = null;

        if (makesOpenFour && containsMove) {
            return true;
        }
    }

    return false;
}

function createsFive(row, col, rowStep, colStep) {
    return getConnectedCount(row, col, rowStep, colStep) === 5;
}

function createsOpenFour(row, col, rowStep, colStep) {
    const connectedCount = getConnectedCount(row, col, rowStep, colStep);

    if (connectedCount !== 4) {
        return false;
    }

    const forwardCount = countStones(row, col, rowStep, colStep);
    const backwardCount = countStones(row, col, -rowStep, -colStep);
    const forwardEndRow = row + rowStep * (forwardCount + 1);
    const forwardEndCol = col + colStep * (forwardCount + 1);
    const backwardEndRow = row - rowStep * (backwardCount + 1);
    const backwardEndCol = col - colStep * (backwardCount + 1);

    return isOpenEnd(forwardEndRow, forwardEndCol) && isOpenEnd(backwardEndRow, backwardEndCol);
}

function getConnectedCount(row, col, rowStep, colStep) {
    return (
        1 +
        countStones(row, col, rowStep, colStep) +
        countStones(row, col, -rowStep, -colStep)
    );
}

function connectedLineContains(row, col, rowStep, colStep, targetRow, targetCol) {
    const line = getConnectedLine(row, col, rowStep, colStep, "black");

    return line.some((stone) => stone.row === targetRow && stone.col === targetCol);
}

function countStones(row, col, rowStep, colStep) {
    let count = 0;
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (
        nextRow >= 0 &&
        nextRow < size &&
        nextCol >= 0 &&
        nextCol < size &&
        board[nextRow][nextCol] === "black"
    ) {
        count += 1;
        nextRow += rowStep;
        nextCol += colStep;
    }

    return count;
}

function isOpenEnd(row, col) {
    return row >= 0 && row < size && col >= 0 && col < size && board[row][col] === null;
}

function collectStones(row, col, rowStep, colStep, player) {
    const stones = [];
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (
        nextRow >= 0 &&
        nextRow < size &&
        nextCol >= 0 &&
        nextCol < size &&
        board[nextRow][nextCol] === player
    ) {
        stones.push({ row: nextRow, col: nextCol });
        nextRow += rowStep;
        nextCol += colStep;
    }

    return stones;
}

function finishGame(winLine) {
    gameOver = true;
    scores[currentPlayer] += 1;

    winLine.forEach(({ row, col }) => {
        getCell(row, col).classList.add("win");
    });

    updateStatus(`${currentPlayer === "black" ? "흑돌" : "백돌"} 승리!`);
}

function finishForbiddenGame(forbiddenMove, row, col) {
    gameOver = true;
    scores.white += 1;

    const cell = getCell(row, col);

    if (cell) {
        cell.classList.add("foul", "shake");

        window.setTimeout(() => {
            cell.classList.remove("shake");
        }, 800);
    }

    blackScoreElement.textContent = scores.black;
    whiteScoreElement.textContent = scores.white;
    messageLocked = true;
    showGameMessage(`${forbiddenMove} 금수입니다.`, "error");

    clearTimeout(messageResetTimer);
    messageResetTimer = window.setTimeout(() => {
        messageLocked = false;
        updateStatus("백돌 승리! 새 게임을 시작하세요.");
    }, 2000);
}

function undoMove() {
    if (moveHistory.length === 0 || gameOver) {
        return;
    }

    const lastMove = moveHistory.pop();
    board[lastMove.row][lastMove.col] = null;

    const cell = getCell(lastMove.row, lastMove.col);
    cell.className = "cell";
    cell.disabled = false;

    currentPlayer = lastMove.player;
    updateStatus("수를 물렸습니다.");
}

boardElement.addEventListener("click", handleMove);
newGameButton.addEventListener("click", createBoard);
undoButton.addEventListener("click", undoMove);

createBoard();
