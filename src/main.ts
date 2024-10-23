import "./style.css";

const APP_NAME = "Sticker Sketchpad";
const appContainer = document.querySelector<HTMLDivElement>("#app")!;

// Set the document title
document.title = APP_NAME;

// Insert UI elements
appContainer.innerHTML = ` 
  <h1>${APP_NAME}</h1> 
  <canvas id="artCanvas" width="256" height="256"></canvas>
  <button id="clearButton">Clear</button>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#artCanvas")!;
const ctx = canvas.getContext("2d")!;
let drawing = false;
const paths: { x: number, y: number }[][] = []; // Stores arrays of points for each path

// Function to draw paths from the stored points
function drawPaths() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;

  paths.forEach(path => {
    ctx.beginPath();
    path.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
    ctx.closePath();
  });
}

// Function to start drawing
canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  paths.push([{ x: e.offsetX, y: e.offsetY }]);
});

// Function to record points while drawing
canvas.addEventListener("mousemove", (e) => {
  if (drawing) {
    const currentPath = paths[paths.length - 1];
    currentPath.push({ x: e.offsetX, y: e.offsetY });
    // Dispatch a custom event to update drawing
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

// Function to stop drawing
canvas.addEventListener("mouseup", () => {
  drawing = false;
});

// Observer for the custom "drawing-changed" event
canvas.addEventListener("drawing-changed", drawPaths);

// Handle clear button click
const clearButton = document.querySelector<HTMLButtonElement>("#clearButton")!;
clearButton.addEventListener("click", () => {
  paths.length = 0; // Clear all paths
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});
