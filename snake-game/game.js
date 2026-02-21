const GRID_SIZE = 22;
const CELL_SIZE = 24;
const BASE_TICK = 130;
const MIN_TICK = 72;
const SPEED_GAIN = 2;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const speedEl = document.getElementById("speed");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");

const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

let state = {
  snake: [],
  direction: directions.right,
  nextDirection: directions.right,
  food: null,
  score: 0,
  best: Number(localStorage.getItem("neonSnakeBest") || 0),
  running: false,
  paused: false,
  gameOver: false,
  lastFrame: 0,
  lastMove: 0,
  pulse: 0
};

function resetGame() {
  const center = Math.floor(GRID_SIZE / 2);
  state.snake = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center }
  ];
  state.direction = directions.right;
  state.nextDirection = directions.right;
  state.food = placeFood();
  state.score = 0;
  state.running = true;
  state.paused = false;
  state.gameOver = false;
  state.lastFrame = 0;
  state.lastMove = 0;
  state.pulse = 0;
  setOverlay(false);
  updateHud();
}

function placeFood() {
  let pos = null;
  while (!pos) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    const occupied = state.snake.some((segment) => segment.x === x && segment.y === y);
    if (!occupied) {
      pos = { x, y };
    }
  }
  return pos;
}

function isOpposite(a, b) {
  return a.x + b.x === 0 && a.y + b.y === 0;
}

function queueDirection(key) {
  const next = directions[key];
  if (!next) return;
  if (isOpposite(next, state.direction)) return;
  state.nextDirection = next;
}

function gameTick(now) {
  if (!state.running || state.paused || state.gameOver) return;

  const interval = currentTickMs();
  if (now - state.lastMove < interval) return;

  state.lastMove = now;
  state.direction = state.nextDirection;

  const head = state.snake[0];
  const newHead = wrapPosition({
    x: head.x + state.direction.x,
    y: head.y + state.direction.y
  });

  if (
    state.snake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)
  ) {
    endGame();
    return;
  }

  state.snake.unshift(newHead);

  if (newHead.x === state.food.x && newHead.y === state.food.y) {
    state.score += 10;
    state.pulse = 1;
    state.food = placeFood();
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem("neonSnakeBest", String(state.best));
    }
  } else {
    state.snake.pop();
  }

  updateHud();
}

function currentTickMs() {
  const reduction = Math.floor(state.score / 40) * SPEED_GAIN;
  return Math.max(MIN_TICK, BASE_TICK - reduction);
}

function wrapPosition(pos) {
  return {
    x: (pos.x + GRID_SIZE) % GRID_SIZE,
    y: (pos.y + GRID_SIZE) % GRID_SIZE
  };
}

function endGame() {
  state.gameOver = true;
  state.running = false;
  setOverlay(true, "Game Over", `Final score: ${state.score}`);
}

function setOverlay(show, title = "", text = "") {
  overlay.classList.toggle("hidden", !show);
  if (show) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
  }
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  bestEl.textContent = String(state.best);
  const speed = (BASE_TICK / currentTickMs()).toFixed(1);
  speedEl.textContent = `${speed}x`;
  pauseBtn.textContent = state.paused ? "Resume" : "Pause";
}

function drawBoard(time) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawGrid();
  if (state.food) {
    drawFood(time);
  }
  if (state.snake.length > 0) {
    drawSnake();
  }

  if (state.paused && !state.gameOver) {
    drawCenteredLabel("Paused");
  }
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i += 1) {
    const p = i * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(canvas.width, p);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSnake() {
  state.snake.forEach((segment, index) => {
    const x = segment.x * CELL_SIZE + 2;
    const y = segment.y * CELL_SIZE + 2;
    const size = CELL_SIZE - 4;

    const isHead = index === 0;
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    if (isHead) {
      gradient.addColorStop(0, "#b3ffec");
      gradient.addColorStop(1, "#56dbc0");
    } else {
      gradient.addColorStop(0, "#79f0d6");
      gradient.addColorStop(1, "#33c5ad");
    }

    ctx.fillStyle = gradient;
    roundRect(x, y, size, size, 7);
    ctx.fill();

    if (isHead) {
      ctx.fillStyle = "#112130";
      ctx.beginPath();
      ctx.arc(x + size * 0.33, y + size * 0.35, 2, 0, Math.PI * 2);
      ctx.arc(x + size * 0.67, y + size * 0.35, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawFood(time) {
  const pulse = 1 + Math.sin(time / 140) * 0.12 + state.pulse * 0.1;
  state.pulse *= 0.9;

  const x = state.food.x * CELL_SIZE + CELL_SIZE / 2;
  const y = state.food.y * CELL_SIZE + CELL_SIZE / 2;
  const radius = (CELL_SIZE * 0.28) * pulse;

  const glow = ctx.createRadialGradient(x, y, 2, x, y, 13);
  glow.addColorStop(0, "rgba(255, 223, 159, 1)");
  glow.addColorStop(1, "rgba(249, 185, 56, 0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f9b938";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCenteredLabel(label) {
  ctx.save();
  ctx.fillStyle = "rgba(4, 17, 31, 0.64)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 42px 'Bebas Neue'";
  ctx.textAlign = "center";
  ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 12);
  ctx.restore();
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function loop(now) {
  if (!state.lastFrame) {
    state.lastFrame = now;
    state.lastMove = now;
  }

  gameTick(now);
  drawBoard(now);
  requestAnimationFrame(loop);
}

function startGame() {
  resetGame();
}

function togglePause() {
  if (state.gameOver || !state.running) return;
  state.paused = !state.paused;
  if (!state.paused) {
    state.lastMove = performance.now();
  }
  updateHud();
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "enter", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
  }

  if (key === "arrowup" || key === "w") queueDirection("up");
  if (key === "arrowdown" || key === "s") queueDirection("down");
  if (key === "arrowleft" || key === "a") queueDirection("left");
  if (key === "arrowright" || key === "d") queueDirection("right");
  if (key === " ") togglePause();
  if (key === "enter") startGame();
});

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);

document.querySelectorAll(".control").forEach((button) => {
  button.addEventListener("click", () => queueDirection(button.dataset.dir));
});

let touchStart = null;
canvas.addEventListener("touchstart", (event) => {
  const firstTouch = event.changedTouches[0];
  touchStart = { x: firstTouch.clientX, y: firstTouch.clientY };
});

canvas.addEventListener("touchend", (event) => {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (Math.max(absX, absY) < 14) {
    touchStart = null;
    return;
  }

  if (absX > absY) {
    queueDirection(dx > 0 ? "right" : "left");
  } else {
    queueDirection(dy > 0 ? "down" : "up");
  }

  touchStart = null;
});

setOverlay(true, "Neon Snake", "Press Start to begin.");
updateHud();
requestAnimationFrame(loop);
