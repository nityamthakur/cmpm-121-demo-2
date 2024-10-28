import "./style.css";

const APP_NAME = "Sticker Sketchpad";
const appContainer = document.querySelector<HTMLDivElement>("#app")!;

// Set the document title
document.title = APP_NAME;

// Insert UI elements
appContainer.innerHTML = ` 
  <h1>${APP_NAME}</h1>
  <canvas id="artCanvas" width="256" height="256"></canvas>
  <button id="thinTool">Fine Tool</button>
  <button id="thickTool">Bold Tool</button>
  <input type="range" id="colorRotationSlider" min="0" max="360" value="0">
  <button id="undoButton">Undo</button>
  <button id="redoButton">Redo</button>
  <button id="clearButton">Clear</button>
  <button id="customEmojiButton">Custom Emoji</button>
  <button id="exportButton">Export</button>
  <div id="emojiContainer"></div>
`;

interface EmojiData {
  label: string;
  emoji: string;
}

const emojis: EmojiData[] = [
  { label: "Emoji 😄", emoji: "😄" },
  { label: "Emoji ✨", emoji: "✨" },
  { label: "Emoji 🌟", emoji: "🌟" },
];

interface Drawable {
  display(ctx: CanvasRenderingContext2D): void;
}

class Line implements Drawable {
  private points: { x: number; y: number }[] = [];
  private thickness: number;
  private color: string;

  constructor(startX: number, startY: number, thickness: number, color: string) {
    this.points.push({ x: startX, y: startY });
    this.thickness = thickness;
    this.color = color;
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;

    ctx.beginPath();
    ctx.lineWidth = this.thickness;
    ctx.strokeStyle = this.color;
    ctx.moveTo(this.points[0].x, this.points[0].y);

    this.points.forEach(point => ctx.lineTo(point.x, point.y));

    ctx.stroke();
    ctx.closePath();
  }
}

class ToolPreview implements Drawable {
  private x: number;
  private y: number;
  private thickness: number;
  private color: string;

  constructor(x: number, y: number, thickness: number, color: string) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
    this.color = color;
  }

  move(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }
}

class Emoji implements Drawable {
  private x: number;
  private y: number;
  private emoji: string;
  private isPreview: boolean;
  private rotation: number;

  constructor(x: number, y: number, emoji: string, rotation: number, isPreview: boolean = false) {
    this.x = x;
    this.y = y;
    this.emoji = emoji;
    this.rotation = rotation;
    this.isPreview = isPreview;
  }

  move(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.save(); // Save the current state
    ctx.translate(this.x, this.y);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.font = "32px sans-serif";
    ctx.fillStyle = "black";
    ctx.globalAlpha = this.isPreview ? 0.3 : 1;
    ctx.fillText(this.emoji, 0, 0);
    ctx.globalAlpha = 1;
    ctx.restore(); // Restore to previous state
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#artCanvas")!;
const ctx = canvas.getContext("2d")!;
let drawing = false;
const paths: Drawable[] = [];
const redoStack: Drawable[] = [];
let currentLine: Line | null = null;
let currentThickness: number = 3;
let currentColor: string = "black";
let currentRotation: number = 0;
let toolPreview: ToolPreview | Emoji | null = new ToolPreview(0, 0, currentThickness, currentColor);
let currentEmoji: string | null = null;

// Slider for color or rotation
const colorRotationSlider = document.querySelector<HTMLInputElement>("#colorRotationSlider")!;
colorRotationSlider.addEventListener("input", () => {
  const value = parseInt(colorRotationSlider.value);
  if (currentEmoji) {
    currentRotation = value;
  } else {
    currentColor = `hsl(${value}, 100%, 50%)`;
  }
  updateToolPreview();
});

// Function to display all paths and preview
function drawPaths() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  paths.forEach(path => path.display(ctx));

  if (!drawing && toolPreview) {
    toolPreview.display(ctx);
  }
}

// Update tool preview
function updateToolPreview() {
  if (currentEmoji) {
    toolPreview = new Emoji(0, 0, currentEmoji, currentRotation, true);
  } else {
    toolPreview = new ToolPreview(0, 0, currentThickness, currentColor);
  }
  drawPaths();
}

// Update selected tool feedback
function updateToolFeedback(selectedButton: HTMLButtonElement) {
  document.querySelectorAll("button").forEach(button => {
    button.classList.remove("selectedTool");
  });
  selectedButton.classList.add("selectedTool");
}

// Tool buttons
const fineToolButton = document.querySelector<HTMLButtonElement>("#thinTool")!;
const boldToolButton = document.querySelector<HTMLButtonElement>("#thickTool")!;

// Fine tool
fineToolButton.addEventListener("click", () => {
  currentThickness = 3;
  currentColor = `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
  updateToolPreview();
  updateToolFeedback(fineToolButton);
});

// Bold tool
boldToolButton.addEventListener("click", () => {
  currentThickness = 10;
  currentColor = `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
  updateToolPreview();
  updateToolFeedback(boldToolButton);
});

// Function to create emoji buttons
function createEmojiButtons() {
  const emojiContainer = document.querySelector<HTMLDivElement>("#emojiContainer")!;
  emojiContainer.innerHTML = "";
  emojis.forEach(emojiData => {
    const button = document.createElement("button");
    button.textContent = emojiData.label;
    button.addEventListener("click", () => {
      currentEmoji = emojiData.emoji;
      currentRotation = Math.floor(Math.random() * 360);
      updateToolPreview();
      canvas.dispatchEvent(new Event("drawing-changed"));
    });
    emojiContainer.appendChild(button);
  });
}

createEmojiButtons();

// Custom emoji button
const customEmojiButton = document.querySelector<HTMLButtonElement>("#customEmojiButton")!;
customEmojiButton.addEventListener("click", () => {
  const customEmoji = prompt("Custom emoji text", "🧽");
  if (customEmoji) {
    emojis.push({ label: `Emoji ${customEmoji}`, emoji: customEmoji });
    createEmojiButtons();
  }
});

// Function to start drawing
canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  
  if (currentEmoji) {
    const emoji = new Emoji(e.offsetX, e.offsetY, currentEmoji, currentRotation, false);
    paths.push(emoji);
    currentEmoji = null;
    toolPreview = null;
  } else {
    currentLine = new Line(e.offsetX, e.offsetY, currentThickness, currentColor);
    paths.push(currentLine);
    redoStack.length = 0;
  }
  
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// Function to record points while drawing
canvas.addEventListener("mousemove", (e) => {
  if (drawing && currentLine) {
    currentLine.drag(e.offsetX, e.offsetY);
  } else if (!drawing && toolPreview) {
    toolPreview.move(e.offsetX, e.offsetY);
  }
  canvas.dispatchEvent(new Event("drawing-changed"));
});

// Function to stop drawing
canvas.addEventListener("mouseup", () => {
  drawing = false;
  currentLine = null;
});

// Observer for the custom "drawing-changed" event
canvas.addEventListener("drawing-changed", drawPaths);

// Handle clear button click
const clearButton = document.querySelector<HTMLButtonElement>("#clearButton")!;
clearButton.addEventListener("click", () => {
  paths.length = 0;
  redoStack.length = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

// Handle undo button click
const undoButton = document.querySelector<HTMLButtonElement>("#undoButton")!;
undoButton.addEventListener("click", () => {
  if (paths.length > 0) {
    const lastPath = paths.pop();
    redoStack.push(lastPath!);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

// Handle redo button click
const redoButton = document.querySelector<HTMLButtonElement>("#redoButton")!;
redoButton.addEventListener("click", () => {
  if (redoStack.length > 0) {
    const lastRedonePath = redoStack.pop();
    paths.push(lastRedonePath!);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

// Export button
const exportButton = document.querySelector<HTMLButtonElement>("#exportButton")!;
exportButton.addEventListener("click", () => {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d")!;
  exportCtx.fillStyle = "white";
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportCtx.scale(4, 4);
  paths.forEach(path => path.display(exportCtx));
  const anchor = document.createElement("a");
  anchor.href = exportCanvas.toDataURL("image/png");
  anchor.download = "sketchpad.png";
  anchor.click();
});
