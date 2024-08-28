const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

const resolution = 20;
canvas.width = 600;
canvas.height = 800;

const COLS = canvas.width / resolution;
const ROWS = canvas.height / resolution;

let mouseX = -1;
let mouseY = -1;

let paused = false;

function buildGrid(empty = true) {
    return new Array(COLS).fill(null)
        .map(() => new Array(ROWS).fill(null)
            .map(() => empty ? 0 : Math.floor(Math.random() * 2)));
}

let grid = buildGrid(true);

let animationId = null;

const patterns = {
    glider: {
        cost: 3,
        pattern: [[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]]
    },
    blinker: {
        cost: 2,
        pattern: [[0, 0], [0, 1], [0, 2]]
    },
    toad: {
        cost: 4,
        pattern: [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1]]
    },
    beacon: {
        cost: 5,
        pattern: [[0, 0], [1, 0], [0, 1], [3, 2], [2, 3], [3, 3]]
    }
};

let selectedPattern = 'glider';

// Mana system
const MAX_MANA = 10;
let currentMana = MAX_MANA;
const MANA_REGEN_RATE = 0.5; // Mana points per second

document.getElementById('playButton').addEventListener('click', () => {
    paused = !paused;
    document.getElementById('playButton').innerText = paused ? 'Play' : 'Pause';
    if (!paused) {
        update();
    }
});

canvas.addEventListener('mousemove', (event) => {
    const { offsetX, offsetY } = event;
    mouseX = Math.floor(offsetX / resolution);
    mouseY = Math.floor(offsetY / resolution);
    render(grid);
});

canvas.addEventListener('mouseleave', () => {
    mouseX = -1;
    mouseY = -1;
    render(grid);
});

canvas.addEventListener('click', (event) => {
    const { offsetX, offsetY } = event;
    const col = Math.floor(offsetX / resolution);
    const row = Math.floor(offsetY / resolution);
    if (canPlacePattern(selectedPattern)) {
        placePattern(col, row, patterns[selectedPattern].pattern);
        depleteMana(patterns[selectedPattern].cost);
        render(grid);
    }
});

function update() {
    if (paused) {
        return;
    }
    grid = nextGen(grid);
    render(grid);
    regenerateMana();
    setTimeout(update, 500); // Adjust the delay (in milliseconds) to control the speed
}

function nextGen(grid) {
    const nextGen = grid.map(arr => [...arr]);

    for (let col = 0; col < grid.length; col++) {
        for (let row = 0; row < grid[col].length; row++) {
            const cell = grid[col][row];
            let numNeighbours = 0;

            for (let i = -1; i < 2; i++) {
                for (let j = -1; j < 2; j++) {
                    if (i === 0 && j === 0) {
                        continue;
                    }

                    const x_cell = col + i;
                    const y_cell = row + j;

                    if (x_cell >= 0 && y_cell >= 0 && x_cell < COLS && y_cell < ROWS) {
                        const currentNeighbour = grid[x_cell][y_cell];
                        numNeighbours += currentNeighbour;
                    }
                }
            }

            // rules
            if (cell === 1 && numNeighbours < 2) {
                nextGen[col][row] = 0;
            } else if (cell === 1 && numNeighbours > 3) {
                nextGen[col][row] = 0;
            } else if (cell === 0 && numNeighbours === 3) {
                nextGen[col][row] = 1;
            }
        }
    }

    return nextGen;
}

function render(grid) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let col = 0; col < grid.length; col++) {
        for (let row = 0; row < grid[col].length; row++) {
            const cell = grid[col][row];

            let isPatternCell = false;
            if (mouseX >= 0 && mouseY >= 0) {
                const currentPattern = patterns[selectedPattern].pattern;
                currentPattern.forEach(([c, r]) => {
                    if (col === mouseX + c && row === mouseY + r) {
                        isPatternCell = true;
                    }
                });
            }

            ctx.beginPath();
            ctx.rect(col * resolution, row * resolution, resolution, resolution);
            if (isPatternCell) {
                ctx.fillStyle = 'gray';
            } else {
                ctx.fillStyle = cell ? 'black' : 'white';
            }
            ctx.fill();
            ctx.stroke();
        }
    }
}

function placePattern(col, row, pattern) {
    pattern.forEach(([c, r]) => {
        const newCol = col + c;
        const newRow = row + r;
        if (newCol < COLS && newRow < ROWS) {
            grid[newCol][newRow] = 1;
        }
    });
}

function createPatternInventory() {
    const inventory = document.getElementById('patternInventory');
    Object.keys(patterns).forEach((patternName, index) => {
        const slot = document.createElement('div');
        slot.className = 'pattern-slot';
        slot.textContent = patternName[0].toUpperCase();
        slot.title = `${patternName} (Cost: ${patterns[patternName].cost})`;
        slot.addEventListener('click', () => selectPattern(patternName));
        inventory.appendChild(slot);
    });
    selectPattern('glider');
}

function selectPattern(patternName) {
    selectedPattern = patternName;
    const slots = document.querySelectorAll('.pattern-slot');
    slots.forEach(slot => {
        slot.classList.remove('selected');
        if (slot.title.startsWith(patternName)) {
            slot.classList.add('selected');
        }
    });
    updatePatternAvailability();
}

function canPlacePattern(patternName) {
    return currentMana >= patterns[patternName].cost;
}

function depleteMana(cost) {
    currentMana = Math.max(0, currentMana - cost);
    updateManaBar();
    updatePatternAvailability();
}

function regenerateMana() {
    currentMana = Math.min(MAX_MANA, currentMana + MANA_REGEN_RATE / 2); // Divide by 2 because update is called every 500ms
    updateManaBar();
    updatePatternAvailability();
}

function updateManaBar() {
    const manaFill = document.getElementById('manaFill');
    const percentage = (currentMana / MAX_MANA) * 100;
    manaFill.style.width = `${percentage}%`;
}

function updatePatternAvailability() {
    const slots = document.querySelectorAll('.pattern-slot');
    slots.forEach(slot => {
        const patternName = slot.title.split(' ')[0].toLowerCase();
        if (canPlacePattern(patternName)) {
            slot.classList.remove('disabled');
        } else {
            slot.classList.add('disabled');
        }
    });
}

// Initial setup
createPatternInventory();
render(grid);
updateManaBar();
updatePatternAvailability();