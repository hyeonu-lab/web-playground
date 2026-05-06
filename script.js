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
    moveHistory.push({ row, col, player: currentPlayer });
    cell.classList.add(currentPlayer);
    cell.disabled = true;

    const winLine = findWinLine(row, col, currentPlayer);

    if (winLine.length >= 5) {
        finishGame(winLine);
        return;
    }

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
