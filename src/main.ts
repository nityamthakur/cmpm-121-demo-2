import "./style.css";

const APP_NAME = "Sticker Sketchpad";
const appContainer = document.querySelector<HTMLDivElement>("#app")!;

// Set the document title
document.title = APP_NAME;

// Insert UI elements
appContainer.innerHTML = ` 
  <h1>${APP_NAME}</h1>
  <canvas id="artCanvas" width="256" height="256"></canvas>
  <button id="thinMarker">Thin Marker</button>
  <button id="thickMarker">Thick Marker</button>
  <button id="undoButton">Undo</button>
  <button id="redoButton">Redo</button>
  <button id="clearButton">Clear</button>
  <button class="stickerButton" data-sticker="😀">Sticker 😀</button>
  <button class="stickerButton" data-sticker="⭐">Sticker ⭐</button>
  <button class="stickerButton" data-sticker="🎉">Sticker 🎉</button>
`;

interface Drawable {
  display(ctx: CanvasRenderingContext2D): void;
}

class MarkerLine implements Drawable {
  private points: { x: number; y: number }[] = [];
  private thickness: number;

  constructor(startX: number, startY: number, thickness: number) {
    this.points.push({ x: startX, y: startY });
    this.thickness = thickness;
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;

    ctx.beginPath();
    ctx.lineWidth = this.thickness;
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

  constructor(x: number, y: number, thickness: number) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
  }

  move(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fill();
    ctx.closePath();
  }
}

class Sticker implements Drawable {
    private x: number;
    private y: number;
    private sticker: string;
    private isPreview: boolean;
  
    constructor(x: number, y: number, sticker: string, isPreview: boolean = false) {
      this.x = x;
      this.y = y;
      this.sticker = sticker;
      this.isPreview = isPreview;
    }
  
    move(x: number, y: number) {
      this.x = x;
      this.y = y;
    }
  
    display(ctx: CanvasRenderingContext2D): void {
      ctx.font = "24px sans-serif";
      ctx.globalAlpha = this.isPreview ? 0.3 : 1; // Apply opacity only for preview
      ctx.fillText(this.sticker, this.x, this.y);
      ctx.globalAlpha = 1; // Reset opacity
    }
  }

const canvas = document.querySelector<HTMLCanvasElement>("#artCanvas")!;
const ctx = canvas.getContext("2d")!;
let drawing = false;
const paths: Drawable[] = [];
const redoStack: Drawable[] = [];
let currentLine: MarkerLine | null = null;
let currentThickness: number = 2; // Default to thin marker
let toolPreview: ToolPreview | Sticker | null = new ToolPreview(0, 0, currentThickness);
let currentSticker: string | null = null;

// Function to display all paths and preview
function drawPaths() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "black";

  paths.forEach(path => path.display(ctx));

  if (!drawing && toolPreview) {
    toolPreview.display(ctx);
  }
}

// Update selected tool feedback
function updateToolFeedback(selectedButton: HTMLButtonElement) {
  document.querySelectorAll("button").forEach(button => {
    button.classList.remove("selectedTool");
  });
  selectedButton.classList.add("selectedTool");
}

// Tool buttons
const thinMarkerButton = document.querySelector<HTMLButtonElement>("#thinMarker")!;
const thickMarkerButton = document.querySelector<HTMLButtonElement>("#thickMarker")!;

// Thin marker
thinMarkerButton.addEventListener("click", () => {
  currentThickness = 2;
  toolPreview = new ToolPreview(0, 0, currentThickness);
  updateToolFeedback(thinMarkerButton);
});

// Thick marker
thickMarkerButton.addEventListener("click", () => {
  currentThickness = 5;
  toolPreview = new ToolPreview(0, 0, currentThickness);
  updateToolFeedback(thickMarkerButton);
});

// Sticker buttons
document.querySelectorAll(".stickerButton").forEach(button => {
    button.addEventListener("click", () => {
      const sticker = button.getAttribute("data-sticker");
      if (sticker) {
        currentSticker = sticker;
        toolPreview = new Sticker(0, 0, currentSticker, true); // Preview mode
        canvas.dispatchEvent(new Event("drawing-changed"));
      }
    });
  });
  
  // Function to start drawing
  canvas.addEventListener("mousedown", (e) => {
    drawing = true;
    
    if (currentSticker) {
      const sticker = new Sticker(e.offsetX, e.offsetY, currentSticker, false); // Place mode
      paths.push(sticker);
      currentSticker = null;
      toolPreview = null;
    } else {
      currentLine = new MarkerLine(e.offsetX, e.offsetY, currentThickness);
      paths.push(currentLine);
      redoStack.length = 0; // Clear redo stack when new drawing starts
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
  paths.length = 0; // Clear all paths
  redoStack.length = 0; // Clear redo stack as well
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
