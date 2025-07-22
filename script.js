const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const bgColorPicker = document.getElementById("bgColorPicker");
const toggleGrid = document.getElementById("toggleGrid");
let showReflection = true;

let dragData = {
  draggingEl: null,
  offsetX: 0,
  offsetY: 0,
};

let lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;

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
      wrapper.style.setProperty("--img-url", `url(${url})`);
      wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);

      const img = document.createElement("img");
      img.src = url;
      img.onload = () => {
        const ratio = img.naturalHeight / img.naturalWidth;
        wrapper.style.height = `${wrapper.clientWidth * ratio}px`;
        applyShadow(wrapper, lightAngleRad);
      };

      wrapper.appendChild(img);
      previewArea.appendChild(wrapper);

      makeDraggable(wrapper);
    };
    reader.readAsDataURL(file);
  });
}

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", () => {
  document.querySelectorAll(".image-wrapper").forEach(wrapper => {
    wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);
  });
});
lightAngleSlider.addEventListener("input", () => {
  lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;
  document.querySelectorAll(".image-wrapper").forEach(wrapper => {
    applyShadow(wrapper, lightAngleRad);
  });
});
bgColorPicker.addEventListener("input", () => {
  previewArea.style.backgroundColor = bgColorPicker.value;
});
toggleGrid.addEventListener("change", () => {
  document.querySelectorAll(".guide-line").forEach(el => el.style.display = toggleGrid.checked ? "block" : "none");
});

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

function makeDraggable(el) {
  el.style.position = "absolute";

  el.addEventListener("mousedown", e => {
    dragData.draggingEl = el;
    const rect = el.getBoundingClientRect();
    const container = previewArea.getBoundingClientRect();
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

  // Snap til midten og andre billeder
  const snapThreshold = 10;
  let snapX = null;
  let snapY = null;

  const elRect = el.getBoundingClientRect();
  const elCenterX = x + elRect.width / 2;
  const elCenterY = y + elRect.height / 2;

  document.querySelectorAll(".image-wrapper").forEach(other => {
    if (other === el) return;
    const otherRect = other.getBoundingClientRect();
    const otherX = other.offsetLeft;
    const otherY = other.offsetTop;

    const otherCenterX = otherX + otherRect.width / 2;
    const otherCenterY = otherY + otherRect.height / 2;

    if (Math.abs(elCenterX - otherCenterX) < snapThreshold) {
      snapX = otherCenterX - elRect.width / 2;
    }

    if (Math.abs(elCenterY - otherCenterY) < snapThreshold) {
      snapY = otherCenterY - elRect.height / 2;
    }
  });

  // Snap til midten af previewArea
  const midX = previewArea.clientWidth / 2;
  const midY = previewArea.clientHeight / 2;

  if (Math.abs(elCenterX - midX) < snapThreshold) {
    snapX = midX - elRect.width / 2;
  }

  if (Math.abs(elCenterY - midY) < snapThreshold) {
    snapY = midY - elRect.height / 2;
  }

  if (snapX !== null) x = snapX;
  if (snapY !== null) y = snapY;

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
});

window.addEventListener("mouseup", () => {
  if (dragData.draggingEl) {
    dragData.draggingEl.style.zIndex = 1;
    dragData.draggingEl = null;
  }
});

function exportLayout() {
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (!wrappers.length) return;

  const opacity = parseFloat(opacitySlider.value);
  const fileFormat = fileFormatSelect.value;
  const size = canvasSizeSelect.value;
  const background = bgColorPicker.value;

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

  if (background !== "transparent") {
    ctx.fillStyle = background;
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

    if (showReflection) {
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
