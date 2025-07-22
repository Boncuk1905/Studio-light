const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const bgColorPicker = document.getElementById("bgColorPicker");
const toggleReflection = document.getElementById("toggleReflection");
const toggleGrid = document.getElementById("toggleGrid");

let dragData = { draggingEl: null, offsetX: 0, offsetY: 0 };
let guideLines = [];

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);
lightAngleSlider.addEventListener("input", updateLightDirection);

function handleUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target.result;

      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.left = "100px";
      wrapper.style.top = "100px";

      const img = document.createElement("img");
      img.src = url;

      img.onload = () => {
        const reflection = img.cloneNode();
        reflection.classList.add("reflection");
        reflection.style.opacity = opacitySlider.value;
        if (toggleReflection.checked) wrapper.appendChild(reflection);
      };

      wrapper.appendChild(img);
      previewArea.appendChild(wrapper);

      makeDraggable(wrapper);
    };
    reader.readAsDataURL(file);
  });
}

function makeDraggable(el) {
  el.addEventListener("mousedown", e => {
    dragData.draggingEl = el;
    const rect = el.getBoundingClientRect();
    dragData.offsetX = e.clientX - rect.left;
    dragData.offsetY = e.clientY - rect.top;
    el.style.zIndex = 1000;
  });
}

window.addEventListener("mousemove", e => {
  if (!dragData.draggingEl) return;
  const el = dragData.draggingEl;
  const containerRect = previewArea.getBoundingClientRect();

  let x = e.clientX - containerRect.left - dragData.offsetX;
  let y = e.clientY - containerRect.top - dragData.offsetY;

  el.style.left = x + "px";
  el.style.top = y + "px";

  if (toggleGrid.checked) showSnapGuides(el);
});

window.addEventListener("mouseup", () => {
  if (dragData.draggingEl) dragData.draggingEl.style.zIndex = 1;
  dragData.draggingEl = null;
  clearGuideLines();
});

function showSnapGuides(current) {
  clearGuideLines();
  const currentRect = current.getBoundingClientRect();
  const centerX = currentRect.left + currentRect.width / 2;
  const centerY = currentRect.top + currentRect.height / 2;

  document.querySelectorAll(".image-wrapper").forEach(other => {
    if (other === current) return;
    const otherRect = other.getBoundingClientRect();
    const otherCenterX = otherRect.left + otherRect.width / 2;
    const otherCenterY = otherRect.top + otherRect.height / 2;

    if (Math.abs(centerX - otherCenterX) < 5) addGuideLine("vertical", centerX);
    if (Math.abs(centerY - otherCenterY) < 5) addGuideLine("horizontal", centerY);
  });
}

function addGuideLine(type, position, color = "blue") {
  const line = document.createElement("div");
  line.classList.add("guide-line", type);
  if (type === "vertical") line.style.left = position + "px";
  else line.style.top = position + "px";
  if (color === "red") line.classList.add("center-line");
  previewArea.appendChild(line);
  guideLines.push(line);
}

function clearGuideLines() {
  guideLines.forEach(line => line.remove());
  guideLines = [];
}

function updateReflectionOpacity() {
  const opacity = parseFloat(opacitySlider.value);
  document.querySelectorAll(".reflection").forEach(ref => {
    ref.style.opacity = opacity;
  });
}

function updateLightDirection() {
  const angle = parseInt(lightAngleSlider.value);
  document.querySelectorAll(".reflection").forEach(ref => {
    ref.style.transform = `scaleY(-1) rotate(${angle}deg)`;
  });
}

function toggleCenterGuides() {
  clearGuideLines();
  const centerX = previewArea.clientWidth / 2;
  const centerY = previewArea.clientHeight / 2;
  addGuideLine("vertical", centerX, "red");
  addGuideLine("horizontal", centerY, "red");
}

function clearImages() {
  previewArea.innerHTML = '';
}

function exportLayout() {
  const size = canvasSizeSelect.value;
  const format = fileFormatSelect.value;
  const backgroundColor = bgColorPicker.value;
  const transparent = backgroundColor === "#ffffff" ? false : true;

  const canvas = canvasElement;
  const ctx = canvas.getContext("2d");

  if (size === "auto") {
    canvas.width = previewArea.clientWidth;
    canvas.height = previewArea.clientHeight;
  } else {
    const [w, h] = size.split("x").map(Number);
    canvas.width = w;
    canvas.height = h;
  }

  if (!transparent) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const wrappers = Array.from(previewArea.querySelectorAll(".image-wrapper"));

  wrappers.forEach(wrapper => {
    const img = wrapper.querySelector("img");
    const rect = wrapper.getBoundingClientRect();
    const parentRect = previewArea.getBoundingClientRect();

    const x = rect.left - parentRect.left;
    const y = rect.top - parentRect.top;
    const scaleX = canvas.width / previewArea.clientWidth;
    const scaleY = canvas.height / previewArea.clientHeight;

    const drawX = x * scaleX;
    const drawY = y * scaleY;
    const drawW = img.width * scaleX;
    const drawH = img.height * scaleY;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    const reflection = wrapper.querySelector(".reflection");
    if (reflection && toggleReflection.checked) {
      ctx.save();
      ctx.translate(drawX, drawY + drawH * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = parseFloat(opacitySlider.value);
      ctx.drawImage(img, 0, 0, drawW, drawH);
      ctx.restore();
    }
  });

  canvas.toBlob(blob => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `export.${format}`;
    link.click();
  }, `image/${format}`);
}