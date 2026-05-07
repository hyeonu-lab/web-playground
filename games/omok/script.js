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

const openThreePatterns = [
    ".BBB.",
    ".BB.B.",
    ".B.BB.",
];

const fourPatterns = [
    "BBBB.",
    ".BBBB",
    "BBB.B",
    "BB.BB",
    "B.BBB",
];

let board = [];
let currentPlayer = "black";
let gameOver = false;
let moveHistory = [];
let scores = {
    black: 0,
    white: 0,
};

function createBoard() {
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
    gameMessage.textContent = message || `${playerText} 차례입니다.`;
    blackScoreElement.textContent = scores.black;
    whiteScoreElement.textContent = scores.white;
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
            alert("장목 금수입니다.");
            moveHistory.push({ row, col, player: currentPlayer });
            finishForbiddenGame("장목");
            return;
        }

        const forbiddenMove = findForbiddenMove(row, col);

        if (forbiddenMove) {
            alert(`${forbiddenMove} 금수입니다. 흑돌이 패배합니다.`);
            moveHistory.push({ row, col, player: currentPlayer });
            finishForbiddenGame(forbiddenMove);
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
    const { threeCount, fourCount } = countForbiddenPatterns(row, col);

    if (fourCount >= 2) {
        return "44";
    }

    if (threeCount >= 2) {
        return "33";
    }

    return null;
}

function countForbiddenPatterns(row, col) {
    let threeCount = 0;
    let fourCount = 0;
    const range = 5;

    for (const [rowStep, colStep] of directions) {
        const { values, centerIndex } = getLineValues(row, col, rowStep, colStep, range);
        const lineThreeCount = countCenteredPatterns(values, centerIndex, openThreePatterns);
        const lineFourCount = countCenteredPatterns(values, centerIndex, fourPatterns);

        if (lineThreeCount > 0) {
            threeCount += 1;
        }

        if (lineFourCount > 0) {
            fourCount += 1;
        }

        console.log("현재 착수:", row, col);
        console.log("검사 방향:", rowStep, colStep);
        console.log("라인:", values.join(""));
        console.log("3 개수:", threeCount);
        console.log("4 개수:", fourCount);
    }

    return { threeCount, fourCount };
}

function countCenteredPatterns(values, centerIndex, patterns) {
    let count = 0;

    for (const pattern of patterns) {
        if (includesPatternAtCenter(values, centerIndex, pattern)) {
            count += 1;
        }
    }

    return count;
}

function includesPatternAtCenter(values, centerIndex, pattern) {
    const line = values.join("");

    for (let start = 0; start <= line.length - pattern.length; start += 1) {
        const end = start + pattern.length - 1;

        if (centerIndex < start || centerIndex > end) {
            continue;
        }

        if (line.slice(start, start + pattern.length) === pattern) {
            return true;
        }
    }

    return false;
}

function getLineValues(row, col, rowStep, colStep, range = 5) {
    const values = [];

    for (let offset = -range; offset <= range; offset += 1) {
        const nextRow = row + rowStep * offset;
        const nextCol = col + colStep * offset;

        values.push(getCellValue(nextRow, nextCol));
    }

    return {
        values,
        centerIndex: range,
    };
}

function getCellValue(row, col) {
    if (row < 0 || row >= size || col < 0 || col >= size) {
        return "W";
    }

    if (board[row][col] === "black") {
        return "B";
    }

    if (board[row][col] === "white") {
        return "W";
    }

    return ".";
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

function finishForbiddenGame(forbiddenMove) {
    gameOver = true;
    scores.white += 1;
    updateStatus(`흑돌 ${forbiddenMove} 금수입니다. 백돌 승리!`);
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
