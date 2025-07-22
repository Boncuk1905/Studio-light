const imageUpload = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const downloadBtn = document.getElementById("downloadBtn");
const opacitySlider = document.getElementById("opacitySlider");
const reflectionToggle = document.getElementById("reflectionToggle");
const bgSelect = document.getElementById("bgSelect");
const toggleSnapLinesBtn = document.getElementById("toggleSnapLinesBtn");
const canvas = document.getElementById("exportCanvas");

let dragData = {
  draggedElem: null,
  offsetX: 0,
  offsetY: 0,
};

let selectedWrapper = null;
let showCenterLines = false;

imageUpload.addEventListener("change", (e) => {
  const files = e.target.files;
  for (let file of files) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      createImageWrapper(ev.target.result);
    };
    reader.readAsDataURL(file);
  }
  imageUpload.value = null; // reset for at kunne uploade samme filer igen
});

function createImageWrapper(src) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("image-wrapper");
  wrapper.style.left = "10px";
  wrapper.style.top = "10px";
  wrapper.style.width = "150px";

  const img = document.createElement("img");
  img.src = src;
  img.draggable = false;

  wrapper.appendChild(img);
  previewArea.appendChild(wrapper);

  enableDragResizeRotate(wrapper);

  wrapper.addEventListener("click", (e) => {
    e.stopPropagation();
    selectWrapper(wrapper);
  });
}

// Vælg wrapper (marker med border)
function selectWrapper(wrapper) {
  if (selectedWrapper) selectedWrapper.classList.remove("selected");
  selectedWrapper = wrapper;
  wrapper.classList.add("selected");
}

// Deselect hvis klik udenfor billeder
previewArea.addEventListener("click", () => {
  if (selectedWrapper) {
    selectedWrapper.classList.remove("selected");
    selectedWrapper = null;
  }
});

// Drag, resize og rotation
function enableDragResizeRotate(wrapper) {
  let mode = null; // 'drag', 'resize', 'rotate'
  let startX, startY;
  let startLeft, startTop, startWidth, startHeight;
  let startAngle = 0;

  // Create rotate handle
  const rotateHandle = document.createElement("div");
  rotateHandle.style.position = "absolute";
  rotateHandle.style.width = "15px";
  rotateHandle.style.height = "15px";
  rotateHandle.style.background = "#3498db";
  rotateHandle.style.borderRadius = "50%";
  rotateHandle.style.right = "-20px";
  rotateHandle.style.top = "50%";
  rotateHandle.style.transform = "translateY(-50%)";
  rotateHandle.style.cursor = "grab";
  wrapper.appendChild(rotateHandle);

  rotateHandle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    mode = "rotate";
    startX = e.clientX;
    startY = e.clientY;
    startAngle = getRotation(wrapper) || 0;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  // Drag on wrapper mousedown (undtagen på rotateHandle)
  wrapper.addEventListener("mousedown", (e) => {
    if (e.target === rotateHandle) return;
    e.preventDefault();
    mode = "drag";
    startX = e.clientX;
    startY = e.clientY;
    const rect = wrapper.getBoundingClientRect();
    const parentRect = previewArea.getBoundingClientRect();
    startLeft = rect.left - parentRect.left;
    startTop = rect.top - parentRect.top;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    wrapper.classList.add("dragging");
  });

  // Resize med scroll wheel på wrapper (Ctrl+Scroll for resize)
  wrapper.addEventListener("wheel", (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    let width = wrapper.clientWidth;
    let height = wrapper.clientHeight;
    const delta = e.deltaY < 0 ? 10 : -10;
    width = Math.max(30, width + delta);
    height = Math.max(30, height + delta * (height / width));
    wrapper.style.width = width + "px";
    wrapper.style.height = height + "px";
    updateSnapLines(wrapper);
  });

  function onMouseMove(e) {
    if (!mode) return;
    if (mode === "drag") {
      let newLeft = startLeft + e.clientX - startX;
      let newTop = startTop + e.clientY - startY;

      // Begræns indenfor preview area
      newLeft = Math.max(0, Math.min(newLeft, previewArea.clientWidth - wrapper.clientWidth));
      newTop = Math.max(0, Math.min(newTop, previewArea.clientHeight - wrapper.clientHeight));

      // Snap til andre billeder (snap når nær nok)
      const snapped = snapPosition(wrapper, newLeft, newTop);
      wrapper.style.left = snapped.x + "px";
      wrapper.style.top = snapped.y + "px";
      updateSnapLines(wrapper, snapped);

    } else if (mode === "rotate") {
      const rect = wrapper.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      let angleDeg = angleRad * (180 / Math.PI);
      angleDeg = angleDeg < 0 ? angleDeg + 360 : angleDeg;
      const rotateDeg = angleDeg;
      wrapper.style.transform = `rotate(${rotateDeg}deg)`;
    }
  }

  function onMouseUp() {
    mode = null;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    wrapper.classList.remove("dragging");
    clearSnapLines();
  }
}

function getRotation(el) {
  const st = window.getComputedStyle(el, null);
  const tr = st.getPropertyValue("transform");
  if (tr === "none") return 0;
  const values = tr.split("(")[1].split(")")[0].split(",");
  const a = values[0];
  const b = values[1];
  let angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
  if (angle < 0) angle += 360;
  return angle;
}

function snapPosition(wrapper, x, y) {
  const threshold = 10;
  let snappedX = x;
  let snappedY = y;

  const wrappers = [...previewArea.querySelectorAll(".image-wrapper")].filter(w => w !== wrapper);

  for (let other of wrappers) {
    const ox = parseFloat(other.style.left);
    const oy = parseFloat(other.style.top);
    const ow = other.clientWidth;
    const oh = other.clientHeight;
    const ww = wrapper.clientWidth;
    const wh = wrapper.clientHeight;

    // Snap venstre til venstre
    if (Math.abs(x - ox) < threshold) {
      snappedX = ox;
      drawVerticalSnapLine(ox);
    }
    // Snap højre til højre
    if (Math.abs(x + ww - (ox + ow)) < threshold) {
      snappedX = ox + ow - ww;
      drawVerticalSnapLine(ox + ow);
    }
    // Snap top til top
    if (Math.abs(y - oy) < threshold) {
      snappedY = oy;
      drawHorizontalSnapLine(oy);
    }
    // Snap bund til bund
    if (Math.abs(y + wh - (oy + oh)) < threshold) {
      snappedY = oy + oh - wh;
      drawHorizontalSnapLine(oy + oh);
    }
  }

  // Snap til midten preview area
  const centerX = previewArea.clientWidth / 2 - wrapper.clientWidth / 2;
  const centerY = previewArea.clientHeight / 2 - wrapper.clientHeight / 2;
  if (Math.abs(x - centerX) < threshold) {
    snappedX = centerX;
    drawVerticalSnapLine(centerX + wrapper.clientWidth / 2);
  }
  if (Math.abs(y - centerY) < threshold) {
    snappedY = centerY;
    drawHorizontalSnapLine(centerY + wrapper.clientHeight / 2);
  }

  return { x: snappedX, y: snappedY };
}

let snapLines = [];

function drawVerticalSnapLine(x) {
  clearSnapLines();
  const line = document.createElement("div");
  line.classList.add("snap-line", "vertical");
  line.style.left = x + "px";
  previewArea.appendChild(line);
  snapLines.push(line);
}

function drawHorizontalSnapLine(y) {
  clearSnapLines();
  const line = document.createElement("div");
  line.classList.add("snap-line", "horizontal");
  line.style.top = y + "px";
  previewArea.appendChild(line);
  snapLines.push(line);
}

function clearSnapLines() {
  snapLines.forEach(line => line.remove());
  snapLines = [];
}

function updateSnapLines(wrapper, snappedPos) {
  clearSnapLines();
  if (!showCenterLines) return;
  if (!wrapper) return;

  const x = snappedPos ? snappedPos.x : parseFloat(wrapper.style.left);
  const y = snappedPos ? snappedPos.y : parseFloat(wrapper.style.top);

  // Midterlinjer vises via CSS på previewArea, så ikke noget ekstra her for nu.
}

toggleSnapLinesBtn.addEventListener("click", () => {
  showCenterLines = !showCenterLines;
  if (showCenterLines) {
    previewArea.classList.add("show-center-lines");
    toggleSnapLinesBtn.textContent = "Skjul Midterlinjer";
  } else {
    previewArea.classList.remove("show-center-lines");
    toggleSnapLinesBtn.textContent = "Vis Midterlinjer";
    clearSnapLines();
  }
});

// Baggrundsskift
bgSelect.addEventListener("change", () => {
  previewArea.style.background = bgSelect.value === "transparent" ? "transparent" : bgSelect.value;
});

// Download layout funktion
downloadBtn.addEventListener("click", () => {
  const ctx = canvas.getContext("2d");
  const w = previewArea.clientWidth;
  const h = previewArea.clientHeight;
  canvas.width = w;
  canvas.height = h;

  // Baggrund
  const bgVal = bgSelect.value;
  if (bgVal === "transparent") {
    ctx.clearRect(0, 0, w, h);
  } else {
    ctx.fillStyle = bgVal;
    ctx.fillRect(0, 0, w, h);
  }

  // Tegn billeder med rotation og refleksion
  const wrappers = previewArea.querySelectorAll(".image-wrapper");
  wrappers.forEach((wrapper) => {
    const img = wrapper.querySelector("img");
    const x = parseFloat(wrapper.style.left);
    const y = parseFloat(wrapper.style.top);
    const iw = wrapper.clientWidth;
    const ih = wrapper.clientHeight;
    const angle = getRotation(wrapper);

    ctx.save();
    // Flyt til billedets centrum for rotation
    ctx.translate(x + iw / 2, y + ih / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);

    // Reflektion
    if (reflectionToggle.checked) {
      ctx.globalAlpha = parseFloat(opacitySlider.value);
      ctx.scale(1, -1);
      ctx.drawImage(img, -iw / 2, ih / 2, iw, ih);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  });

  canvas.toBlob((blob) => {
    if (!blob) {
      alert("Fejl ved oprettelse af billede.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "layout.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
});
