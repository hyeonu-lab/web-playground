const boardElement = document.querySelector("#board");
const turnStone = document.querySelector("#turnStone");
const turnText = document.querySelector("#turnText");
const gameMessage = document.querySelector("#gameMessage");
const blackScoreElement = document.querySelector("#blackScore");
const whiteScoreElement = document.querySelector("#whiteScore");
const newGameButton = document.querySelector("#newGameButton");
const undoButton = document.querySelector("#undoButton");
const header = document.querySelector(".site-header");

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
            rollbackMove(row, col);
            alert("장목 금수입니다. 흑돌이 6개 이상 연속되어 백돌이 이깁니다.");
            finishForbiddenGame("장목");
            return;
        }

        const blackWinLine = findExactWinLine(row, col, currentPlayer);

        if (blackWinLine.length === 5) {
            moveHistory.push({ row, col, player: currentPlayer });
            finishGame(blackWinLine);
            return;
        }

        const forbiddenMove = findForbiddenMove(row, col);

        if (forbiddenMove) {
            rollbackMove(row, col);
            alert(`${forbiddenMove} 금수입니다.`);
            updateStatus(`흑돌 ${forbiddenMove} 금수입니다. 다른 칸을 선택하세요.`);
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
        const line = [{ row, col }];

        line.push(...collectStones(row, col, rowStep, colStep, player));
        line.unshift(...collectStones(row, col, -rowStep, -colStep, player).reverse());

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

function findOverline(row, col) {
    for (const [rowStep, colStep] of directions) {
        const line = getConnectedLine(row, col, rowStep, colStep, "black");

        if (line.length >= 6) {
            return line;
        }
    }

    return [];
}

function isOverline(row, col) {
    return findOverline(row, col);
}

function getConnectedLine(row, col, rowStep, colStep, player) {
    const line = [{ row, col }];

    line.push(...collectStones(row, col, rowStep, colStep, player));
    line.unshift(...collectStones(row, col, -rowStep, -colStep, player).reverse());

    return line;
}

function findForbiddenMove(row, col) {
    const openThreeCount = countOpenLines(row, col, 3);

    if (isDoubleThree(openThreeCount)) {
        return "33";
    }

    const openFourCount = countOpenLines(row, col, 4);

    if (isDoubleFour(openFourCount)) {
        return "44";
    }

    return null;
}

function isDoubleThree(openThreeCount) {
    return openThreeCount >= 2;
}

function isDoubleFour(openFourCount) {
    return openFourCount >= 2;
}

function countOpenLines(row, col, targetLength) {
    return directions.filter(([rowStep, colStep]) => {
        const line = getConnectedLine(row, col, rowStep, colStep, "black");

        if (line.length !== targetLength) {
            return false;
        }

        const firstStone = line[0];
        const lastStone = line[line.length - 1];
        const beforeRow = firstStone.row - rowStep;
        const beforeCol = firstStone.col - colStep;
        const afterRow = lastStone.row + rowStep;
        const afterCol = lastStone.col + colStep;

        return isEmptyCell(beforeRow, beforeCol) && isEmptyCell(afterRow, afterCol);
    }).length;
}

function isEmptyCell(row, col) {
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

function finishForbiddenGame(forbiddenMove) {
    gameOver = true;
    scores.white += 1;
    updateStatus(`흑돌 ${forbiddenMove} 금수입니다. 백돌 승리!`);
}

function rollbackMove(row, col) {
    board[row][col] = null;

    const cell = getCell(row, col);
    cell.className = "cell";
    cell.disabled = false;
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
    updateStatus("한 수 물렸습니다.");
}

window.addEventListener("scroll", () => {
    const isScrolled = window.scrollY > 24;
    header.style.borderBottom = isScrolled ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid transparent";
});

boardElement.addEventListener("click", handleMove);
newGameButton.addEventListener("click", createBoard);
undoButton.addEventListener("click", undoMove);

createBoard();
