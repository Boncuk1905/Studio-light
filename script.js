const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const bgColorPicker = document.getElementById("bgColorPicker");
const toggleGrid = document.getElementById("toggleGrid");

let lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;
let showReflection = true;
let dragData = {};

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflections);
lightAngleSlider.addEventListener("input", updateShadows);
bgColorPicker.addEventListener("input", () => {
  previewArea.style.setProperty("--bg-color", bgColorPicker.value);
});
toggleGrid.addEventListener("change", () => {
  document.querySelectorAll(".grid-line").forEach(line => {
    line.style.display = toggleGrid.checked ? "block" : "none";
  });
});

function handleUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.left = "100px";
      wrapper.style.top = "100px";
      wrapper.style.setProperty("--img-url", `url(${e.target.result})`);
      wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);

      const img = document.createElement("img");
      img.src = e.target.result;
      img.onload = () => {
        const ratio = img.naturalHeight / img.naturalWidth;
        wrapper.style.width = "200px";
        wrapper.style.height = `${200 * ratio}px`;
        applyShadow(wrapper, lightAngleRad);
      };

      wrapper.appendChild(img);
      previewArea.appendChild(wrapper);
      makeDraggable(wrapper);
    };
    reader.readAsDataURL(file);
  });
}

function applyShadow(wrapper, angleRad) {
  const distance = 10;
  const xOffset = Math.cos(angleRad) * distance;
  const yOffset = Math.sin(angleRad) * distance;
  wrapper.style.filter = `drop-shadow(${xOffset}px ${yOffset}px 8px rgba(0,0,0,0.15))`;
}

function updateReflections() {
  document.querySelectorAll(".image-wrapper").forEach(wrapper => {
    wrapper.style.setProperty("--reflection-opacity", showReflection ? opacitySlider.value : 0);
  });
}

function updateShadows() {
  lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;
  document.querySelectorAll(".image-wrapper").forEach(wrapper => {
    applyShadow(wrapper, lightAngleRad);
  });
}

function clearImages() {
  uploadInput.value = "";
  previewArea.innerHTML = "";
  addGridLines();
}

function makeDraggable(el) {
  el.style.position = "absolute";

  el.addEventListener("mousedown", e => {
    e.preventDefault();
    dragData.draggingEl = el;
    dragData.offsetX = e.offsetX;
    dragData.offsetY = e.offsetY;
  });

  window.addEventListener("mousemove", e => {
    if (!dragData.draggingEl) return;

    const containerRect = previewArea.getBoundingClientRect();
    let x = e.clientX - containerRect.left - dragData.offsetX;
    let y = e.clientY - containerRect.top - dragData.offsetY;

    // Snapping
    const snapThreshold = 8;
    const target = dragData.draggingEl;
    const targetRect = target.getBoundingClientRect();

    document.querySelectorAll(".image-wrapper").forEach(other => {
      if (other === target) return;
      const rect = other.getBoundingClientRect();

      // Snap X center
      const centerTarget = x + target.offsetWidth / 2;
      const centerOther = rect.left + rect.width / 2 - containerRect.left;
      if (Math.abs(centerTarget - centerOther) < snapThreshold) {
        x = centerOther - target.offsetWidth / 2;
      }

      // Snap Y center
      const centerTargetY = y + target.offsetHeight / 2;
      const centerOtherY = rect.top + rect.height / 2 - containerRect.top;
      if (Math.abs(centerTargetY - centerOtherY) < snapThreshold) {
        y = centerOtherY - target.offsetHeight / 2;
      }

      // Snap top edges
      const topOther = rect.top - containerRect.top;
      if (Math.abs(y - topOther) < snapThreshold) {
        y = topOther;
      }

      // Snap left edges
      const leftOther = rect.left - containerRect.left;
      if (Math.abs(x - leftOther) < snapThreshold) {
        x = leftOther;
      }
    });

    // Snap to canvas center
    const previewWidth = previewArea.clientWidth;
    const previewHeight = previewArea.clientHeight;

    if (Math.abs((x + target.offsetWidth / 2) - previewWidth / 2) < snapThreshold) {
      x = previewWidth / 2 - target.offsetWidth / 2;
    }

    if (Math.abs((y + target.offsetHeight / 2) - previewHeight / 2) < snapThreshold) {
      y = previewHeight / 2 - target.offsetHeight / 2;
    }

    target.style.left = x + "px";
    target.style.top = y + "px";
  });

  window.addEventListener("mouseup", () => {
    dragData.draggingEl = null;
  });
}

function exportLayout() {
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (!wrappers.length) return;

  const fileFormat = fileFormatSelect.value;
  const opacity = parseFloat(opacitySlider.value);
  const size = canvasSizeSelect.value;
  const bgColor = bgColorPicker.value;

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

  if (bgColor !== "#ffffff") {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  const containerRect = previewArea.getBoundingClientRect();

  wrappers.forEach(wrapper => {
    const img = wrapper.querySelector("img");
    const wrapperRect = wrapper.getBoundingClientRect();

    const xRatio = canvasWidth / containerRect.width;
    const yRatio = canvasHeight / containerRect.height;

    const x = (wrapperRect.left - containerRect.left) * xRatio;
    const y = (wrapperRect.top - containerRect.top) * yRatio;
    const w = wrapper.offsetWidth * xRatio;
    const h = wrapper.offsetHeight * yRatio;

    ctx.drawImage(img, x, y, w, h);

    if (showReflection) {
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
  link.download = `layout.${fileFormat}`;
  link.href = dataUrl;
  link.click();
}

function addGridLines() {
  const width = previewArea.clientWidth;
  const height = previewArea.clientHeight;

  const vertical = document.createElement("div");
  vertical.className = "grid-line vertical";
  vertical.style.left = `${width / 2}px`;
  vertical.style.top = "0";

  const horizontal = document.createElement("div");
  horizontal.className = "grid-line horizontal";
  horizontal.style.top = `${height / 2}px`;
  horizontal.style.left = "0";

  previewArea.appendChild(vertical);
  previewArea.appendChild(horizontal);
}

addGridLines();
updateReflections();
