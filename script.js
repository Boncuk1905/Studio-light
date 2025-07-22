const canvas = document.getElementById("previewCanvas");
const ctx = canvas.getContext("2d");

const imageUpload = document.getElementById("imageUpload");
const reflectionToggle = document.getElementById("reflectionToggle");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSize = document.getElementById("canvasSize");
const fileFormat = document.getElementById("fileFormat");
const bgType = document.getElementById("bgType");
const toggleMidBtn = document.getElementById("toggleMidLines");

let images = [];
let selectedImage = null;
let isDragging = false;
let offsetX = 0;
let offsetY = 0;
let showMidGuides = false;

canvas.addEventListener("mousedown", e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  for (let i = images.length - 1; i >= 0; i--) {
    const img = images[i];
    if (mx >= img.x && mx <= img.x + img.w && my >= img.y && my <= img.y + img.h) {
      selectedImage = img;
      offsetX = mx - img.x;
      offsetY = my - img.y;
      isDragging = true;
      return;
    }
  }
});

canvas.addEventListener("mouseup", () => {
  isDragging = false;
  selectedImage = null;
});

canvas.addEventListener("mousemove", e => {
  if (!isDragging || !selectedImage) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  selectedImage.x = mx - offsetX;
  selectedImage.y = my - offsetY;

  draw();
});

imageUpload.addEventListener("change", async e => {
  const files = Array.from(e.target.files);
  for (const file of files) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(res => (img.onload = res));

    const maxH = canvas.height * 0.5;
    const aspect = img.width / img.height;
    const h = maxH;
    const w = h * aspect;

    images.push({
      image: img,
      x: (canvas.width - w) / 2,
      y: (canvas.height - h) / 2,
      w,
      h
    });
  }
  draw();
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Baggrund
  if (bgType.value === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (showMidGuides) drawMidLines();

  for (const img of images) {
    drawImageWithReflection(ctx, img.image, img.x, img.y, img.w, img.h, reflectionToggle.checked);
  }
}

function drawMidLines() {
  ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
}

function drawImageWithReflection(ctx, img, x, y, w, h, showReflection) {
  ctx.drawImage(img, x, y, w, h);

  if (showReflection) {
    const opacity = parseFloat(opacitySlider.value);

    ctx.save();
    ctx.translate(0, y * 2 + h);
    ctx.scale(1, -1);
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();

    const grad = ctx.createLinearGradient(0, y + h, 0, y + h * 2);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, bgType.value === "white" ? "#ffffff" : "transparent");

    ctx.fillStyle = grad;
    ctx.fillRect(x, y + h, w, h);
    ctx.globalAlpha = 1.0;
  }
}

function exportLayout() {
  const [cw, ch] = canvasSize.value.split("x").map(Number);
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = cw;
  tempCanvas.height = ch;
  const tctx = tempCanvas.getContext("2d");

  if (bgType.value === "white") {
    tctx.fillStyle = "#ffffff";
    tctx.fillRect(0, 0, cw, ch);
  }

  for (const img of images) {
    drawImageWithReflection(tctx, img.image, img.x, img.y, img.w, img.h, reflectionToggle.checked);
  }

  setTimeout(() => {
    const format = fileFormat.value;
    const mime = format === "webp" ? "image/webp" : "image/png";
    const link = document.createElement("a");
    link.download = `studio.${format}`;
    link.href = tempCanvas.toDataURL(mime);
    link.click();
  }, 100);
}

function clearImages() {
  images = [];
  draw();
}

function toggleMidGuides() {
  showMidGuides = !showMidGuides;
  draw();
}

// Event listeners
canvasSize.addEventListener("change", () => {
  const [w, h] = canvasSize.value.split("x").map(Number);
  canvas.width = w;
  canvas.height = h;
  draw();
});

bgType.addEventListener("change", draw);
reflectionToggle.addEventListener("change", draw);
opacitySlider.addEventListener("input", draw);
lightAngleSlider.addEventListener("input", draw);
toggleMidBtn?.addEventListener("click", toggleMidGuides);
