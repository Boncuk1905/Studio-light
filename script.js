body {
  font-family: sans-serif;
  margin: 20px;
  background: #f8f8f8;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

#previewArea {
  position: relative;
  width: 100%;
  min-height: 600px;
  border: 1px solid #ccc;
  background: transparent;
  overflow: hidden;
}

.image-wrapper {
  position: absolute;
  cursor: grab;
  user-select: none;
  transition: filter 0.2s;
}

.image-wrapper img {
  display: block;
  max-width: 100%;
  height: auto;
  pointer-events: none;
}

.guide-line {
  position: absolute;
  background-color: rgba(0, 150, 255, 0.5);
  z-index: 999;
  pointer-events: none;
}

.guide-line.vertical {
  width: 1px;
  height: 100%;
}

.guide-line.horizontal {
  height: 1px;
  width: 100%;
}
function getLightAngle() {
  return (lightAngleSlider.value * Math.PI) / 180;
}

function applyShadow(wrapper, angleRad) {
  const distance = 10;
  const xOffset = Math.cos(angleRad) * distance;
  const yOffset = Math.sin(angleRad) * distance;
  wrapper.style.filter = `drop-shadow(${xOffset}px ${yOffset}px 8px rgba(0,0,0,0.15))`;
}

function updateReflectionOpacity() {
  document.querySelectorAll(".image-wrapper").forEach(wrapper => {
    if (toggleReflection.checked) {
      wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);
    }
  });
}

function updateLightDirection() {
  const angleRad = getLightAngle();
  document.querySelectorAll(".image-wrapper").forEach(wrapper => {
    applyShadow(wrapper, angleRad);
  });
}

function makeDraggable(el) {
  el.style.position = "absolute";

  el.addEventListener("mousedown", e => {
    e.preventDefault();
    draggingEl = el;
    offsetX = e.clientX - el.getBoundingClientRect().left;
    offsetY = e.clientY - el.getBoundingClientRect().top;
    el.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", e => {
    if (!draggingEl) return;

    let x = e.clientX - previewArea.getBoundingClientRect().left - offsetX;
    let y = e.clientY - previewArea.getBoundingClientRect().top - offsetY;

    // Begræns til previewArea
    x = Math.max(0, Math.min(x, previewArea.clientWidth - draggingEl.clientWidth));
    y = Math.max(0, Math.min(y, previewArea.clientHeight - draggingEl.clientHeight));

    // Snap til andre billeder på y-akse
    if (toggleGrid.checked) {
      const threshold = 5;
      const wrappers = Array.from(document.querySelectorAll(".image-wrapper")).filter(w => w !== draggingEl);
      wrappers.forEach(w => {
        if (Math.abs(w.offsetTop - y) < threshold) {
          y = w.offsetTop;
          showGuideLine("horizontal", y);
        }
        if (Math.abs(w.offsetLeft - x) < threshold) {
          x = w.offsetLeft;
          showGuideLine("vertical", x);
        }
      });
    }

    draggingEl.style.left = x + "px";
    draggingEl.style.top = y + "px";
  });

  window.addEventListener("mouseup", e => {
    if (draggingEl) {
      draggingEl.style.cursor = "grab";
      draggingEl = null;
      clearGuideLines();
    }
  });
}

function showGuideLine(type, pos) {
  clearGuideLines();
  const line = document.createElement("div");
  line.classList.add("guide-line", type);
  if (type === "vertical") {
    line.style.left = pos + "px";
    line.style.top = 0;
    line.style.height = previewArea.clientHeight + "px";
  } else {
    line.style.top = pos + "px";
    line.style.left = 0;
    line.style.width = previewArea.clientWidth + "px";
  }
  previewArea.appendChild(line);
  centerLines.push(line);
}

function clearGuideLines() {
  centerLines.forEach(line => line.remove());
  centerLines = [];
}

function toggleCenterGuides() {
  const exists = document.querySelectorAll(".center-line").length > 0;
  if (exists) {
    document.querySelectorAll(".center-line").forEach(l => l.remove());
  } else {
    const vertical = document.createElement("div");
    vertical.classList.add("guide-line", "vertical", "center-line");
    vertical.style.left = (previewArea.clientWidth / 2) + "px";
    vertical.style.top = 0;
    vertical.style.height = previewArea.clientHeight + "px";

    const horizontal = document.createElement("div");
    horizontal.classList.add("guide-line", "horizontal", "center-line");
    horizontal.style.top = (previewArea.clientHeight / 2) + "px";
    horizontal.style.left = 0;
    horizontal.style.width = previewArea.clientWidth + "px";

    previewArea.appendChild(vertical);
    previewArea.appendChild(horizontal);
  }
}

function clearImages() {
  uploadInput.value = "";
  previewArea.innerHTML = "";
  clearGuideLines();
}

// EXPORT/Download funktion med korrekt størrelsesbehandling og baggrund

function exportLayout() {
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (!wrappers.length) return;

  const fileFormat = fileFormatSelect.value;
  const size = canvasSizeSelect.value;

  let canvasWidth, canvasHeight;
  if (size === "auto") {
    canvasWidth = previewArea.clientWidth;
    canvasHeight = previewArea.clientHeight;
  } else {
    [canvasWidth, canvasHeight] = size.split("x").map(Number);
  }

  canvasElement.width = canvasWidth;
  canvasElement.height = canvasHeight;

  const ctx = canvasElement.getContext("2d");
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Baggrund
  if (bgToggle.value === "white") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Transparent
  }

  wrappers.forEach(wrapper => {
    const img = wrapper.querySelector("img");
    const previewRect = previewArea.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    const scaleX = canvasWidth / previewRect.width;
    const scaleY = canvasHeight / previewRect.height;

    const x = (wrapperRect.left - previewRect.left) * scaleX;
    const y = (wrapperRect.top - previewRect.top) * scaleY;

    // Beregn proportional størrelse, så billedet ikke bliver squished
    let drawWidth = wrapperRect.width * scaleX;
    let drawHeight = wrapperRect.height * scaleY;

    // Hvis original ratio ikke matcher canvas ratio, skaler proportionalt
    const origRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = drawWidth / drawHeight;

    if (canvasRatio > origRatio) {
      drawWidth = drawHeight * origRatio;
    } else {
      drawHeight = drawWidth / origRatio;
    }

    // Juster x/y hvis størrelsen er ændret, for at holde billede centreret i wrapper
    const adjustX = x + (wrapperRect.width * scaleX - drawWidth) / 2;
    const adjustY = y + (wrapperRect.height * scaleY - drawHeight) / 2;

    // Tegn billedet
    ctx.drawImage(img, adjustX, adjustY, drawWidth, drawHeight);

    // Refleksion, hvis slået til
    if (toggleReflection.checked) {
      ctx.save();
      ctx.translate(adjustX, adjustY + drawHeight * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = opacitySlider.value;
      ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
      ctx.restore();
    }
  });

  // Download
  const dataUrl = canvasElement.toDataURL(`image/${fileFormat}`, 1.0);
  const link = document.createElement("a");
  link.download = `studio-layout.${fileFormat}`;
  link.href = dataUrl;
  link.click();
}

// Opdater lysretning og refleksion ved start
updateLightDirection();
updateReflectionOpacity();

bgToggle.addEventListener("change", () => {
  if (bgToggle.value === "white") {
    previewArea.style.background = "#fff";
  } else {
    previewArea.style.background = "transparent";
  }
});
