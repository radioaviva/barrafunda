document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('wordSearchCanvas');
    if (!canvas) {
        console.warn("Canvas 'wordSearchCanvas' não encontrado. O script do caça-palavras pode não estar na página correta ou o elemento foi removido.");
        return;
    }

    const ctx = canvas.getContext('2d');
    const wordListElement = document.getElementById('word-list');
    const restartButton = document.getElementById('restart-button');
    const victoryRestartButton = document.getElementById('victory-restart-button');
    const victoryMessage = document.getElementById('victory-message');
    const timerDisplay = document.getElementById('timer-display');

    // Áudios
    const soundCorrect = new Audio('sons/acerto.mp3');
    const soundVictory = new Audio('sons/vitoria.mp3');
    soundCorrect.volume = 0.5;
    soundVictory.volume = 0.7;

    const ALL_WORD_SETS = [
        [ "MOISÉS", "DAVI", "ESTER", "NOÉ", "MARTA", "PEDRO", "PAULO", "JOÃO", "ABRAÃO", "SARA", "JESUS", "DEUS" ],
        [ "ISAIAS", "JEREMIAS", "EZEQUIEL", "DANIEL", "OSEIAS", "JOEL", "AMÓS", "OBADIAS", "JONAS", "MIQUEIAS" ],
        [ "MARIA", "JOSÉ", "ANA", "ELIAS", "SAMUEL", "JUDAS", "CALEBE", "GIDEÃO", "DEBORA", "RUTE" ],
        [ "REBECA", "JACÓ", "RAQUEL", "ISAQUE", "LABÃO", "ESAÚ", "LEIA", "SIMÃO", "BENJAMIM", "NOEMI" ],
        [ "GABRIEL", "MIGUEL", "RAFAEL", "ZACARIAS", "ISABEL", "JOANA", "TOMÉ", "MATEUS", "FILIPE", "ANDRÉ" ]
        [ "JAIRO", "SILAS", "SALOMÃO", "ELIZEU", "CANAÃ", "EVA", "ADÃO", "JOQUEBEDE", "EFRAIM", "GENESIS" ]
    ];

    const GRID_SIZE = 12;
    const CELL_SIZE = canvas.width / GRID_SIZE;
    const FONT_SIZE = CELL_SIZE * 0.6;
    const FONT_FAMILY = 'Arial Black, Arial';

    let grid = [];
    let currentWords = [];
    let foundWords = new Set();

    let isSelecting = false;
    let startCellCoords = { row: -1, col: -1 };
    let endCellCoords = { row: -1, col: -1 };
    let currentSelectionPath = [];

    let timerInterval;
    let secondsElapsed = 0;

    const directions = [
        { dr: 0, dc: 1 },   // Direita
        { dr: 1, dc: 0 },   // Baixo
        { dr: 1, dc: 1 },   // Baixo-direita
        { dr: 1, dc: -1 },  // Baixo-esquerda
        { dr: -1, dc: 1 },  // Cima-direita
        { dr: -1, dc: -1 }  // Cima-esquerda
    ];

    function initializeGame() {
        grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
        foundWords.clear();
        currentSelectionPath = [];
        isSelecting = false;
        startCellCoords = { row: -1, col: -1 };
        endCellCoords = { row: -1, col: -1 };

        clearInterval(timerInterval);
        secondsElapsed = 0;
        updateTimerDisplay();
        startTimer();

        victoryMessage.style.display = 'none';
        restartButton.style.display = 'block';
        victoryRestartButton.style.display = 'none';

        wordListElement.innerHTML = '';
        document.querySelectorAll('.confetti').forEach(c => c.remove());

        placeWords();
        fillEmptyCells();
        displayWordList();
        drawGrid();
    }

    function placeWords() {
        const randomIndex = Math.floor(Math.random() * ALL_WORD_SETS.length);
        currentWords = ALL_WORD_SETS[randomIndex].map(word => word.toUpperCase());

        const wordsToPlace = [...currentWords].sort(() => 0.5 - Math.random());

        wordsToPlace.forEach(word => {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 1000) {
                const placementDirections = directions;
                const dir = placementDirections[Math.floor(Math.random() * placementDirections.length)];
                const startRow = Math.floor(Math.random() * GRID_SIZE);
                const startCol = Math.floor(Math.random() * GRID_SIZE);

                if (canPlaceWord(word, startRow, startCol, dir.dr, dir.dc)) {
                    for (let i = 0; i < word.length; i++) {
                        const r = startRow + i * dir.dr;
                        const c = startCol + i * dir.dc;
                        grid[r][c] = word[i];
                    }
                    placed = true;
                }
                attempts++;
            }
            if (!placed) {
                console.warn(`Não foi possível posicionar a palavra: "${word}". Ela será ignorada neste jogo.`);
                currentWords = currentWords.filter(w => w !== word);
            }
        });
    }

    function canPlaceWord(word, r, c, dr, dc) {
        if (r + (word.length - 1) * dr < 0 || r + (word.length - 1) * dr >= GRID_SIZE ||
            c + (word.length - 1) * dc < 0 || c + (word.length - 1) * dc >= GRID_SIZE) {
            return false;
        }
        for (let i = 0; i < word.length; i++) {
            const currentRow = r + i * dr;
            const currentCol = c + i * dc;
            if (grid[currentRow][currentCol] !== '' && grid[currentRow][currentCol] !== word[i]) {
                return false;
            }
        }
        return true;
    }

    function fillEmptyCells() {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] === '') {
                    grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
                }
            }
        }
    }

    function displayWordList() {
        currentWords.forEach(word => {
            const listItem = document.createElement('li');
            listItem.textContent = word;
            listItem.dataset.word = word;
            wordListElement.appendChild(listItem);
        });
    }

    function getCellCoordsFromMouse(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        let clientX, clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;

        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor(y / CELL_SIZE);

        return { row, col };
    }

    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const x = c * CELL_SIZE + CELL_SIZE / 2;
                const y = r * CELL_SIZE + CELL_SIZE / 2;

                ctx.fillStyle = '#555';
                ctx.fillText(grid[r][c], x, y);
            }
        }
        drawFoundWords();
        drawCurrentSelection();
    }

    function drawFoundWords() {
        ctx.lineWidth = CELL_SIZE * 0.7;
        ctx.lineCap = 'round';

        foundWords.forEach(word => {
            let wordPath = [];
            outerLoop:
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    for (const dir of directions) {
                        let tempWord = '';
                        let tempPath = [];
                        for (let i = 0; i < word.length; i++) {
                            const currR = r + i * dir.dr;
                            const currC = c + i * dir.dc;
                            if (currR >= 0 && currR < GRID_SIZE && currC >= 0 && currC < GRID_SIZE) {
                                tempWord += grid[currR][currC];
                                tempPath.push({ row: currR, col: currC });
                            } else {
                                break;
                            }
                        }
                        if (tempWord === word) {
                            wordPath = tempPath;
                            break outerLoop;
                        }
                    }
                }
            }

            if (wordPath.length > 0) {
                const firstCell = wordPath[0];
                const lastCell = wordPath[wordPath.length - 1];

                const startX = firstCell.col * CELL_SIZE + CELL_SIZE / 2;
                const startY = firstCell.row * CELL_SIZE + CELL_SIZE / 2;
                const endX = lastCell.col * CELL_SIZE + CELL_SIZE / 2;
                const endY = lastCell.row * CELL_SIZE + CELL_SIZE / 2;

                ctx.strokeStyle = '#b3ffb3';
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                ctx.fillStyle = '#333';
                ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
                wordPath.forEach(cell => {
                    const x = cell.col * CELL_SIZE + CELL_SIZE / 2;
                    const y = cell.row * CELL_SIZE + CELL_SIZE / 2;
                    ctx.fillText(grid[cell.row][cell.col], x, y);
                });
            }
        });
    }

    function drawCurrentSelection() {
        if (currentSelectionPath.length > 0) {
            ctx.lineWidth = CELL_SIZE * 0.7;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#cfe8fc';

            const firstCell = currentSelectionPath[0];
            const lastCell = currentSelectionPath[currentSelectionPath.length - 1];

            const startX = firstCell.col * CELL_SIZE + CELL_SIZE / 2;
            const startY = firstCell.row * CELL_SIZE + CELL_SIZE / 2;
            const endX = lastCell.col * CELL_SIZE + CELL_SIZE / 2;
            const endY = lastCell.row * CELL_SIZE + CELL_SIZE / 2;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            ctx.fillStyle = '#000';
            ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
            currentSelectionPath.forEach(cell => {
                const x = cell.col * CELL_SIZE + CELL_SIZE / 2;
                const y = cell.row * CELL_SIZE + CELL_SIZE / 2;
                ctx.fillText(grid[cell.row][cell.col], x, y);
            });
        }
    }

    function calculateSelectionPath(start, end) {
        const path = [];
        const dr = end.row - start.row;
        const dc = end.col - start.col;

        if (dr === 0 && dc === 0) {
            path.push(start);
            return path;
        }

        const absDr = Math.abs(dr);
        const absDc = Math.abs(dc);

        if (absDr !== 0 && absDc !== 0 && absDr !== absDc) {
            return path;
        }

        const stepR = dr === 0 ? 0 : dr / absDr;
        const stepC = dc === 0 ? 0 : dc / absDc;
        const steps = Math.max(absDr, absDc);

        for (let i = 0; i <= steps; i++) {
            const r = start.row + stepR * i;
            const c = start.col + stepC * i;
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) break;
            path.push({ row: r, col: c });
        }
        return path;
    }

    function checkWord() {
        if (currentSelectionPath.length === 0) return;

        const selectedWord = currentSelectionPath.map(cell => grid[cell.row][cell.col]).join('');
        const reversedWord = selectedWord.split('').reverse().join('');

        if (currentWords.includes(selectedWord) && !foundWords.has(selectedWord)) {
            foundWords.add(selectedWord);
            soundCorrect.play();
            markWordAsFound(selectedWord);
        } else if (currentWords.includes(reversedWord) && !foundWords.has(reversedWord)) {
            foundWords.add(reversedWord);
            soundCorrect.play();
            markWordAsFound(reversedWord);
        }
        drawGrid();
        clearSelection();

        if (foundWords.size === currentWords.length) {
            winGame();
        }
    }

    function markWordAsFound(word) {
        const items = wordListElement.querySelectorAll('li');
        items.forEach(item => {
            if (item.dataset.word === word) {
                item.style.textDecoration = 'line-through';
                item.style.color = '#090';
            }
        });
    }

    function clearSelection() {
        isSelecting = false;
        currentSelectionPath = [];
        startCellCoords = { row: -1, col: -1 };
        endCellCoords = { row: -1, col: -1 };
        drawGrid();
    }

    function winGame() {
        soundVictory.play();
        clearInterval(timerInterval);
        victoryMessage.style.display = 'block';
        restartButton.style.display = 'none';
        victoryRestartButton.style.display = 'block';
        showConfetti();
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            secondsElapsed++;
            updateTimerDisplay();
        }, 1000);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
        const seconds = (secondsElapsed % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `Tempo: ${minutes}:${seconds}`;
    }

    function showConfetti() {
        const colors = ['#fce18a', '#ff726d', '#b48def', '#f4306d', '#76f77b'];
        const confettiCount = 150;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.animationDuration = `${(Math.random() * 3 + 2)}s`;
            confetti.style.width = confetti.style.height = `${Math.random() * 7 + 5}px`;
            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 5000);
        }
    }

    // Controle de toque com suporte a apenas um toque ativo

    let activeTouchId = null;

    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const coords = getCellCoordsFromMouse(e);
        if (coords.row < 0 || coords.row >= GRID_SIZE || coords.col < 0 || coords.col >= GRID_SIZE) return;

        startCellCoords = coords;
        endCellCoords = coords;
        isSelecting = true;
        currentSelectionPath = calculateSelectionPath(startCellCoords, endCellCoords);
        drawGrid();
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isSelecting) return;
        e.preventDefault();
        const coords = getCellCoordsFromMouse(e);
        if (coords.row < 0 || coords.row >= GRID_SIZE || coords.col < 0 || coords.col >= GRID_SIZE) return;

        if (coords.row !== endCellCoords.row || coords.col !== endCellCoords.col) {
            endCellCoords = coords;
            currentSelectionPath = calculateSelectionPath(startCellCoords, endCellCoords);
            drawGrid();
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!isSelecting) return;
        e.preventDefault();
        checkWord();
        clearSelection();
    });

    canvas.addEventListener('mouseleave', (e) => {
        if (!isSelecting) return;
        e.preventDefault();
        clearSelection();
    });

    canvas.addEventListener('touchstart', (e) => {
        if (activeTouchId !== null) return;
        e.preventDefault();
        activeTouchId = e.touches[0].identifier;
        const touch = e.touches[0];
        const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
        const coords = getCellCoordsFromMouse(fakeEvent);
        if (coords.row < 0 || coords.row >= GRID_SIZE || coords.col < 0 || coords.col >= GRID_SIZE) return;

        startCellCoords = coords;
        endCellCoords = coords;
        isSelecting = true;
        currentSelectionPath = calculateSelectionPath(startCellCoords, endCellCoords);
        drawGrid();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (!isSelecting) return;
        e.preventDefault();
        const touch = Array.from(e.touches).find(t => t.identifier === activeTouchId);
        if (!touch) return;

        const fakeEvent = { clientX: touch.clientX, clientY: touch.clientY };
        const coords = getCellCoordsFromMouse(fakeEvent);
        if (coords.row < 0 || coords.row >= GRID_SIZE || coords.col < 0 || coords.col >= GRID_SIZE) return;

        if (coords.row !== endCellCoords.row || coords.col !== endCellCoords.col) {
            endCellCoords = coords;
            currentSelectionPath = calculateSelectionPath(startCellCoords, endCellCoords);
            drawGrid();
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        const touchEnded = Array.from(e.changedTouches).find(t => t.identifier === activeTouchId);
        if (touchEnded && isSelecting) {
            checkWord();
            clearSelection();
            activeTouchId = null;
        }
    }, { passive: false });

    canvas.addEventListener('touchcancel', (e) => {
        const touchCanceled = Array.from(e.changedTouches).find(t => t.identifier === activeTouchId);
        if (touchCanceled) {
            clearSelection();
            activeTouchId = null;
        }
    });

    restartButton.addEventListener('click', () => {
        initializeGame();
    });

    victoryRestartButton.addEventListener('click', () => {
        initializeGame();
    });

    initializeGame();
});
