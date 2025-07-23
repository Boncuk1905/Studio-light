const previewArea = document.getElementById("previewArea");
const canvas = document.getElementById("exportCanvas");
const ctx = canvas.getContext("2d");

const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const bgColorPicker = document.getElementById("bgColorPicker");
const transparentToggle = document.getElementById("transparentToggle");
const fileFormat = document.getElementById("fileFormat");
const canvasSizeSelect = document.getElementById("canvasSize");

let images = [];
let currentDrag = null;
let offsetX, offsetY;

// 📤 Håndter upload
document.getElementById("imageUpload").addEventListener("change", handleImageUpload);

function handleImageUpload(e) {
  Array.from(e.target.files).forEach(file => {
    const img = new Image();
    img.onload = () => addImage(img);
    img.src = URL.createObjectURL(file);
  });

  // Ryd input, så samme billede kan vælges igen
  e.target.value = "";
}

// ➕ Tilføj billede med reflektion
function addImage(img) {
  const wrapper = document.createElement("div");
  wrapper.className = "image-wrapper";
  wrapper.style.position = "absolute";
  wrapper.style.left = "100px";
  wrapper.style.top = "100px";
  wrapper.style.width = img.width + "px";
  wrapper.style.height = img.height + "px";
  wrapper.dataset.angle = "0";

  // Selve billedet
  const imgEl = img.cloneNode();
  imgEl.className = "main-image";
  wrapper.appendChild(imgEl);

  // Reflektion (vises spejlvendt)
  const reflection = img.cloneNode();
  reflection.className = "reflection";
  wrapper.appendChild(reflection);

  // Tilføj til preview
  document.getElementById("previewArea").appendChild(wrapper);

  // Tilføj til images[] array til videre brug (render, export, drag, etc.)
  images.push({
    img,
    element: wrapper,
    x: 100,
    y: 100,
    width: img.width,
    height: img.height,
    rotation: 0,
    showReflection: true,
    dragging: false,
  });

  render(); // Tegn opdatering
}

  // Resize handle
  const resize = document.createElement("div");
  resize.className = "resize-handle";
  wrapper.appendChild(resize);

  // Rotate handle
  const rotate = document.createElement("div");
  rotate.className = "rotate-handle";
  wrapper.appendChild(rotate);

  // Events
  wrapper.addEventListener("mousedown", startDrag);
  resize.addEventListener("mousedown", startResize);
  rotate.addEventListener("mousedown", startRotate);

  previewArea.appendChild(wrapper);
  images.push(wrapper);
}

// -------- DRAG --------
function startDrag(e) {
  if (e.target.classList.contains("resize-handle") || e.target.classList.contains("rotate-handle")) return;
  currentDrag = { target: this, mode: "drag" };
  offsetX = e.offsetX;
  offsetY = e.offsetY;
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", stopInteraction);
}

function drag(e) {
  if (!currentDrag || currentDrag.mode !== "drag") return;
  const el = currentDrag.target;
  el.style.left = e.pageX - previewArea.offsetLeft - offsetX + "px";
  el.style.top = e.pageY - previewArea.offsetTop - offsetY + "px";
  render();
}

// -------- RESIZE --------
function startResize(e) {
  currentDrag = { target: this.parentElement, mode: "resize" };
  e.stopPropagation();
  document.addEventListener("mousemove", resize);
  document.addEventListener("mouseup", stopInteraction);
}

function resize(e) {
  const el = currentDrag.target;
  const rect = el.getBoundingClientRect();
  const newW = e.pageX - rect.left;
  const newH = e.pageY - rect.top;
  el.style.width = newW + "px";
  el.style.height = newH + "px";
  render();
}

// -------- ROTATE --------
function startRotate(e) {
  currentDrag = { target: this.parentElement, mode: "rotate", originX: e.pageX, originY: e.pageY };
  e.stopPropagation();
  document.addEventListener("mousemove", rotate);
  document.addEventListener("mouseup", stopInteraction);
}

function rotate(e) {
  const el = currentDrag.target;
  const dx = e.pageX - el.offsetLeft - el.offsetWidth / 2;
  const dy = e.pageY - el.offsetTop - el.offsetHeight / 2;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  el.style.transform = `rotate(${angle}deg)`;
  el.dataset.angle = angle;
  render();
}

function stopInteraction() {
  document.removeEventListener("mousemove", drag);
  document.removeEventListener("mousemove", resize);
  document.removeEventListener("mousemove", rotate);
  document.removeEventListener("mouseup", stopInteraction);
  currentDrag = null;
}
// -------- RENDER --------
function render() {
  const size = canvasSizeSelect.value;
  let w = 1280, h = 1280;

  if (size !== "auto") {
    [w, h] = size.split("x").map(Number);
  }

  canvas.width = w;
  canvas.height = h;

  if (transparentToggle && transparentToggle.checked) {
    ctx.clearRect(0, 0, w, h);
  } else {
    ctx.fillStyle = bgColorPicker.value;
    ctx.fillRect(0, 0, w, h);
  }

  images.forEach(wrapper => {
    const img = wrapper.querySelector("img");
    const x = parseFloat(wrapper.style.left);
    const y = parseFloat(wrapper.style.top);
    const iw = wrapper.offsetWidth;
    const ih = wrapper.offsetHeight;
    const angle = parseFloat(wrapper.dataset.angle) || 0;
    drawImageWithReflection(ctx, img, x, y, iw, ih, angle);
  });
}

// -------- DRAW IMAGE + REFLECTION --------
async function drawImageWithReflection(ctx, img, x, y, w, h, angle) {
  ctx.save();

  // Move to center of image
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);

  // Reflection
  const opacity = parseFloat(opacitySlider.value);
  ctx.scale(1, -1);
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, -w / 2, -h / 2 - h - 5, w, h);
  ctx.globalAlpha = 1;

  ctx.restore();
}

// -------- DOWNLOAD --------
function exportLayout() {
  render();

  const format = fileFormat.value;
  const link = document.createElement("a");
  link.download = `trixie-export.${format}`;
  link.href = canvas.toDataURL(`image/${format}`);
  link.click();
}

// -------- CLEAR --------
function clearImages() {
  images.forEach(img => img.remove());
  images = [];
  render();
}

function render() {
  const canvas = document.getElementById('exportCanvas');
  const ctx = canvas.getContext('2d');

  // Canvas størrelse
  const [cw, ch] = [canvas.width, canvas.height];
  ctx.clearRect(0, 0, cw, ch);

  // Baggrund
  if (!transparentBackground) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, cw, ch);
  }

  // Tegn hvert billede
  images.forEach((imgObj) => {
    const { img, x, y, width, height, rotation, showReflection } = imgObj;

    ctx.save();

    // Flyt til midten af billedet
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);

    ctx.restore();

   // Refleksion
if (showReflection) {
  ctx.save();
  ctx.translate(x + width / 2, y + height * 1.5); // Flip omkring bunden
  ctx.scale(1, -1);
  ctx.globalAlpha = reflectionOpacity;
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();

  // Fade-out på refleksionen
  const fade = ctx.createLinearGradient(x, y + height, x, y + height + height / 2);
  fade.addColorStop(0, `rgba(255,255,255,0)`);
  fade.addColorStop(1, `rgba(255,255,255,1)`);
  ctx.fillStyle = fade;
  ctx.globalAlpha = reflectionOpacity;
  ctx.fillRect(x, y + height, width, height / 2);
  ctx.globalAlpha = 1;
}
  });

  // Midterguides
  function updateGuides(show) {
  const previewArea = document.getElementById('previewArea');

  // Fjern gamle linjer
  document.querySelectorAll('.guide-line').forEach(g => g.remove());

  if (!show) return;

  // Lodret midterlinje
  const vertical = document.createElement('div');
  vertical.className = 'guide-line';
  vertical.style.position = 'absolute';
  vertical.style.left = '50%';
  vertical.style.top = '0';
  vertical.style.bottom = '0';
  vertical.style.width = '1px';
  vertical.style.backgroundColor = 'red';
  vertical.style.opacity = '0.4';
  vertical.style.pointerEvents = 'none';
  vertical.style.transform = 'translateX(-0.5px)';
  previewArea.appendChild(vertical);

  // Vandret midterlinje
  const horizontal = document.createElement('div');
  horizontal.className = 'guide-line';
  horizontal.style.position = 'absolute';
  horizontal.style.top = '50%';
  horizontal.style.left = '0';
  horizontal.style.right = '0';
  horizontal.style.height = '1px';
  horizontal.style.backgroundColor = 'red';
  horizontal.style.opacity = '0.4';
  horizontal.style.pointerEvents = 'none';
  horizontal.style.transform = 'translateY(-0.5px)';
  previewArea.appendChild(horizontal);
}
