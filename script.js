const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const bgColorPicker = document.getElementById("bgColorPicker");
const toggleGrid = document.getElementById("toggleGrid");
const toggleReflection = document.getElementById("toggleReflection");
const showCenterLinesBtn = document.getElementById("showCenterLines");

let dragData = { draggingEl: null, offsetX: 0, offsetY: 0 };
let lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);
lightAngleSlider.addEventListener("input", updateLightDirection);
toggleGrid.addEventListener("change", () => {
  previewArea.classList.toggle("show-grid", toggleGrid.checked);
});
showCenterLinesBtn.addEventListener("click", toggleCenterLines);

function handleUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;
  const spacing = 20;

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.src = e.target.result;

      img.onload = () => {
        const wrapper = document.createElement("div");
        wrapper.className = "image-wrapper";
        wrapper.style.left = `${index * spacing}px`;
        wrapper.style.top = `${index * spacing}px`;

        wrapper.appendChild(img);
        previewArea.appendChild(wrapper);

        applyShadow(wrapper, lightAngleRad);
        makeDraggable(wrapper);
      };
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
  previewArea.style.height = "auto";
}

function makeDraggable(el) {
  el.style.position = "absolute";

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

  const containerRect = previewArea.getBoundingClientRect();
  const el = dragData.draggingEl;
  const elRect = el.getBoundingClientRect();

  let x = e.clientX - containerRect.left - dragData.offsetX;
  let y = e.clientY - containerRect.top - dragData.offsetY;

  el.style.left = x + "px";
  el.style.top = y + "px";

  updateSnapLines(el);
});

window.addEventListener("mouseup", () => {
  if (dragData.draggingEl) dragData.draggingEl.style.zIndex = 1;
  dragData.draggingEl = null;
  hideSnapLines();
});

function exportLayout() {
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (!wrappers.length) return;

  const fileFormat = fileFormatSelect.value;
  const sizeOption = canvasSizeSelect.value;
  const showReflection = document.getElementById("toggleReflection").checked;
  const transparent = document.getElementById("transparentToggle").checked;
  const bgColor = bgColorPicker.value;
  const opacity = parseFloat(opacitySlider.value);

  // Bestem canvas størrelse
  let canvasWidth, canvasHeight;

  if (sizeOption === "auto") {
    const bounds = previewArea.getBoundingClientRect();
    canvasWidth = bounds.width;
    canvasHeight = bounds.height;
  } else {
    [canvasWidth, canvasHeight] = sizeOption.split("x").map(Number);
  }

  canvasElement.width = canvasWidth;
  canvasElement.height = canvasHeight;

  const ctx = canvasElement.getContext("2d");
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (!transparent) {
    ctx.fillStyle = bgColor;
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

    const drawWidth = rect.width * xRatio;
    const drawHeight = rect.height * yRatio;

    ctx.drawImage(img, x, y, drawWidth, drawHeight);

    if (showReflection) {
      ctx.save();
      ctx.translate(x, y + drawHeight * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = opacity;
      ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  });

  // Gem som fil
  const dataUrl = canvasElement.toDataURL(`image/${fileFormat}`);
  const link = document.createElement("a");
  link.download = `studio-layout.${fileFormat}`;
  link.href = dataUrl;
  link.click();
}
  // Background
  if (bgColor !== "transparent") {
    ctx.fillStyle = bgColor;
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
    const w = rect.width * xRatio;
    const h = rect.height * yRatio;

    ctx.drawImage(img, x, y, w, h);

    // Reflection
    if (exportReflection) {
      ctx.save();
      ctx.translate(x, y + h * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = opacity;
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    }
  });

  const dataUrl = canvasElement.toDataURL(`image/${fileFormat}`, 1.0);
  const link = document.createElement("a");
  link.download = `studio-layout.${fileFormat}`;
  link.href = dataUrl;
  link.click();
}

// SNAP LINES + MID LINE
const hLine = document.createElement("div");
hLine.className = "snap-line horizontal";
const vLine = document.createElement("div");
vLine.className = "snap-line vertical";
previewArea.appendChild(hLine);
previewArea.appendChild(vLine);

function updateSnapLines(el) {
  const threshold = 5;
  const elRect = el.getBoundingClientRect();
  const centerX = elRect.left + elRect.width / 2;
  const centerY = elRect.top + elRect.height / 2;

  let snapped = false;
  document.querySelectorAll(".image-wrapper").forEach(other => {
    if (other === el) return;
    const r = other.getBoundingClientRect();
    const otherCenterX = r.left + r.width / 2;
    const otherCenterY = r.top + r.height / 2;

    if (Math.abs(centerX - otherCenterX) < threshold) {
      vLine.style.left = `${centerX - previewArea.getBoundingClientRect().left}px`;
      vLine.style.display = "block";
      snapped = true;
    }
    if (Math.abs(centerY - otherCenterY) < threshold) {
      hLine.style.top = `${centerY - previewArea.getBoundingClientRect().top}px`;
      hLine.style.display = "block";
      snapped = true;
    }
  });

  if (!snapped) hideSnapLines();
}

function hideSnapLines() {
  hLine.style.display = "none";
  vLine.style.display = "none";
}

function toggleCenterLines() {
  const centerX = previewArea.offsetWidth / 2;
  const centerY = previewArea.offsetHeight / 2;

  vLine.style.left = `${centerX}px`;
  hLine.style.top = `${centerY}px`;
  vLine.style.display = "block";
  hLine.style.display = "block";
}
