
// ---------- Variabler og initialisering ----------
let images = []; // Array af billeder med { img, wrapper, x, y, width, height, rotation, showReflection }
let currentDrag = null;
let offsetX = 0, offsetY = 0;

const canvas = document.getElementById("exportCanvas");
const ctx = canvas.getContext("2d");
const previewArea = document.getElementById("previewArea");

let transparentBackground = true;
let backgroundColor = "#ffffff";
let reflectionOpacity = 0.25;

// ---------- Tilføj billede ----------
function addImage(img) {
  const wrapper = document.createElement("div");
  wrapper.className = "image-wrapper";
  wrapper.style.position = "absolute";
  wrapper.style.left = "100px";
  wrapper.style.top = "100px";

  const mainImg = img.cloneNode();
  mainImg.className = "main-image";
  wrapper.appendChild(mainImg);

  const reflection = img.cloneNode();
  reflection.className = "reflection";
  reflection.style.opacity = reflectionOpacity;
  wrapper.appendChild(reflection);

  previewArea.appendChild(wrapper);

  const imageObj = {
    img: mainImg,
    wrapper: wrapper,
    x: 100,
    y: 100,
    width: img.width,
    height: img.height,
    rotation: 0,
    showReflection: true
  };

  images.push(imageObj);
  render();
}

// ---------- Render funktion ----------
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!transparentBackground) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  images.forEach(obj => {
    ctx.save();
    ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
    ctx.rotate(obj.rotation * Math.PI / 180);
    ctx.drawImage(obj.img, -obj.width / 2, -obj.height / 2, obj.width, obj.height);
    ctx.restore();

    if (obj.showReflection) {
      ctx.save();
      ctx.translate(obj.x + obj.width / 2, obj.y + obj.height * 1.5);
      ctx.scale(1, -1);
      ctx.globalAlpha = reflectionOpacity;
      ctx.drawImage(obj.img, -obj.width / 2, -obj.height / 2, obj.width, obj.height);
      ctx.restore();

      const gradient = ctx.createLinearGradient(0, obj.y + obj.height, 0, obj.y + obj.height * 1.5);
      gradient.addColorStop(0, `rgba(255,255,255,${reflectionOpacity})`);
      gradient.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(obj.x, obj.y + obj.height, obj.width, obj.height / 2);
    }
  });

  updateGuides(document.getElementById("toggleGrid")?.checked);
}

// ---------- Drag & Snap ----------
previewArea.addEventListener("mousedown", e => {
  if (e.target.tagName === "IMG") {
    const wrapper = e.target.parentElement;
    const index = images.findIndex(obj => obj.wrapper === wrapper);
    currentDrag = images[index];
    const rect = previewArea.getBoundingClientRect();
    offsetX = e.clientX - rect.left - currentDrag.x;
    offsetY = e.clientY - rect.top - currentDrag.y;
    previewArea.addEventListener("mousemove", onMouseMove);
    previewArea.addEventListener("mouseup", onMouseUp);
  }
});

function onMouseMove(e) {
  const rect = previewArea.getBoundingClientRect();
  let x = e.clientX - rect.left - offsetX;
  let y = e.clientY - rect.top - offsetY;

  if (document.getElementById("toggleGrid")?.checked) {
    const snap = snapToGuides(x, y, currentDrag.width, currentDrag.height);
    x = snap.x;
    y = snap.y;
  }

  currentDrag.x = x;
  currentDrag.y = y;

  currentDrag.wrapper.style.left = x + "px";
  currentDrag.wrapper.style.top = y + "px";

  render();
}

function onMouseUp() {
  previewArea.removeEventListener("mousemove", onMouseMove);
  previewArea.removeEventListener("mouseup", onMouseUp);
  updateGuides(false);
  currentDrag = null;
}

// ---------- Snap funktioner ----------
function snapToGuides(x, y, width, height) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const snapThreshold = 15;
  const canvasMidX = canvas.width / 2;
  const canvasMidY = canvas.height / 2;

  let snappedX = x;
  let snappedY = y;

  const showXGuide = Math.abs(centerX - canvasMidX) < snapThreshold;
  const showYGuide = Math.abs(centerY - canvasMidY) < snapThreshold;

  document.querySelector(".guide-x").style.left = showYGuide ? canvasMidX + "px" : "-9999px";
  document.querySelector(".guide-y").style.top = showXGuide ? canvasMidY + "px" : "-9999px";

  if (showXGuide) snappedX = canvasMidX - width / 2;
  if (showYGuide) snappedY = canvasMidY - height / 2;

  return { x: snappedX, y: snappedY };
}

function updateGuides(show) {
  document.querySelector(".guide-x").style.display = show ? "block" : "none";
  document.querySelector(".guide-y").style.display = show ? "block" : "none";
}

// ---------- Rotation ----------
previewArea.addEventListener("wheel", e => {
  if (!currentDrag) return;
  e.preventDefault();
  currentDrag.rotation += (e.deltaY > 0 ? 5 : -5);
  render();
});

// ---------- Resize (Shift + MouseMove) ----------
previewArea.addEventListener("mousemove", e => {
  if (!currentDrag || !e.shiftKey) return;

  const rect = previewArea.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const newWidth = mouseX - currentDrag.x;
  const newHeight = mouseY - currentDrag.y;

  if (newWidth > 20 && newHeight > 20) {
    currentDrag.width = newWidth;
    currentDrag.height = newHeight;
    currentDrag.wrapper.querySelector("img").style.width = newWidth + "px";
    render();
  }
});

// ---------- UI Inputs ----------
document.getElementById("opacitySlider")?.addEventListener("input", e => {
  reflectionOpacity = parseFloat(e.target.value);
  render();
});

document.getElementById("bgColorPicker")?.addEventListener("input", e => {
  backgroundColor = e.target.value;
  render();
});

document.getElementById("transparentToggle")?.addEventListener("change", e => {
  transparentBackground = e.target.checked;
  render();
});

document.getElementById("canvasSize")?.addEventListener("change", e => {
  const value = e.target.value;
  if (value === "auto") {
    let maxX = 0, maxY = 0;
    images.forEach(img => {
      maxX = Math.max(maxX, img.x + img.width);
      maxY = Math.max(maxY, img.y + img.height);
    });
    canvas.width = maxX + 100;
    canvas.height = maxY + 100;
  } else {
    const [w, h] = value.split("x").map(Number);
    canvas.width = w;
    canvas.height = h;
  }
  render();
});

// ---------- Download ----------
function exportLayout() {
  render();
  const format = document.getElementById("fileFormat").value;
  const mimeType = format === "webp" ? "image/webp" : "image/png";
  const link = document.createElement("a");
  link.download = "layout." + format;
  link.href = canvas.toDataURL(mimeType);
  link.click();
}

// ---------- Clear ----------
function clearImages() {
  images = [];
  currentDrag = null;
  previewArea.innerHTML = "";
  render();
}

// Init
render();
