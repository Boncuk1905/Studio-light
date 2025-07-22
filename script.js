const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const bgColorPicker = document.getElementById("bgColorPicker");
const transparentToggle = document.getElementById("transparentToggle");
const reflectionToggle = document.getElementById("reflectionToggle");
const centerGuideToggle = document.getElementById("centerGuideToggle");

const centerGuides = document.querySelectorAll(".center-guide");

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);
lightAngleSlider.addEventListener("input", updateLightDirection);
centerGuideToggle.addEventListener("change", toggleCenterGuides);

let lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;

function handleUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target.result;

      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.left = "100px";
      wrapper.style.top = "100px";
      wrapper.setAttribute("draggable", false);

      const img = document.createElement("img");
      img.src = url;
      img.onload = () => {
        applyShadow(wrapper, lightAngleRad);
      };

      wrapper.appendChild(img);

      if (reflectionToggle.checked) {
        const reflection = img.cloneNode();
        reflection.className = "image-reflection";
        wrapper.appendChild(reflection);
      }

      previewArea.appendChild(wrapper);
      makeDraggable(wrapper);
    };
    reader.readAsDataURL(file);
  });
}

function makeDraggable(el) {
  let isDragging = false;

  el.addEventListener("mousedown", e => {
    e.preventDefault();
    isDragging = true;
    const rect = el.getBoundingClientRect();
    el.offsetX = e.clientX - rect.left;
    el.offsetY = e.clientY - rect.top;
    el.style.zIndex = 1000;
  });

  window.addEventListener("mousemove", e => {
    if (!isDragging) return;

    const containerRect = previewArea.getBoundingClientRect();
    const x = e.clientX - containerRect.left - el.offsetX;
    const y = e.clientY - containerRect.top - el.offsetY;

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    handleSnap(el);
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    clearSnapLines();
    el.style.zIndex = 1;
  });
}

function updateReflectionOpacity() {
  document.querySelectorAll(".image-reflection").forEach(img => {
    img.style.opacity = opacitySlider.value;
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
}

function toggleCenterGuides() {
  centerGuides.forEach(guide => {
    guide.style.display = centerGuideToggle.checked ? "block" : "none";
  });
}

function handleSnap(movingEl) {
  clearSnapLines();

  const movingRect = movingEl.getBoundingClientRect();
  const movingCenterX = movingRect.left + movingRect.width / 2;
  const movingCenterY = movingRect.top + movingRect.height / 2;

  let snapped = false;

  document.querySelectorAll(".image-wrapper").forEach(otherEl => {
    if (otherEl === movingEl) return;

    const otherRect = otherEl.getBoundingClientRect();
    const otherCenterX = otherRect.left + otherRect.width / 2;
    const otherCenterY = otherRect.top + otherRect.height / 2;

    const dx = Math.abs(movingCenterX - otherCenterX);
    const dy = Math.abs(movingCenterY - otherCenterY);

    if (dx < 10) {
      showSnapLine("vertical", otherCenterX - previewArea.getBoundingClientRect().left);
      movingEl.style.left = `${otherEl.offsetLeft + (otherEl.offsetWidth - movingEl.offsetWidth) / 2}px`;
      snapped = true;
    }

    if (dy < 10) {
      showSnapLine("horizontal", otherCenterY - previewArea.getBoundingClientRect().top);
      movingEl.style.top = `${otherEl.offsetTop + (otherEl.offsetHeight - movingEl.offsetHeight) / 2}px`;
      snapped = true;
    }
  });

  // Snap to center of preview
  const previewRect = previewArea.getBoundingClientRect();
  const centerX = previewRect.width / 2;
  const centerY = previewRect.height / 2;

  if (Math.abs(movingCenterX - (previewRect.left + centerX)) < 10) {
    showSnapLine("vertical", centerX);
    movingEl.style.left = `${centerX - movingEl.offsetWidth / 2}px`;
  }

  if (Math.abs(movingCenterY - (previewRect.top + centerY)) < 10) {
    showSnapLine("horizontal", centerY);
    movingEl.style.top = `${centerY - movingEl.offsetHeight / 2}px`;
  }
}

function showSnapLine(direction, position) {
  const line = document.createElement("div");
  line.classList.add("snap-line", direction);
  if (direction === "vertical") {
    line.style.left = `${position}px`;
  } else {
    line.style.top = `${position}px`;
  }
  previewArea.appendChild(line);
}

function clearSnapLines() {
  document.querySelectorAll(".snap-line").forEach(line => line.remove());
}

function exportLayout() {
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (!wrappers.length) return;

  const fileFormat = fileFormatSelect.value;
  const [canvasWidth, canvasHeight] = canvasSizeSelect.value === "auto"
    ? [previewArea.offsetWidth, previewArea.offsetHeight]
    : canvasSizeSelect.value.split("x").map(Number);

  canvasElement.width = canvasWidth;
  canvasElement.height = canvasHeight;

  const ctx = canvasElement.getContext("2d");
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.imageSmoothingQuality = "high";

  if (transparentToggle.checked) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  } else {
    ctx.fillStyle = bgColorPicker.value;
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

    if (reflectionToggle.checked) {
      ctx.save();
      ctx.translate(x, y + height * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = parseFloat(opacitySlider.value);
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();
    }
  });

  const dataUrl = canvasElement.toDataURL(`image/${fileFormat}`);
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `studio-layout.${fileFormat}`;
  link.click();
}
