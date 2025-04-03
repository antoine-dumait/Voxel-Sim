const CANVAS = document.querySelector("#canvas");
const CTX = CANVAS.getContext("2d");

CANVAS.width = window.innerWidth;
CANVAS.height = window.innerHeight;

let selectedVoxelType = "sand";

["sand", "water", "lava", "rock", "vapor"].forEach(type => {
    document.getElementById(`${type}Button`).addEventListener("click", () => {
        selectedVoxelType = type;
    });
});

window.addEventListener("resize", () => {
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
    voxelCanvas.drawVoxels();
});

const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 }
];

class Voxel {
    constructor(canvas, pixelSize) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.pixelSize = pixelSize;
        this.gridWidth = Math.floor(this.canvas.width / this.pixelSize);
        this.gridHeight = Math.floor(this.canvas.height / this.pixelSize);
        this.grid = Array.from({ length: this.gridHeight }, () => Array(this.gridWidth).fill(null));
        this.voxelTypes = {
            default: "#333",
            sand: "#f4a460",
            dog: "#ff6347",
            water: "#1e90ff",
            lava: "#ff4500",
            rock: "#808080",
            vapor: "rgba(200, 200, 200, 0.5)"
        };
        this.gravity = 1;
        this.dogMoveCounter = 0;
        this.dogMoveDelay = 10;

        window.addEventListener("resize", () => {
            this.resizeCanvas();
            this.drawVoxels();
        });
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.gridWidth = Math.floor(this.canvas.width / this.pixelSize);
        this.gridHeight = Math.floor(this.canvas.height / this.pixelSize);
        this.grid = Array.from({ length: this.gridHeight }, () => Array(this.gridWidth).fill(null));
    }

    addVoxel(x, y, type = "default") {
        const gridX = Math.floor(x / this.pixelSize);
        const gridY = Math.floor(y / this.pixelSize);
        if (gridY >= 0 && gridY < this.gridHeight && gridX >= 0 && gridX < this.gridWidth && !this.grid[gridY][gridX]) {
            const color = type === "sand" ? this.getRandomSandColor() : this.voxelTypes[type];
            this.grid[gridY][gridX] = { type, velocityY: 0, color };
            this.drawVoxel(gridX * this.pixelSize, gridY * this.pixelSize, color);
        }
    }

    drawVoxel(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, this.pixelSize, this.pixelSize);
    }

    getRandomSandColor() {
        const startColor = [244, 200, 96];
        const endColor = [139, 69, 19];
        const randomFactor = Math.random();
        const r = Math.floor(startColor[0] + randomFactor * (endColor[0] - startColor[0]));
        const g = Math.floor(startColor[1] + randomFactor * (endColor[1] - startColor[1]));
        const b = Math.floor(startColor[2] + randomFactor * (endColor[2] - startColor[2]));
        return `rgb(${r}, ${g}, ${b})`;
    }

    drawVoxels() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const voxel = this.grid[y][x];
                if (voxel) {
                    this.drawVoxel(x * this.pixelSize, y * this.pixelSize, voxel.color);
                }
            }
        }
    }

    updateVoxels() {
        for (let y = this.gridHeight - 1; y >= 0; y--) {
            for (let x = 0; x < this.gridWidth; x++) {
                const voxel = this.grid[y][x];
                if (!voxel) continue;

                const belowY = y + 1;
                const aboveY = y - 1;

                if (voxel.type === "vapor") {
                    voxel.lifetime = (voxel.lifetime || 300 + Math.floor(Math.random() * 300)) - 1;
                    if (voxel.lifetime <= 0) {
                        this.grid[y][x] = { type: "water", velocityY: 0, color: this.voxelTypes.water };
                        continue;
                    }
                    if (aboveY >= 0 && !this.grid[aboveY][x] && Math.random() < 0.5) {
                        this.grid[y][x] = null;
                        this.grid[aboveY][x] = voxel;
                    }
                } else if (voxel.type === "rock") {
                    continue;
                } else if (voxel.type === "water" || voxel.type === "lava") {
                    for (const { dx, dy } of directions) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
                            const neighborVoxel = this.grid[ny][nx];
                            const randomLifetime = 300 + Math.floor(Math.random() * 300);
                            if (voxel.type === "water" && neighborVoxel?.type === "lava") {
                                this.grid[y][x] = { type: "vapor", velocityY: 0, color: this.voxelTypes.vapor, lifetime: randomLifetime };
                                this.grid[ny][nx] = Math.random() < 0.1
                                    ? { type: "rock", velocityY: 0, color: this.voxelTypes.rock }
                                    : { type: "vapor", velocityY: 0, color: this.voxelTypes.vapor, lifetime: randomLifetime };
                                break;
                            } else if (voxel.type === "lava" && neighborVoxel?.type === "water") {
                                this.grid[y][x] = Math.random() < 0.1
                                    ? { type: "rock", velocityY: 0, color: this.voxelTypes.rock }
                                    : { type: "vapor", velocityY: 0, color: this.voxelTypes.vapor, lifetime: randomLifetime };
                                this.grid[ny][nx] = { type: "vapor", velocityY: 0, color: this.voxelTypes.vapor, lifetime: randomLifetime };
                                break;
                            }
                        }
                    }
                    if (belowY < this.gridHeight && !this.grid[belowY][x]) {
                        this.grid[y][x] = null;
                        this.grid[belowY][x] = voxel;
                    } else {
                        const leftX = x - 1;
                        const rightX = x + 1;
                        if (Math.random() < 0.5 && leftX >= 0 && !this.grid[y][leftX]) {
                            this.grid[y][x] = null;
                            this.grid[y][leftX] = voxel;
                        } else if (rightX < this.gridWidth && !this.grid[y][rightX]) {
                            this.grid[y][x] = null;
                            this.grid[y][rightX] = voxel;
                        }
                    }
                } else {
                    if (belowY < this.gridHeight && !this.grid[belowY][x]) {
                        this.grid[y][x] = null;
                        this.grid[belowY][x] = voxel;
                    } else {
                        const leftX = x - 1;
                        if (belowY < this.gridHeight && leftX >= 0 && !this.grid[belowY][leftX] && !this.grid[y][leftX]) {
                            this.grid[y][x] = null;
                            this.grid[belowY][leftX] = voxel;
                        } else {
                            const rightX = x + 1;
                            if (belowY < this.gridHeight && rightX < this.gridWidth && !this.grid[belowY][rightX] && !this.grid[y][rightX]) {
                                this.grid[y][x] = null;
                                this.grid[belowY][rightX] = voxel;
                            }
                        }
                    }
                
                }
                
            }
        }
        this.drawVoxels();
    }

    moveDog() {
        this.dogMoveCounter++;
        if (this.dogMoveCounter < this.dogMoveDelay) return;
        this.dogMoveCounter = 0;
        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const voxel = this.grid[y][x];
                if (voxel?.type === "dog") {
                    const { dx, dy } = directions[Math.floor(Math.random() * directions.length)];
                    const newX = x + dx;
                    const newY = y + dy;
                    if (newX >= 0 && newX < this.gridWidth && newY >= 0 && newY < this.gridHeight && !this.grid[newY][newX]) {
                        this.grid[y][x] = null;
                        this.grid[newY][newX] = voxel;
                        return;
                    }
                }
            }
        }
    }
}

const voxelCanvas = new Voxel(CANVAS, 10);
voxelCanvas.addVoxel(150, 150, "dog");

let isMouseDown = false;
let mousePosition = null;
let mouseButton = null;

CANVAS.addEventListener("mousedown", (event) => {
    isMouseDown = true;
    mouseButton = event.button;
    const rect = CANVAS.getBoundingClientRect();
    mousePosition = {
        x: Math.floor((event.clientX - rect.left) / voxelCanvas.pixelSize) * voxelCanvas.pixelSize,
        y: Math.floor((event.clientY - rect.top) / voxelCanvas.pixelSize) * voxelCanvas.pixelSize
    };
});

CANVAS.addEventListener("mouseup", () => {
    isMouseDown = false;
    mouseButton = null;
});

CANVAS.addEventListener("contextmenu", (event) => event.preventDefault());

CANVAS.addEventListener("mousemove", (event) => {
    if (isMouseDown) {
        const rect = CANVAS.getBoundingClientRect();
        mousePosition = {
            x: Math.floor((event.clientX - rect.left) / voxelCanvas.pixelSize) * voxelCanvas.pixelSize,
            y: Math.floor((event.clientY - rect.top) / voxelCanvas.pixelSize) * voxelCanvas.pixelSize
        };
    }
});

function animate() {
    if (isMouseDown && mousePosition && mouseButton === 0) {
        voxelCanvas.addVoxel(mousePosition.x, mousePosition.y, selectedVoxelType);
    }
    voxelCanvas.updateVoxels();
    voxelCanvas.moveDog();
    requestAnimationFrame(animate);
}
animate();