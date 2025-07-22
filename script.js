const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const bgToggle = document.getElementById("bgToggle");
const reflectionToggle = document.getElementById("reflectionToggle");
const showGuidesCheckbox = document.getElementById("showGuides");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");

let dragData = {
  draggingEl: null,
  offsetX: 0,
  offsetY: 0,
};

let resizeData = {
  resizingEl: null,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
};

let lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;

const SNAP_DISTANCE = 10;

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);
lightAngleSlider.addEventListener("input", updateLightDirection);
bgToggle.addEventListener("change", updateBackground);
reflectionToggle.addEventListener("change", () => {
  updateReflectionOpacity();
});
showGuidesCheckbox.addEventListener("change", updateGuideLinesToggle);
clearBtn.addEventListener("click", clearImages);
downloadBtn.addEventListener("click", exportLayout);

function handleUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      createImageWrapper(url);
    };
    reader.readAsDataURL(file);
  });
  // Clear input for next upload
  uploadInput.value = "";
}

function createImageWrapper(url) {
  const wrapper = document.createElement("div");
  wrapper.className = "image-wrapper";
  wrapper.style.left = "20px";
  wrapper.style.top = "20px";
  wrapper.style.width = "200px";
  wrapper.style.height = "auto";
  wrapper.style.position = "absolute";

  const img = document.createElement("img");
  img.src = url;
  img.draggable = false;

  img.onload = () => {
    // Sæt højde så prop. bevares ved fast bredde
    const ratio = img.naturalHeight / img.naturalWidth;
    wrapper.style.height = `${200 * ratio}px`;
  };

  wrapper.appendChild(img);

  // Resize handle
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "resize-handle";
  wrapper.appendChild(resizeHandle);

  previewArea.appendChild(wrapper);

  makeDraggable(wrapper);
  makeResizable(wrapper, resizeHandle);
  updateReflectionOpacity();
  updateLightDirection();
}

function makeDraggable(el) {
  el.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("resize-handle")) return; // Ignore if resizing

    e.preventDefault();
    dragData.draggingEl = el;

    const rect = el.getBoundingClientRect();
    const containerRect = previewArea.getBoundingClientRect();

    dragData.offsetX = e.clientX - rect.left;
    dragData.offsetY = e.clientY - rect.top;

    el.classList.add("dragging");

    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", onStopDrag);
  });
}

function onDrag(e) {
  if (!dragData.draggingEl) return;

  const containerRect = previewArea.getBoundingClientRect();
  const el = dragData.draggingEl;
  const elRect = el.getBoundingClientRect();

  let x = e.clientX - containerRect.left - dragData.offsetX;
  let y = e.clientY - containerRect.top - dragData.offsetY;

  // Snap to guides + other images
  const snap = getSnapPosition(el, x, y);

  x = snap.x;
  y = snap.y;

  el.style.left = x + "px";
  el.style.top = y + "px";

  updateGuides(snap.guides);
}

function getSnapPosition(el, x, y) {
  const guides = [];
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper")).filter(
    (w) => w !== el
  );

  const elRect = {
    left: x,
    top: y,
    right: x + el.offsetWidth,
    bottom: y + el.offsetHeight,
    centerX: x + el.offsetWidth / 2,
    centerY: y + el.offsetHeight / 2,
  };

  // Snap to mid container
  const containerCenterX = previewArea.clientWidth / 2;
  const containerCenterY = previewArea.clientHeight / 2;

  let snapX = elRect.left;
  let snapY = elRect.top;

  // Snap X to container center
  if (Math.abs(elRect.centerX - containerCenterX) < SNAP_DISTANCE) {
    snapX = containerCenterX - el.offsetWidth / 2;
    guides.push({ type: "vertical", pos: containerCenterX });
  }

  // Snap Y to container center
  if (Math.abs(elRect.centerY - containerCenterY) < SNAP_DISTANCE) {
    snapY = containerCenterY - el.offsetHeight / 2;
    guides.push({ type: "horizontal", pos: containerCenterY });
  }

  // Snap to other images edges and centers
  wrappers.forEach((w) => {
    const r = w.getBoundingClientRect();
    const parentRect = previewArea.getBoundingClientRect();

    const other = {
      left: r.left - parentRect.left,
      right: r.right - parentRect.left,
      top: r.top - parentRect.top,
      bottom: r.bottom - parentRect.top,
      centerX: r.left - parentRect.left + w.offsetWidth / 2,
      centerY: r.top - parentRect.top + w.offsetHeight / 2,
    };

    // X snap: left, right, center
    if (Math.abs(elRect.left - other.left) < SNAP_DISTANCE) {
      snapX = other.left;
      guides.push({ type: "vertical", pos: other.left });
    }
    if (Math.abs(elRect.right - other.right) < SNAP_DISTANCE) {
      snapX = other.right - el.offsetWidth;
      guides.push({ type: "vertical", pos: other.right });
    }
    if (Math.abs(elRect.centerX - other.centerX) < SNAP_DISTANCE) {
      snapX = other.centerX - el.offsetWidth / 2;
      guides.push({ type: "vertical", pos: other.centerX });
    }

    // Y snap: top, bottom, center
    if (Math.abs(elRect.top - other.top) < SNAP_DISTANCE) {
      snapY = other.top;
      guides.push({ type: "horizontal", pos: other.top });
    }
    if (Math.abs(elRect.bottom - other.bottom) < SNAP_DISTANCE) {
      snapY = other.bottom - el.offsetHeight;
      guides.push({ type: "horizontal", pos: other.bottom });
    }
    if (Math.abs(elRect.centerY - other.centerY) < SNAP_DISTANCE) {
      snapY = other.centerY - el.offsetHeight / 2;
      guides.push({ type: "horizontal", pos: other.centerY });
    }
  });

  return { x: snapX, y: snapY, guides };
}

function updateGuides(guides) {
  clearGuides();
  if (!showGuidesCheckbox.checked) return;

  guides.forEach((g) => {
    const line = document.createElement("div");
    line.className = "guide-line " + (g.type === "vertical" ? "vertical" : "horizontal");
    if (g.type === "vertical") {
      line.style.left = g.pos + "px";
      line.style.top = 0;
      line.style.height = "100%";
    } else {
      line.style.top = g.pos + "px";
      line.style.left = 0;
      line.style.width = "100%";
    }
    previewArea.appendChild(line);
  });
}

function clearGuides() {
  document.querySelectorAll(".guide-line").forEach((el) => el.remove());
}

function onStopDrag() {
  if (dragData.draggingEl) {
    dragData.draggingEl.classList.remove("dragging");
    dragData.draggingEl = null;
    clearGuides();
  }
  window.removeEventListener("mousemove", onDrag);
  window.removeEventListener("mouseup", onStopDrag);
}

function makeResizable(wrapper, handle) {
  handle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();

    resizeData.resizingEl = wrapper;
    resizeData.startX = e.clientX;
    resizeData.startY = e.clientY;
    resizeData.startWidth = wrapper.offsetWidth;
    resizeData.startHeight = wrapper.offsetHeight;

    window.addEventListener("mousemove", onResize);
    window.addEventListener("mouseup", onStopResize);
  });
}

function onResize(e) {
  if (!resizeData.resizingEl) return;

  const dx = e.clientX - resizeData.startX;
  const dy = e.clientY - resizeData.startY;

  // Maintain aspect ratio
  const aspectRatio = resizeData.startHeight / resizeData.startWidth;

  let newWidth = resizeData.startWidth + dx;
  let newHeight = newWidth * aspectRatio;

  if (newWidth < 30) newWidth = 30;
  if (newHeight < 30) newHeight = 30;

  resizeData.resizingEl.style.width = newWidth + "px";
  resizeData.resizingEl.style.height = newHeight + "px";
}

function onStopResize() {
  resizeData.resizingEl = null;
  window.removeEventListener("mousemove", onResize);
  window.removeEventListener("mouseup", onStopResize);
}

function updateReflectionOpacity() {
  const val = opacitySlider.value;
  document.querySelectorAll(".image-wrapper").forEach((wrapper) => {
    const img = wrapper.querySelector("img");
    if (reflectionToggle.checked) {
      wrapper.style.boxShadow = `0 10px 15px rgba(0,0,0,${val})`;
    } else {
      wrapper.style.boxShadow = "none";
    }
  });
}

function updateLightDirection() {
  lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;
  // Here you could update shadow direction or any lighting effect if you want to extend later
}

function updateBackground() {
  if (bgToggle.value === "transparent") {
    previewArea.style.background = "transparent";
  } else if (bgToggle.value === "white") {
    previewArea.style.background = "white";
  }
}

function updateGuideLinesToggle() {
  if (showGuidesCheckbox.checked) {
    // Do nothing; guides show on drag automatically
  } else {
    clearGuides();
  }
}

function clearImages() {
  previewArea.innerHTML = "";
  clearGuides();
}

function exportLayout() {
  const wrappers = Array.from(document.querySelectorAll(".image-wrapper"));
  if (!wrappers.length) {
    alert("Ingen billeder at gemme!");
    return;
  }

  let width, height;

  if (canvasSizeSelect.value === "auto") {
    // Calculate bounding box of all images
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    wrappers.forEach((w) => {
      const left = parseFloat(w.style.left);
      const top = parseFloat(w.style.top);
      const wW = w.offsetWidth;
      const wH = w.offsetHeight;
      if (left < minX) minX = left;
      if (top < minY) minY = top;
      if (left + wW > maxX) maxX = left + wW;
      if (top + wH > maxY) maxY = top + wH;
    });
    width = maxX - minX;
    height = maxY - minY;
  } else {
    const [w, h] = canvasSizeSelect.value.split("x").map(Number);
    width = w;
    height = h;
  }

  canvasElement.width = width;
  canvasElement.height = height;

  const ctx = canvasElement.getContext("2d");
  // Clear background
  if (bgToggle.value === "transparent") {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = bgToggle.value;
    ctx.fillRect(0, 0, width, height);
  }

  // Calculate offset if auto mode
  let offsetX = 0,
    offsetY = 0;
  if (canvasSizeSelect.value === "auto") {
    let minX = Infinity,
      minY = Infinity;
    wrappers.forEach((w) => {
      const left = parseFloat(w.style.left);
      const top = parseFloat(w.style.top);
      if (left < minX) minX = left;
      if (top < minY) minY = top;
    });
    offsetX = -minX;
    offsetY = -minY;
  }

  // Draw each image on canvas
  wrappers.forEach((wrapper) => {
    const img = wrapper.querySelector("img");
    const left = parseFloat(wrapper.style.left) + offsetX;
    const top = parseFloat(wrapper.style.top) + offsetY;
    const w = wrapper.offsetWidth;
    const h = wrapper.offsetHeight;

    ctx.save();

    // Draw reflection if toggled
    if (reflectionToggle.checked) {
      ctx.globalAlpha = parseFloat(opacitySlider.value);
      ctx.translate(left + w / 2, top + h * 2);
      ctx.scale(1, -1);
      ctx.drawImage(img, -w / 2, 0, w, h);
      ctx.globalAlpha = 1.0;
    }

    ctx.drawImage(img, left, top, w, h);

    ctx.restore();
  });

  const mimeType = fileFormatSelect.value === "png" ? "image/png" : "image/webp";
  canvasElement.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `layout.${fileFormatSelect.value}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      alert("Fejl ved generering af billede.");
    }
  }, mimeType);
}
