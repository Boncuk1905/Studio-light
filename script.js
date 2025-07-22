const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const bgColorPicker = document.getElementById("bgColorPicker");

const verticalLine = document.getElementById("verticalLine");
const horizontalLine = document.getElementById("horizontalLine");

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);
lightAngleSlider.addEventListener("input", updateLightDirection);

let dragData = {
  draggingEl: null,
  offsetX: 0,
  offsetY: 0,
};

let lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;

function handleUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const spacingX = 230;
  const spacingY = 320;

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target.result;

      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.left = `${20 + index * spacingX}px`;
      wrapper.style.top = `${20 + index * spacingY}px`;

      const img = document.createElement("img");
      img.src = url;

      img.onload = () => {
        const ratio = img.naturalHeight / img.naturalWidth;
        wrapper.style.width = "150px";
        wrapper.style.height = `${150 * ratio}px`;
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
  previewArea.style.height = "auto";
}

function makeDraggable(el) {
  el.style.position = "absolute";

  el.addEventListener("mousedown", e => {
    e.preventDefault();
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
  let x = e.clientX - containerRect.left - dragData.offsetX;
  let y = e.clientY - containerRect.top - dragData.offsetY;

  const elWidth = el.offsetWidth;
  const elHeight = el.offsetHeight;
  const elCenterX = x + elWidth / 2;
  const elCenterY = y + elHeight / 2;

  let snapX = x;
  let snapY = y;
  let showVerticalSnap = false;
  let showHorizontalSnap = false;

  document.querySelectorAll(".image-wrapper").forEach(other => {
    if (other === el) return;

    const otherX = other.offsetLeft;
    const otherY = other.offsetTop;
    const otherWidth = other.offsetWidth;
    const otherHeight = other.offsetHeight;
    const otherCenterX = otherX + otherWidth / 2;
    const otherCenterY = otherY + otherHeight / 2;

    if (Math.abs(elCenterX - otherCenterX) < 10) {
      snapX = otherX + otherWidth / 2 - elWidth / 2;
      showVerticalSnap = true;
    }

    if (Math.abs(elCenterY - otherCenterY) < 10) {
      snapY = otherY + otherHeight / 2 - elHeight / 2;
      showHorizontalSnap = true;
    }
  });

  const midX = containerRect.width / 2;
  const midY = containerRect.height / 2;

  if (Math.abs(elCenterX - midX) < 10) {
    snapX = midX - elWidth / 2;
    showVerticalSnap = true;
  }

  if (Math.abs(elCenterY - midY) < 10) {
    snapY = midY - elHeight / 2;
    showHorizontalSnap = true;
  }

  el.style.left = `${snapX}px`;
  el.style.top = `${snapY}px`;

  verticalLine.style.left = `${snapX + elWidth / 2}px`;
  horizontalLine.style.top = `${snapY + elHeight / 2}px`;
  verticalLine.style.display = showVerticalSnap ? "block" : "none";
  horizontalLine.style.display = showHorizontalSnap ? "block" : "none";
});

window.addEventListener("mouseup", () => {
  if (dragData.draggingEl) {
    dragData.draggingEl.style.zIndex = 1;
  }
  dragData.draggingEl = null;
});
