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

    // NOVOS ELEMENTOS DA UI
    const introScreen = document.getElementById('intro-screen');
    const playButton = document.getElementById('play-button');
    const gameOverlay = document.getElementById('game-overlay');

    const soundCorrect = new Audio('sons/acerto.mp3');
    const soundVictory = new Audio('sons/vitoria.mp3');
    soundCorrect.volume = 0.5;
    soundVictory.volume = 0.7;

    const ALL_WORD_SETS = [
        ["MOISÉS", "DAVI", "ESTER", "NOÉ", "MARTA", "PEDRO", "PAULO", "JOÃO", "ABRAÃO", "SARA", "JESUS", "DEUS"],
        ["ISAIAS", "JEREMIAS", "EZEQUIEL", "DANIEL", "OSEIAS", "JOEL", "AMOS", "OBADIAS", "JONAS", "MIQUEIAS"],
        ["MARIA", "JOSÉ", "ANA", "ELIAS", "SAMUEL", "JUDAS", "CALEBE", "GIDEAO", "DEBORA", "RUTE"],
        ["REBECA", "JACÓ", "RAQUEL", "ISAQUE", "LABAO", "ESAÚ", "LEIA", "SIMAO", "BENJAMIM", "GOLIAS"],
        ["GABRIEL", "MIGUEL", "RAFAEL", "ZACARIAS", "ISABEL", "JOANA", "TOMÉ", "MATEUS", "FILIPE", "ANDRÉ"]
    ];

    const GRID_SIZE = 15;
    const FONT_FAMILY = 'Arial Black, Arial, sans-serif';

    let CELL_SIZE;
    let FONT_SIZE;

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
        { dr: 0, dc: 1 },    // Direita
        { dr: 1, dc: 0 },    // Baixo
        { dr: 1, dc: 1 },    // Baixo-direita
        { dr: 1, dc: -1 },   // Baixo-esquerda
        { dr: -1, dc: 1 },   // Cima-direita (diagonal)
        { dr: -1, dc: -1 }   // Cima-esquerda (diagonal)
    ];


    function initializeGame() {
        // Redimensionamento do canvas e cálculo de CELL_SIZE/FONT_SIZE
        const computedStyle = window.getComputedStyle(canvas);
        const cssWidth = parseFloat(computedStyle.width);
        const cssHeight = parseFloat(computedStyle.height);

        const dpr = window.devicePixelRatio || 1;

        canvas.width = cssWidth * dpr;
        canvas.height = cssHeight * dpr;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);

        CELL_SIZE = cssWidth / GRID_SIZE;
        FONT_SIZE = CELL_SIZE * 0.6;

        ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
        foundWords = new Set();
        currentSelectionPath = [];
        isSelecting = false;
        startCellCoords = { row: -1, col: -1 };
        endCellCoords = { row: -1, col: -1 };

        clearInterval(timerInterval);
        secondsElapsed = 0;
        updateTimerDisplay();
        // Não iniciar o timer aqui, será iniciado ao clicar em 'Jogar'
        // startTimer(); // REMOVIDO DA INICIALIZAÇÃO DIRETA

        victoryMessage.style.display = 'none';
        restartButton.style.display = 'block';
        victoryRestartButton.style.display = 'none';

        wordListElement.innerHTML = '';
        document.querySelectorAll('.confetti').forEach(c => c.remove());

        placeWords();
        fillEmptyCells();
        displayWordList();
        drawGrid();

        // Esconder o jogo e mostrar a tela de introdução no carregamento inicial
        // Isso é feito no CSS agora, então o jogo não é visível até o play
        // Mas a lógica de visibilidade da intro é controlada aqui
        introScreen.classList.remove('hidden'); // Garante que a tela de intro esteja visível no início
        gameOverlay.classList.remove('visible'); // Garante que o overlay esteja oculto no início
    }

    function startGame() {
        introScreen.classList.add('hidden'); // Esconde a tela de introdução
        gameOverlay.classList.add('visible'); // Mostra o overlay escuro
        startTimer(); // Inicia o timer quando o jogo realmente começa
    }

    function placeWords() {
        const randomIndex = Math.floor(Math.random() * ALL_WORD_SETS.length);
        currentWords = ALL_WORD_SETS[randomIndex].map(word => word.toUpperCase());

        const wordsToPlace = [...currentWords].sort(() => 0.5 - Math.random());

        wordsToPlace.forEach(word => {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 1000) {
                const placementDirections = [
                    { dr: 0, dc: 1 },    // Direita
                    { dr: 1, dc: 0 },    // Baixo
                    { dr: 1, dc: 1 },    // Baixo-direita
                    { dr: 1, dc: -1 },   // Baixo-esquerda
                    { dr: -1, dc: 1 },   // Cima-direita
                    { dr: -1, dc: -1 }   // Cima-esquerda
                ];
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

    function getCellCoords(event) {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if (event.type.startsWith('touch')) {
            clientX = event.changedTouches[0].clientX;
            clientY = event.changedTouches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }

        const xInCssPixels = clientX - rect.left;
        const yInCssPixels = clientY - rect.top;

        const col = Math.floor(xInCssPixels / CELL_SIZE);
        const row = Math.floor(yInCssPixels / CELL_SIZE);
        
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
        ctx.strokeStyle = '#b3ffb3';

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

        if (!((absDr === 0 && absDc > 0) ||
            (absDc === 0 && absDr > 0) ||
            (absDr === absDc && absDr > 0))) {
            return [];
        }

        const unitDr = dr === 0 ? 0 : (dr / absDr);
        const unitDc = dc === 0 ? 0 : (dc / absDc);

        let currentRow = start.row;
        let currentCol = start.col;

        while (true) {
            path.push({ row: currentRow, col: currentCol });

            if (currentRow === end.row && currentCol === end.col) {
                break;
            }

            currentRow += unitDr;
            currentCol += unitDc;

            if (path.length > GRID_SIZE * GRID_SIZE) {
                console.error("Loop infinito na seleção de caminho, abortando.");
                return [];
            }
        }
        return path;
    }

    function checkWord() {
        if (currentSelectionPath.length === 0) return;

        let selectedWordText = '';
        currentSelectionPath.forEach(coords => {
            selectedWordText += grid[coords.row][coords.col];
        });

        const foundMatch = currentWords.find(word => word === selectedWordText);

        if (foundMatch && !foundWords.has(foundMatch)) {
            foundWords.add(foundMatch);
            const listItem = wordListElement.querySelector(`li[data-word='${foundMatch}']`);
            if (listItem) {
                listItem.classList.add('found-word');
            }
            soundCorrect.play().catch(e => console.error("Erro ao tocar som de acerto:", e));
            drawGrid();
        }
        clearSelection();
        checkGameEnd();
    }

    function clearSelection() {
        currentSelectionPath = [];
        isSelecting = false;
        startCellCoords = { row: -1, col: -1 };
        endCellCoords = { row: -1, col: -1 };
        drawGrid();
    }

    function checkGameEnd() {
        if (foundWords.size === currentWords.length && currentWords.length > 0) {
            clearInterval(timerInterval);
            victoryMessage.style.display = 'block';
            victoryRestartButton.style.display = 'block';
            restartButton.style.display = 'none';
            soundVictory.play().catch(e => console.error("Erro ao tocar som de vitória:", e));
            triggerConfetti();
            gameOverlay.classList.remove('visible'); // Remove o overlay na vitória
        }
    }

    function triggerConfetti() {
        const gameContainer = document.querySelector('.body-wordsearch');
        if (!gameContainer) {
            console.error("Elemento .body-wordsearch não encontrado para adicionar confetes.");
            return;
        }

        gameContainer.querySelectorAll('.confetti').forEach(c => c.remove());

        const containerWidth = gameContainer.offsetWidth;
        const containerHeight = Math.max(gameContainer.offsetHeight, window.innerHeight);

        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.style.left = `${Math.random() * containerWidth}px`;
            confetti.style.top = `-20px`;
            confetti.style.animationDuration = `${Math.random() * 3 + 2}s`;
            confetti.style.animationDelay = `${Math.random() * 2}s`;
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 70%)`;
            gameContainer.appendChild(confetti);
        }
    }

    function startTimer() {
        timerInterval = setInterval(() => {
            secondsElapsed++;
            updateTimerDisplay();
        }, 1000);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(secondsElapsed / 60);
        const seconds = secondsElapsed % 60;
        timerDisplay.textContent = `Tempo: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // --- Eventos de Mouse ---
    canvas.addEventListener('mousedown', (e) => {
        // Verifica se o jogo está ativo (tela de introdução escondida e overlay visível)
        if (introScreen.classList.contains('hidden') && gameOverlay.classList.contains('visible')) {
            startCellCoords = getCellCoords(e);
            endCellCoords = startCellCoords;
            isSelecting = true;
            currentSelectionPath = calculateSelectionPath(startCellCoords, endCellCoords);
            drawGrid();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isSelecting && introScreen.classList.contains('hidden')) { // Verifica a tela de introdução
            const currentCoords = getCellCoords(e);
            if (currentCoords.row !== endCellCoords.row || currentCoords.col !== endCellCoords.col) {
                endCellCoords = currentCoords;
                currentSelectionPath = calculateSelectionPath(startCellCoords, endCellCoords);
                drawGrid();
            }
        }
    });

    canvas.addEventListener('mouseup', () => {
        if (isSelecting && introScreen.classList.contains('hidden')) { // Verifica a tela de introdução
            checkWord();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (isSelecting) {
            clearSelection();
        }
    });

    // --- Eventos de Toque (Touch) ---
    canvas.addEventListener('touchstart', (e) => {
        if (introScreen.classList.contains('hidden') && gameOverlay.classList.contains('visible')) {
            e.preventDefault();
            startCellCoords = getCellCoords(e);
            endCellCoords = startCellCoords;
            isSelecting = true;
            currentSelectionPath = calculateSelectionPath(startCellCoords, endCellCoords);
            drawGrid();
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (isSelecting && introScreen.classList.contains('hidden')) {
            e.preventDefault();
            const currentCoords = getCellCoords(e);
            if (currentCoords.row !== endCellCoords.row || currentCoords.col !== endCellCoords.col) {
                endCellCoords = currentCoords;
                currentSelectionPath = calculateSelectionPath(startCellCoords, endCellCoords);
                drawGrid();
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (isSelecting && introScreen.classList.contains('hidden')) {
            checkWord();
        }
    });

    canvas.addEventListener('touchcancel', () => {
        if (isSelecting) {
            clearSelection();
        }
    });

    // Gerenciamento de eventos dos botões
    playButton.addEventListener('click', startGame); // Botão Play inicia o jogo
    restartButton.addEventListener('click', () => {
        initializeGame(); // Reinicia o jogo (e mostra a tela de intro novamente)
        // Se você quiser que o restartButton apenas reinicie o jogo sem voltar para a intro,
        // remova a linha `introScreen.classList.remove('hidden');` de initializeGame()
        // e chame `startGame()` aqui após initializeGame(), mas isso mudaria a UX.
        // O comportamento atual é: Reiniciar leva de volta à tela de início.
    });
    victoryRestartButton.addEventListener('click', initializeGame); // Reinicia e volta para a intro

    // Chamada inicial do jogo ao carregar a página
    // Isso prepara o canvas e a grade, mas mantém a tela de introdução visível.
    initializeGame();

    // Listener para redimensionamento da janela
    // Importante para reajustar o canvas e a lógica de toque/clique
    window.addEventListener('resize', initializeGame);
});
