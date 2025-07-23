// --- Initialisering ---
let images = [];
let currentDrag = null;
let offsetX = 0, offsetY = 0;
let transparentBackground = true;
let backgroundColor = "#ffffff";
let reflectionOpacity = 0.25;
let zoomLevel = 1;

const previewArea = document.getElementById("previewArea");
const canvas = document.getElementById("exportCanvas");
const ctx = canvas.getContext("2d");

// --- Upload billeder ---
document.getElementById("imageUpload").addEventListener("change", e => {
  document.getElementById("opacitySlider").addEventListener("input", function () {
  reflectionOpacity = parseFloat(this.value);
  render();
});
  [...e.target.files].forEach(file => {
    const reader = new FileReader();
    reader.onload = evt => {
      const img = new Image();
      img.onload = () => addImage(img);
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
});

function addImage(img) {
  const imgObj = {
    img,
    x: 100,
    y: 100,
    width: img.width,
    height: img.height,
    rotation: 0,
    showReflection: true,
  };

  images.push(imgObj);

  // DOM-element
  const wrapper = document.createElement("div");
  wrapper.className = "image-wrapper";
  wrapper.style.left = imgObj.x + "px";
  wrapper.style.top = imgObj.y + "px";
  wrapper.style.width = imgObj.width + "px";
  wrapper.style.height = imgObj.height + "px";
  imgObj.wrapper = wrapper;

  // Selve billedet
  const mainImg = img.cloneNode();
  mainImg.className = "main-image";
  wrapper.appendChild(mainImg);

  // Refleksion
  const reflection = img.cloneNode();
  reflection.className = "reflection";
  wrapper.appendChild(reflection);

  // Resize-handle
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "resize-handle";
  wrapper.appendChild(resizeHandle);

  // Lyt efter resize
  let resizing = false;

  resizeHandle.addEventListener("mousedown", e => {
    e.stopPropagation();
    resizing = true;
    currentDrag = imgObj;
    offsetX = e.clientX;
    offsetY = e.clientY;

    function onMove(ev) {
      const dx = ev.clientX - offsetX;
      const dy = ev.clientY - offsetY;
      offsetX = ev.clientX;
      offsetY = ev.clientY;

      imgObj.width += dx;
      imgObj.height += dy;

      wrapper.style.width = imgObj.width + "px";
      wrapper.style.height = imgObj.height + "px";

      render();
    }

    function onUp() {
      resizing = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  previewArea.appendChild(wrapper);

  makeDraggable(wrapper, imgObj);
  render();
}

// --- Drag, snap og resize ---
function makeDraggable(wrapper, imgObj) {
  let resizing = false;

  wrapper.addEventListener("mousedown", e => {
    if (e.shiftKey) resizing = true;
    currentDrag = imgObj;
    const rect = previewArea.getBoundingClientRect();
    offsetX = e.clientX - rect.left - currentDrag.x;
    offsetY = e.clientY - rect.top - currentDrag.y;
    previewArea.addEventListener("mousemove", onMouseMove);
    previewArea.addEventListener("mouseup", onMouseUp);
  });

  function onMouseMove(e) {
    const rect = previewArea.getBoundingClientRect();
    let x = e.clientX - rect.left - offsetX;
    let y = e.clientY - rect.top - offsetY;

    if (resizing) {
      currentDrag.width = Math.max(20, x - currentDrag.x);
      currentDrag.height = Math.max(20, y - currentDrag.y);
      wrapper.style.width = currentDrag.width + "px";
      wrapper.style.height = currentDrag.height + "px";
    } else {
      currentDrag.x = x;
      currentDrag.y = y;
      wrapper.style.left = x + "px";
      wrapper.style.top = y + "px";
    }
    render();
  }

  function onMouseUp() {
    resizing = false;
    previewArea.removeEventListener("mousemove", onMouseMove);
    previewArea.removeEventListener("mouseup", onMouseUp);
  }
}

// --- Rotation ---
previewArea.addEventListener("wheel", e => {
  if (!currentDrag) return;
  e.preventDefault();
  currentDrag.rotation += (e.deltaY > 0 ? 5 : -5);
  render();
});

// --- Render funktion ---
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

   // Refleksion
if (showReflection) {
  ctx.save();
  ctx.translate(x + width / 2, y + height * 1.5);
  ctx.scale(1, -1);
  ctx.globalAlpha = reflectionOpacity;
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();

  // Fade-out på refleksion
  const gradient = ctx.createLinearGradient(0, y + height, 0, y + height * 1.5);
  gradient.addColorStop(0, `rgba(255,255,255,${reflectionOpacity})`);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y + height, width, height / 2);
}

// --- UI kontroller ---
document.getElementById("transparentToggle").addEventListener("change", e => {
  transparentBackground = e.target.checked;
  render();
});
document.getElementById("bgColorPicker").addEventListener("input", e => {
  backgroundColor = e.target.value;
  render();
});
document.getElementById("opacitySlider").addEventListener("input", e => {
  reflectionOpacity = parseFloat(e.target.value);
  render();
});
document.getElementById("canvasSize").addEventListener("change", e => {
  const val = e.target.value;
  if (val === "auto") {
    let maxX = 0, maxY = 0;
    images.forEach(i => {
      maxX = Math.max(maxX, i.x + i.width);
      maxY = Math.max(maxY, i.y + i.height);
    });
    canvas.width = maxX + 100;
    canvas.height = maxY + 100;
  } else {
    const [w, h] = val.split("x").map(Number);
    canvas.width = w;
    canvas.height = h;
  }
  render();
});
document.getElementById("toggleGrid").addEventListener("change", () => {
  document.body.classList.toggle("show-midlines");
});
function exportLayout() {
  render();
  const format = document.getElementById("fileFormat").value;
  const mime = format === "webp" ? "image/webp" : "image/png";
  const link = document.createElement("a");
  link.download = "layout." + format;
  link.href = canvas.toDataURL(mime);
  link.click();
}
function clearImages() {
  images = [];
  previewArea.innerHTML = "";
  render();
}
function zoomIn() {
  zoomLevel *= 1.1;
  previewArea.style.transform = `scale(${zoomLevel})`;
}
function zoomOut() {
  zoomLevel /= 1.1;
  previewArea.style.transform = `scale(${zoomLevel})`;
}
