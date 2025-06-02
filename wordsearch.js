const canvas = document.getElementById('wordSearchCanvas');
const ctx = canvas.getContext('2d');
const wordListElement = document.getElementById('word-list');
const restartButton = document.getElementById('restart-button');
const victoryRestartButton = document.getElementById('victory-restart-button');
const victoryMessage = document.getElementById('victory-message');
const timerDisplay = document.getElementById('timer-display');
const startButton = document.getElementById('start-button');
const exitButton = document.getElementById('exit-button');
const startOverlay = document.getElementById('start-overlay');
const confettiContainer = document.querySelector('.body-wordsearch');

let confettiInterval;

const acertoSound = new Audio('sons/acerto.mp3');
const vitoriaSound = new Audio('sons/vitoria.mp3');

const gridSize = 12;
const cellSize = canvas.width / gridSize;
let grid = [];
let selected = [];
let foundWords = [];
let startX, startY, endX, endY;
let words = [];
let timer;
let timeLeft = 300; // 5 minutos
let gameRunning = false;

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${cellSize * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            ctx.fillStyle = '#000';
            ctx.fillText(grid[row][col], col * cellSize + cellSize / 2, row * cellSize + cellSize / 2);
        }
    }
    selected.forEach(cell => {
        ctx.fillStyle = cell.color;
        ctx.beginPath();
        ctx.arc(cell.x * cellSize + cellSize / 2, cell.y * cellSize + cellSize / 2, cellSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#FFF';
        ctx.fillText(grid[cell.y][cell.x], cell.x * cellSize + cellSize / 2, cell.y * cellSize + cellSize / 2);
    });
}

function placeWords(words) {
    words.forEach(word => {
        let placed = false;
        while (!placed) {
            const dir = Math.floor(Math.random() * 8);
            const x = Math.floor(Math.random() * gridSize);
            const y = Math.floor(Math.random() * gridSize);
            if (canPlaceWord(word, x, y, dir)) {
                for (let i = 0; i < word.length; i++) {
                    const [dx, dy] = getDirection(dir);
                    grid[y + i * dy][x + i * dx] = word[i];
                }
                placed = true;
            }
        }
    });
}

function canPlaceWord(word, x, y, dir) {
    const [dx, dy] = getDirection(dir);
    for (let i = 0; i < word.length; i++) {
        const nx = x + i * dx;
        const ny = y + i * dy;
        if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) return false;
        if (grid[ny][nx] !== '' && grid[ny][nx] !== word[i]) return false;
    }
    return true;
}

function getDirection(dir) {
    const directions = [
        [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1], [-1, 1]
    ];
    return directions[dir];
}

function fillGrid() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            if (grid[row][col] === '') {
                grid[row][col] = letters[Math.floor(Math.random() * letters.length)];
            }
        }
    }
}

function generateGrid() {
    grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(''));
    words = generateWordList();
    placeWords(words);
    fillGrid();
}

function generateWordList() {
    const allWords = ['ABRAAO', 'MOISES', 'DAVID', 'GOLIAS', 'ESTER', 'RUTE', 'NOE', 'PAULO', 'PEDRO', 'JESUS'];
    return allWords.sort(() => 0.5 - Math.random()).slice(0, 10);
}

function initializeGame() {
    generateGrid();
    foundWords = [];
    selected = [];
    timeLeft = 300;
    updateWordList();
    drawGrid();
    gameRunning = true;
    startTimer();
    victoryMessage.style.display = 'none';
}

function updateWordList() {
    wordListElement.innerHTML = '';
    words.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word;
        wordListElement.appendChild(li);
    });
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = `Tempo: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            gameRunning = false;
            alert('Tempo esgotado!');
        }
    }, 1000);
}

function checkSelection() {
    if (!startX || !startY || !endX || !endY) return;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.max(Math.abs(dx), Math.abs(dy)) + 1;

    const word = [];
    const selection = [];
    const color = getRandomColor();

    for (let i = 0; i < length; i++) {
        const x = startX + (dx === 0 ? 0 : dx / Math.abs(dx)) * i;
        const y = startY + (dy === 0 ? 0 : dy / Math.abs(dy)) * i;
        if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;
        word.push(grid[y][x]);
        selection.push({ x, y, color });
    }

    const selectedWord = word.join('');
    if (words.includes(selectedWord) && !foundWords.includes(selectedWord)) {
        foundWords.push(selectedWord);
        selected.push(...selection);
        updateWordList();
        acertoSound.play();

        if (foundWords.length === words.length) {
            clearInterval(timer);
            gameRunning = false;
            vitoriaSound.play();
            launchConfetti();
            victoryMessage.style.display = 'block';
        }
    }
    drawGrid();
}

function getCellFromCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / cellSize);
    const y = Math.floor((clientY - rect.top) / cellSize);
    return { x, y };
}

// PC
canvas.addEventListener('mousedown', e => {
    if (!gameRunning) return;
    const pos = getCellFromCoords(e.clientX, e.clientY);
    startX = pos.x;
    startY = pos.y;
});

canvas.addEventListener('mouseup', e => {
    if (!gameRunning) return;
    const pos = getCellFromCoords(e.clientX, e.clientY);
    endX = pos.x;
    endY = pos.y;
    checkSelection();
});

// Celular
canvas.addEventListener('touchstart', e => {
    if (!gameRunning) return;
    const touch = e.touches[0];
    const pos = getCellFromCoords(touch.clientX, touch.clientY);
    startX = pos.x;
    startY = pos.y;
});

canvas.addEventListener('touchend', e => {
    if (!gameRunning) return;
    const touch = e.changedTouches[0];
    const pos = getCellFromCoords(touch.clientX, touch.clientY);
    endX = pos.x;
    endY = pos.y;
    checkSelection();
});

restartButton.addEventListener('click', () => {
    clearInterval(confettiInterval);
    confettiContainer.innerHTML = '';
    initializeGame();
});

victoryRestartButton.addEventListener('click', () => {
    victoryMessage.style.display = 'none';
    clearInterval(confettiInterval);
    confettiContainer.innerHTML = '';
    initializeGame();
});

startButton.addEventListener('click', () => {
    startOverlay.style.display = 'none';
    initializeGame();
});

exitButton.addEventListener('click', () => {
    location.reload();
});

function launchConfetti() {
    confettiInterval = setInterval(() => {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.animationDuration = 2 + Math.random() * 3 + 's';
        confetti.style.backgroundColor = getRandomColor();
        confettiContainer.appendChild(confetti);

        setTimeout(() => confetti.remove(), 5000);
    }, 100);
}
