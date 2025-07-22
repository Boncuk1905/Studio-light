const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const opacitySlider = document.getElementById("opacitySlider");
const lightAngleSlider = document.getElementById("lightAngleSlider");
const bgColorPicker = document.getElementById("bgColorPicker");
const canvasSizeSelect = document.getElementById("canvasSize");
const fileFormatSelect = document.getElementById("fileFormat");
const toggleGrid = document.getElementById("toggleGrid");
const toggleReflection = document.getElementById("toggleReflection");
const toggleCenterLinesBtn = document.getElementById("toggleCenterLines");
const canvasElement = document.getElementById("exportCanvas");

let draggingEl = null;
let offsetX = 0;
let offsetY = 0;

let guideLines = [];

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflectionOpacity);
lightAngleSlider.addEventListener("input", updateLightDirection);
bgColorPicker.addEventListener("input", () => {
  previewArea.style.background = bgColorPicker.value;
});
toggleGrid.addEventListener("change", () => {
  clearGuideLines();
});
toggleReflection.addEventListener("change", () => {
  updateReflectionOpacity();
});
toggleCenterLinesBtn.addEventListener("click", toggleCenterGuides);

function handleUpload() {
  const files = Array.from(uploadInput.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("image-wrapper");
      wrapper.style.position = "absolute";
      wrapper.style.left = "10px";
      wrapper.style.top = "10px";
      wrapper.style.cursor = "grab";

      const img = document.createElement("img");
      img.src = e.target.result;
      img.style.maxWidth = "200px";
      img.style.maxHeight = "200px";
      img.style.userSelect = "none";
      img.draggable = false;

      wrapper.appendChild(img);
      previewArea.appendChild(wrapper);
      makeDraggable(wrapper);
      updateReflectionOpacity();
      updateLightDirection();
    };
    reader.readAsDataURL(file);
  });
  uploadInput.value = "";
}

function makeDraggable(el) {
  el.addEventListener("mousedown", e => {
    if (e.button !== 0) return; // Kun venstreklik
    e.preventDefault();
    draggingEl = el;
    offsetX = e.clientX - el.getBoundingClientRect().left;
    offsetY = e.clientY - el.getBoundingClientRect().top;
    el.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", e => {
    if (!draggingEl) return;

    let x = e.clientX - previewArea.getBoundingClientRect().left - offsetX;
    let y = e.clientY - previewArea.getBoundingClientRect().top - offsetY;

    // Begræns til previewArea
    x = Math.max(0, Math.min(x, previewArea.clientWidth - draggingEl.clientWidth));
    y = Math.max(0, Math.min(y, previewArea.clientHeight - draggingEl.clientHeight));

    // Snap funktion med visuelle linjer
    if (toggleGrid.checked) {
      const threshold = 8;
      const others = Array.from(document.querySelectorAll(".image-wrapper")).filter(w => w !== draggingEl);
      clearGuideLines();

      others.forEach(other => {
        // Snap lodret (left)
        if (Math.abs(other.offsetLeft - x) < threshold) {
          x = other.offsetLeft;
          addGuideLine("vertical", x);
        }
        // Snap vandret (top)
        if (Math.abs(other.offsetTop - y) < threshold) {
          y = other.offsetTop;
          addGuideLine("horizontal", y);
        }
        // Snap midt på X
        const otherMidX = other.offsetLeft + other.clientWidth / 2;
        const dragMidX = x + draggingEl.clientWidth / 2;
        if (Math.abs(otherMidX - dragMidX) < threshold) {
          x = otherMidX - draggingEl.clientWidth / 2;
          addGuideLine("vertical", otherMidX);
        }
        // Snap midt på Y
        const otherMidY = other.offsetTop + other.clientHeight / 2;
        const dragMidY = y + draggingEl.clientHeight / 2;
        if (Math.abs(otherMidY - dragMidY) < threshold) {
          y = otherMidY - draggingEl.clientHeight / 2;
          addGuideLine("horizontal", otherMidY);
        }
      });

      // Snap til kanvas midte
      const centerX = previewArea.clientWidth / 2;
      const centerY = previewArea.clientHeight / 2;

      // Lodret center snap
      const dragMidX = x + draggingEl.clientWidth / 2;
      if (Math.abs(centerX - dragMidX) < threshold) {
        x = centerX - draggingEl.clientWidth / 2;
        addGuideLine("vertical", centerX, "red");
      }
      // Vandret center snap
      const dragMidY = y + draggingEl.clientHeight / 2;
      if (Math.abs(centerY - dragMidY) < threshold) {
        y = centerY - draggingEl.clientHeight / 2;
        addGuideLine("horizontal", centerY, "red");
      }
    } else {
      clearGuideLines();
    }

    draggingEl.style.left = x + "px";
    draggingEl.style.top = y + "px";
  });

  window.addEventListener("mouseup", () => {
    if (draggingEl) {
      draggingEl.style.cursor = "grab";
      draggingEl = null;
      clearGuideLines();
    }
 
