const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const toggleBg = document.getElementById("toggleBg");
const toggleReflection = document.getElementById("toggleReflection");

let dragData = { draggingEl: null, offsetX: 0, offsetY: 0 };
let lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;

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
      wrapper.style.setProperty("--img-url", `url(${url})`);
      wrapper.style.setProperty("--reflection-opacity", opacitySlider.value);

      const img = document.createElement("img");
      img.src = url;
      img.onload = () => applyShadow(wrapper, lightAngleRad);

      const tools = document.createElement("div");
      tools.className = "tools";

      const flipX = document.createElement("button");
      flipX.textContent = "Flip X";
      flipX.onclick = () => img.style.transform = img.style.transform.includes("scaleX(-1)") ? "scaleX(1)" : "scaleX(-1)";

      const flipY = document.createElement("button");
      flipY.textContent = "Flip Y";
      flipY.onclick = () => img.style.transform = img.style.transform.includes("scaleY(-1)") ? "scaleY(1)" : "scaleY(-1)";

      tools.appendChild(flipX);
      tools.appendChild(flipY);

      wrapper.appendChild(img);
      wrapper.appendChild(tools);
      previewArea.appendChild(wrapper);

      wrapper.style.left = "50px";
      wrapper.style.top = "50px";

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
  wrapper.style.filter = `drop-shadow(${xOffset}px ${yOffset}px 8px rgba(0,0,0,0.2))`;
}

function clearImages() {
  previewArea.innerHTML = "";
  uploadInput.value = "";
}

function makeDraggable(el) {
  el.onmousedown = function(e) {
    dragData.draggingEl = el;
    const rect = el.getBoundingClientRect();
    dragData.offsetX = e.clientX - rect.left;
    dragData.offsetY = e.clientY - rect.top;
    el.style.zIndex = 1000;
  };
}

window.onmousemove = function(e) {
  if (!dragData.draggingEl) return;
  const el = dragData.draggingEl;
  const rect = previewArea.getBoundingClientRect();
  el.style.left = `${e.clientX - rect.left - dragData.offsetX}px`;
  el.style.top = `${e.clientY - rect.top - dragData.offsetY}px`;
};

window.onmouseup = function() {
  if (dragData.draggingEl) dragData.draggingEl.style.zIndex = 1;
  dragData.draggingEl = null;
};

function exportLayout() {
  const wrappers = document.querySelectorAll(".image-wrapper");
  if (!wrappers.length) return;

  const opacity = parseFloat(opacitySlider.value);
  const fileFormat = fileFormatSelect.value;
  const size = canvasSizeSelect.value;
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
  if (toggleBg.checked) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  } else {
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
    const w = rect.width * xRatio;
    const h = rect.height * yRatio;

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (img.style.transform.includes("scaleX(-1)")) ctx.scale(-1, 1);
    if (img.style.transform.includes("scaleY(-1)")) ctx.scale(1, -1);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();

    if (toggleReflection.checked) {
      ctx.save();
      ctx.translate(x, y + h * 2);
      ctx.scale(1, -1);
      ctx.globalAlpha = opacity;
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
    }
  });

  const link = document.createElement("a");
  link.download = `layout.${fileFormat}`;
  link.href = canvasElement.toDataURL(`image/${fileFormat}`);
  link.click();
}
