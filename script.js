// --- Element references ---
const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvasElement = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const bgColorPicker = document.getElementById("bgColorPicker");
const toggleGridCheckbox = document.getElementById("toggleGrid");
const toggleReflectionCheckbox = document.getElementById("toggleReflection");
const toggleCenterLinesButton = document.getElementById("toggleCenterLines");

// --- State variables ---
let dragData = {
  draggingEl: null,
  offsetX: 0,
  offsetY: 0,
};

let lightAngleRad = (lightAngleSlider.value * Math.PI) / 180;

// --- Upload handler ---
uploadInput.addEventListener("change", handleUpload);

function handleUpload(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  previewArea.innerHTML = ""; // Clear old images

  const columns = 4; 
  const spacingX = 230;
  const spacingY = 320;

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target.result;

      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.style.position = "absolute";
      wrapper.style.left = `${20 + (index % columns) * spacingX}px`;
      wrapper.style.top = `${20 + Math.floor(index / columns) * spacingY}px`;
      wrapper.style.cursor = "grab";

      // Create img element
      const img = document.createElement("img");
      img.src = url;
      img.draggable = false; // Disable default drag

      // Resize image to fit max width/height, preserving aspect ratio
      img.onload = () => {
        const maxWidth = 200;
        const maxHeight = 280;
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        // Calculate scale preserving aspect ratio
        let scale = Math.min(maxWidth / width, maxHeight / height, 1);
        width *= scale;
        height *= scale;

        img.style.width = `${width}px`;
        img.style.height = `${height}px`;

        wrapper.style.width = `${width}px`;
        wrapper.style.height = `${height}px`;

        updateReflection(wrapper, img);
      };

      wrapper.appendChild(img);
      previewArea.appendChild(wrapper);

      makeDraggable(wrapper);
      makeResizable(wrapper, img);
    };
    reader.readAsDataURL(file);
  });
}

// --- Make elements draggable with left mouse down ---
function makeDraggable(el) {
  el.addEventListener("mousedown", e => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();

    dragData.draggingEl = el;
    dragData.offsetX = e.clientX - el.getBoundingClientRect().left;
    dragData.offsetY = e.clientY - el.getBoundingClientRect().top;

    el.style.cursor = "grabbing";
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

  // Clamp inside container
  x = Math.max(0, Math.min(x, containerRect.width - elRect.width));
  y = Math.max(0, Math.min(y, containerRect.height - elRect.height));

  el.style.left = x + "px";
  el.style.top = y + "px";

  // Snap to grid or other images
  snapToGuides(el);

  // Update reflection position
  updateReflection(el, el.querySelector("img"));
});

window.addEventListener("mouseup", e => {
  if (dragData.draggingEl) {
    dragData.draggingEl.style.cursor = "grab";
    dragData.draggingEl.style.zIndex = 1;
  }
  dragData.draggingEl = null;
});

// --- Resizable functionality ---
function makeResizable(wrapper, img) {
  const resizer = document.createElement("div");
  resizer.className = "resizer";
  wrapper.appendChild(resizer);

  resizer.addEventListener("mousedown", e => {
    e.preventDefault();
    e.stopPropagation();
    dragData.resizingEl = wrapper;
    dragData.startX = e.clientX;
    dragData.startY = e.clientY;
    dragData.startWidth = wrapper.offsetWidth;
    dragData.startHeight = wrapper.offsetHeight;
    dragData.img = img;
    window.addEventListener("mousemove", resizeMove);
    window.addEventListener("mouseup", resizeStop);
  });

  function resizeMove(e) {
    if (!dragData.resizingEl) return;
    let dx = e.clientX - dragData.startX;
    let dy = e.clientY - dragData.startY;

    // Maintain aspect ratio
    const aspectRatio = dragData.img.naturalWidth / dragData.img.naturalHeight;
    let newWidth = dragData.startWidth + dx;
    let newHeight = newWidth / aspectRatio;

    if (newHeight < 50) {
      newHeight = 50;
      newWidth = newHeight * aspectRatio;
    }

    dragData.resizingEl.style.width = newWidth + "px";
    dragData.resizingEl.style.height = newHeight + "px";

    dragData.img.style.width = newWidth + "px";
    dragData.img.style.height = newHeight + "px";

    updateReflection(dragData.resizingEl, dragData.img);
  }

  function resizeStop(e) {
    window.removeEventListener("mousemove", resizeMove);
    window.removeEventListener("mouseup", resizeStop);
    dragData.resizingEl = null;
  }
}

// --- Snap to guides implementation ---
function snapToGuides(el) {
  const snapThreshold = 10;
  const wrappers = [...document.querySelectorAll(".image-wrapper")].filter(w => w !== el);
  const elRect = el.getBoundingClientRect();
  const previewRect = previewArea.getBoundingClientRect();

  // Remove old snap lines
  removeSnapLines();

  // Snap positions
  let snappedX = null;
  let snappedY = null;

  // Snap to preview center lines
  const centerX = previewRect.width / 2;
  const centerY = previewRect.height / 2;

  if (Math.abs(elRect.left - previewRect.left - centerX + elRect.width/2) < snapThreshold) {
    snappedX = centerX - elRect.width / 2;
    drawSnapLine(centerX, 0, centerX, previewRect.height);
  }
  if (Math.abs(elRect.top - previewRect.top - centerY + elRect.height/2) < snapThreshold) {
    snappedY = centerY - elRect.height / 2;
    drawSnapLine(0, centerY, previewRect.width, centerY);
  }

  // Snap to other images top/left/bottom/center Y/X for alignment
  wrappers.forEach(other => {
    const otherRect = other.getBoundingClientRect();

    // Horizontal snaps (left, center, right)
    [[otherRect.left], [otherRect.left + otherRect.width / 2], [otherRect.left + otherRect.width]].forEach(otherX => {
      [[elRect.left], [elRect.left + elRect.width / 2], [elRect.left + elRect.width]].forEach((posX, i) => {
        if (Math.abs(posX - otherX) < snapThreshold) {
          // Snap horizontal
          snappedX = snappedX ?? el.offsetLeft + (otherX - posX);
          drawSnapLine(otherX - previewRect.left, 0, otherX - previewRect.left, previewRect.height);
        }
      });
    });

    // Vertical snaps (top, center, bottom)
    [[otherRect.top], [otherRect.top + otherRect.height / 2], [otherRect.top + otherRect.height]].forEach(otherY => {
      [[elRect.top], [elRect.top + elRect.height / 2], [elRect.top + elRect.height]].forEach((posY, i) => {
        if (Math.abs(posY - otherY) < snapThreshold) {
          // Snap vertical
          snappedY = snappedY ?? el.offsetTop + (otherY - posY);
          drawSnapLine(0, otherY - previewRect.top, previewRect.width, otherY - previewRect.top);
        }
      });
    });
  });

  // Apply snapped positions if any
  if (snappedX !== null) el.style.left = snappedX + "px";
  if (snappedY !== null) el.style.top = snappedY + "px";
}

function drawSnapLine(x1, y1, x2, y2) {
  let line = document.createElement("div");
  line.className = "snap-line";
  line.style.position = "absolute";
  line.style.background = "red";
  line.style.opacity = "0.6";
  line.style.zIndex = 2000;

  if (x1 === x2) {
    // Vertical line
    line.style.left = x1 + "px";
    line.style.top = y1 + "px";
    line.style.width = "1px";
    line.style.height = y2 - y1 + "px";
  } else if (y1 === y2) {
    // Horizontal line
    line.style.left = x1 + "px";
    line.style.top = y1 + "px";
    line.style.width = x2 - x1 + "px";
    line.style.height = "1px";
  }
  previewArea.appendChild(line);
}

function removeSnapLines() {
  document.querySelectorAll(".snap-line").forEach(line =>
