const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvas = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const bgToggle = document.getElementById("bgToggle");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");
const toggleReflectionCheckbox = document.getElementById("toggleReflection");
const toggleGridCheckbox = document.getElementById("toggleGrid");
const toggleCenterLinesBtn = document.getElementById("toggleCenterLinesBtn");

let dragging = null;
let offset = { x: 0, y: 0 };
let resizing = null;
let resizeStart = null;
let images = [];
let showSnapLines = true;
let showReflection = true;
let showCenterLines = false;

// Upload billeder
uploadInput.addEventListener("change", e => {
  const files = [...e.target.files];
  files.forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = event => {
      addImage(event.target.result);
    };
    reader.readAsDataURL(file);
  });
  e.target.value = ""; // reset input
});

// Tilføj billede til preview
function addImage(src) {
  const wrapper = document.createElement("div");
  wrapper.className = "image-wrapper";
  wrapper.style.left = "10px";
  wrapper.style.top = "10px";

  const img = document.createElement("img");
  img.src = src;
  img.style.width = "200px";
  img.style.height = "auto";
  img.draggable = false;

  const reflection = document.createElement("img");
  reflection.src = src;
  reflection.className = "reflection";
  reflection.style.opacity = opacitySlider.value;

  wrapper.appendChild(img);
  wrapper.appendChild(reflection);

  previewArea.appendChild(wrapper);
  images.push({wrapper, img, reflection});

  makeDraggable(wrapper);
  makeResizable(wrapper, img);

  updateReflection(wrapper, img, reflection);
}

// Flyt billeder
function makeDraggable(el) {
  el.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    dragging = el;
    offset.x = e.clientX - el.getBoundingClientRect().left;
    offset.y = e.clientY - el.getBoundingClientRect().top;
    el.classList.add("grabbing");
  });
}

window.addEventListener("mousemove", e => {
  if (dragging) {
    e.preventDefault();

    let x = e.clientX - previewArea.getBoundingClientRect().left - offset.x;
    let y = e.clientY - previewArea.getBoundingClientRect().top - offset.y;

    // Clamp til preview area
    x = Math.max(0, Math.min(x, previewArea.clientWidth - dragging.offsetWidth));
    y = Math.max(0, Math.min(y, previewArea.clientHeight - dragging.offsetHeight));

    dragging.style.left = x + "px";
    dragging.style.top = y + "px";

    if (showSnapLines) snapToOtherImages(dragging);
    updateReflectionPosition(dragging);

  }
});

window.addEventListener("mouseup", e => {
  if (dragging) {
    dragging.classList.remove("grabbing");
  }
  dragging = null;
  removeSnapLines();
});

// Resize billeder
function makeResizable(wrapper, img) {
  const resizer = document.createElement("div");
  resizer.className = "resizer";
  wrapper.appendChild(resizer);

  resizer.addEventListener("mousedown", e => {
    e.stopPropagation();
    resizing = { wrapper, img };
    resizeStart = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: wrapper.offsetWidth,
      height: wrapper.offsetHeight,
      aspectRatio: img.naturalWidth / img.naturalHeight
    };
    window.addEventListener("mousemove", resizeMove);
    window.addEventListener("mouseup", resizeStop);
  });
}

function resizeMove(e) {
  if (!resizing) return;

  let dx = e.clientX - resizeStart.mouseX;
  let newWidth = resizeStart.width + dx;
  if (newWidth < 50) newWidth = 50;
  let newHeight = newWidth / resizeStart.aspectRatio;

  resizing.wrapper.style.width = newWidth + "px";
  resizing.wrapper.style.height = newHeight + "px";
  resizing.img.style.width = newWidth + "px";
  resizing.img.style.height = newHeight + "px";

  updateReflection(resizing.wrapper, resizing.img);
}

function resizeStop(e) {
  window.removeEventListener("mousemove", resizeMove);
  window.removeEventListener("mouseup", resizeStop);
  resizing = null;
}

// Reflektion funktion
opacitySlider.addEventListener("input", () => {
  images.forEach(({reflection}) => {
    reflection.style.opacity = opacitySlider.value;
  });
});

toggleReflectionCheckbox.addEventListener("change", () => {
  showReflection = toggleReflectionCheckbox.checked;
  images.forEach(({reflection}) => {
    reflection.style.display = showReflection ? "block" : "none";
  });
});

lightAngleSlider.addEventListener("input", () => {
  // Kan udvides til lysvinkel effekt på reflektion
  // Men vi holder simple for nu
});

// Baggrunds toggle
bgToggle.addEventListener("change", () => {
  previewArea.style.background = bgToggle.value === "white" ? "#fff" : "transparent";
});

// Clear
clearBtn.addEventListener("click", () => {
  images = [];
  previewArea.innerHTML = "";
});

// Vis midterlinjer
toggleCenterLinesBtn.addEventListener("click", () => {
  showCenterLines = !showCenterLines;
  if (showCenterLines) {
    drawCenterLines();
    toggleCenterLinesBtn.textContent = "Skjul midterlinjer";
  } else {
    removeCenterLines();
    toggleCenterLinesBtn.textContent = "Vis midterlinjer";
  }
});

// Snap linjer toggle
toggleGridCheckbox.addEventListener("change", () => {
  showSnapLines = toggleGridCheckbox.checked;
  if (!showSnapLines) removeSnapLines();
});

// Download
downloadBtn.addEventListener("click", () => {
  exportCanvas();
});

// Opdater reflektion
function updateReflection(wrapper, img, reflection=null) {
  if (!reflection) {
    reflection = wrapper.querySelector(".reflection");
  }
  reflection.src = img.src;
  reflection.style.width = img.style.width;
  reflection.style.height = img.style.height;
  reflection.style.opacity = opacitySlider.value;
  reflection.style.display = showReflection ? "block" : "none";
  updateReflectionPosition(wrapper);
}

function updateReflectionPosition(wrapper) {
  const reflection = wrapper.querySelector(".reflection");
  if (!reflection) return;
  reflection.style.top = wrapper.offsetHeight + "px";
  reflection.style.left = "0px";
}

// Snap linjer
function snapToOtherImages(el) {
  removeSnapLines();

  const snapDistance = 10;
  const rect = el.getBoundingClientRect();
  const containerRect = previewArea.getBoundingClientRect();

  // Vi snapper til andre wrappers' kanter og midterlinjer
  images.forEach(({wrapper}) => {
    if (wrapper === el) return;

    const otherRect = wrapper.getBoundingClientRect();

    // Snap X (venstre, midt, højre)
    const candidatesX = [
      otherRect.left,
      otherRect.left + otherRect.width / 2,
      otherRect.left + otherRect.width
    ];
    const elX = [rect.left, rect.left + rect.width / 2, rect.left + rect.width];

    candidatesX.forEach(ox => {
      elX.forEach((ex, idx) => {
        if (Math.abs(ex - ox) < snapDistance) {
          let newLeft = ox - (idx === 0 ? 0 : idx === 1 ? rect.width / 2 : rect.width);
          newLeft -= containerRect.left;
          el.style.left = newLeft + "px";

          drawSnapLine(newLeft + containerRect.left, containerRect.top, newLeft + containerRect.left, containerRect.top + containerRect.height);
        }
      });
    });

    // Snap Y (top, midt, bund)
    const candidatesY = [
      otherRect.top,
      otherRect.top + otherRect.height / 2,
      otherRect.top + otherRect.height
    ];
    const elY = [rect.top, rect.top + rect.height / 2, rect.top + rect.height];

    candidatesY.forEach(oy => {
      elY.forEach((ey, idx) => {
        if (Math.abs(ey - oy) < snapDistance) {
          let newTop = oy - (idx === 0 ? 0 : idx === 1 ? rect.height / 2 : rect.height);
          newTop -= containerRect.top;
          el.style.top = newTop + "px";

          drawSnapLine(containerRect.left, newTop + containerRect.top, containerRect.left + containerRect.width, newTop + containerRect.top);
        }
      });
    });
  });
}

function drawSnapLine(x1, y1, x2, y2) {
  const line = document.createElement("div");
  line.className = "snap-line";
  line.style.left = x1 + "px";
  line.style.top = y1 + "px";
  if (x1 === x2) {
    // lodret
    line.style.width = "1px";
    line.style.height = (y2 - y1) + "px";
  } else {
    // vandret
    line.style.width = (x2 - x1) + "px";
    line.style.height = "1px";
  }
  previewArea.appendChild(line);
}

function removeSnapLines() {
  document.querySelectorAll(".snap-line").forEach(el => el.remove());
}

function drawCenterLines() {
  removeCenterLines();
  const w = previewArea.clientWidth;
  const h = previewArea.clientHeight;

  // Lodret midterlinje
  const vertLine = document.createElement("div");
  vertLine.className = "center-line";
  vertLine.style.left = w/2 + "px";
  vertLine.style.top = "0px";
  vertLine.style.width = "1px";
  vertLine.style.height = h + "px";
  previewArea.appendChild(vertLine);

  // Vandret midterlinje
  const horLine = document.createElement("div");
  horLine.className = "center-line";
  horLine.style.top = h/2 + "px";
  horLine.style.left = "0px";
  horLine.style.width = w + "px";
  horLine.style.height = "1px";
  previewArea.appendChild(horLine);
}

function removeCenterLines() {
  document.querySelectorAll(".center-line").forEach(el => el.remove());
}

// Export canvas
function exportCanvas() {
  let cw, ch;
  const sizeVal = canvasSizeSelect.value;
  if (sizeVal === "auto") {
    // Fit canvas to previewArea size
    cw = previewArea.clientWidth;
    ch = previewArea.clientHeight;
  } else {
    const parts = sizeVal.split("x");
    cw = parseInt(parts[0]);
    ch = parseInt(parts[1]);
  }

  canvas.width = cw;
  canvas.height = ch;

  const ctx = canvas.getContext("2d");

  // Clear canvas
  ctx.clearRect(0, 0, cw, ch);

  // Baggrund
  if (bgToggle.value === "white") {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, cw, ch);
  } else {
    ctx.clearRect(0, 0, cw, ch);
  }

  // Tegn billeder i deres positioner
  images.forEach(({wrapper, img, reflection}) => {
    const style = getComputedStyle(wrapper);
    const left = parseFloat(style.left);
    const top = parseFloat(style.top);
    const width = wrapper.offsetWidth;
    const height = wrapper.offsetHeight;

    // Tegn selve billedet
    ctx.drawImage(img, left, top, width, height);

    if (showReflection) {
      // Tegn reflektion med opacity og flip
      ctx.save();
      ctx.globalAlpha = parseFloat(opacitySlider.value);
      ctx.translate(left, top + height * 2);
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();
    }
  });

  // Download
  const mimeType = fileFormatSelect.value === "png" ? "image/png" : "image/webp";
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export.${fileFormatSelect.value}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, mimeType);
}
