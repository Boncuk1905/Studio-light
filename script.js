const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const toggleReflection = document.getElementById("toggleReflection");
const bgToggle = document.getElementById("bgToggle");
const toggleCenterLines = document.getElementById("toggleCenterLines");

const verticalLine = document.getElementById("verticalLine");
const horizontalLine = document.getElementById("horizontalLine");

let dragData = { draggingEl: null, offsetX: 0, offsetY: 0 };
let lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);
lightAngleSlider.addEventListener("input", updateLightDirection);
toggleCenterLines.addEventListener("change", () => {
  verticalLine.style.display = toggleCenterLines.checked ? "block" : "none";
  horizontalLine.style.display = toggleCenterLines.checked ? "block" : "none";
});

function handleUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target.result;

      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.setProperty("--img-url", `url(${url})`);
      wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);

      if (toggleReflection.checked) wrapper.classList.add("reflected");

      wrapper.style.left = `${100 + index * 220}px`;
      wrapper.style.top = `100px`;

      const img = document.createElement("img");
      img.src = url;

      img.onload = () => {
        applyShadow(wrapper, lightAngleRad);
      };

      wrapper.appendChild(img);
      previewArea.appendChild(wrapper);

      makeDraggable(wrapper);
    };
    reader.readAsDataURL(file);
  });
}

function updateReflectionOpacity() {
  document.querySelectorAll(".image-wrapper").forEach(wrapper => {
    wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);
  });
}

function updateLightDirection() {
  lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;
  document.querySelectorAll(".image-wrapper").forEach(wrapper => {
    applyShadow(wrapper, lightAngleRad);
  });
}

function applyShadow(wrapper, angleRad) {
  const distance = 10;
  const xOffset = Math.cos(angleRad) * distance;
  const yOffset = Math.sin(angleRad) * distance;
  wrapper.style.filter = `drop-shadow(${xOffset}px ${yOffset}px 8px rgba(0,0,0,0.15))`;
}

function clearImages() {
  uploadInput.value = "";
  previewArea.innerHTML = "";
  previewArea.appendChild(verticalLine);
  previewArea.appendChild(horizontalLine);
}

function makeDraggable(el) {
  el.addEventListener("mousedown", e => {
    e.preventDefault();
    dragData.draggingEl = el;
    const rect = el.getBoundingClientRect();
    const parentRect = previewArea.getBoundingClientRect();
    dragData.offsetX = e.clientX - rect.left;
    dragData.offsetY = e.clientY - rect.top;

    el.style.zIndex = 1000;
  });
}

window.addEventListener("mousemove", e => {
  if (!dragData.draggingEl) return;

  const containerRect = previewArea.getBoundingClientRect();
  const el = dragData.draggingEl;
  let x = e.clientX - containerRect.left - dragData.offsetX;
  let y = e.clientY - containerRect.top - dragData.offsetY;

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  // Snap lines to center
  if (toggleCenterLines.checked) {
    const elRect = el.getBoundingClientRect();
    const midX = containerRect.width / 2;
    const midY = containerRect.height / 2;

    const elCenterX = x + el.offsetWidth / 2;
    const elCenterY = y + el.offsetHeight / 2;

    verticalLine.style.left = `${midX}px`;
    horizontalLine.style.top = `${midY}px`;

    verticalLine.style.display = Math.abs(elCenterX - midX) < 10 ? "block" : "none";
    horizontalLine.style.display = Math.abs(elCenterY - midY) < 10 ? "block" : "none";
  }
});

window.addEventListener("mouseup", () => {
  if (dragData.draggingEl) {
    dragData.draggingEl.style.zIndex = 1;
  }
  dragData.draggingEl = null;
});

function exportLayout() {
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (!wrappers.length) return;

  const opacity = parseFloat(opacitySlider.value);
  const fileFormat = fileFormatSelect.value;
  const size = canvasSizeSelect.value;
  const bgType = bgToggle.value;

  let canvasWidth, canvasHeight;
  if (size === "auto") {
    const rect = previewArea.getBoundingClientRect();
    canvasWidth = rect.width;
    canvasHeight = rect.height;
  } else {
    [canvasWidth, canvasHeight] = size.split("x").map(Number);
  }

  canvasElement.width = canvasWidth;
  canvasElement.height = canvasHeight;

  const ctx = canvasElement.getContext("2d");
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.imageSmoothingQuality = "high";

  if (bgType === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  const containerRect = previewArea.getBoundingClientRect();

  wrappers.forEach(wrapper => {
    const img = wrapper.querySelector("img");
    const rect = wrapper.getBoundingClientRect();
    const xRatio = canvasWidth / containerRect.width;
    const yRatio = canvasHeight / containerRect.height;

    const x = (rect.left - containerRect.left) * xRatio;
    const y = (rect.top - containerRect.top) * yRatio;
    const width = rect.width * xRatio;
    const height = rect.height * yRatio;

    ctx.drawImage(img, x, y, width, height);

    if (toggleReflection.checked) {
      ctx.save();
      ctx.translate(x, y + height * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = opacity;
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();
    }
  });

  const dataUrl = canvasElement.toDataURL(`image/${fileFormat}`, 1.0);
  const link = document.createElement("a");
  link.download = `studio-layout.${fileFormat}`;
  link.href = dataUrl;
  link.click();
}
