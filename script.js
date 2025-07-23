// ---------- Del 1: Grundstruktur, upload, drag, snap ----------

// --- Variabler og initialisering ---
let images = [];  // array af billeder med data { img, x, y, width, height, rotation, showReflection }
let currentDrag = null;  // reference til det billede, der trækkes
let offsetX = 0, offsetY = 0; // museoffset for træk

const canvas = document.getElementById('exportCanvas');
const ctx = canvas.getContext('2d');

const previewArea = document.getElementById('previewArea');

let transparentBackground = true;
let backgroundColor = '#ffffff';
let reflectionOpacity = 0.25;

function addImage(img) {
  const previewArea = document.getElementById("previewArea");

  const wrapper = document.createElement("div");
  wrapper.className = "image-wrapper";
  wrapper.style.left = "100px";
  wrapper.style.top = "100px";
  wrapper.style.width = img.width + "px";
  wrapper.style.height = img.height + "px";
  wrapper.dataset.rotation = "0";

  const mainImg = img.cloneNode();
  mainImg.className = "main-image";
  wrapper.appendChild(mainImg);

  const reflection = img.cloneNode();
  reflection.className = "reflection";
  reflection.style.opacity = 0.25; // juster evt. reflektionens opacitet her
  wrapper.appendChild(reflection);

  previewArea.appendChild(wrapper);

  images.push({
    img: mainImg,
    x: 100,
    y: 100,
    width: img.width,
    height: img.height,
    rotation: 0,
    showReflection: true
  });

  render();
}
// Det primære billede
const imgEl = img.cloneNode();
imgEl.className = "main-image";
wrapper.appendChild(imgEl);

// Refleksion
const reflection = img.cloneNode();
reflection.className = "reflection";
wrapper.appendChild(reflection);

// Mulighed for resize og rotation her (kan udvides med handles)
makeDraggable(wrapper);

previewArea.appendChild(wrapper);

// Også gem i images[] for eksport via canvas
const rect = wrapper.getBoundingClientRect();
const parentRect = previewArea.getBoundingClientRect();

const imgObj = {
  img,
  x: rect.left - parentRect.left,
  y: rect.top - parentRect.top,
  width: img.width,
  height: img.height,
  rotation: 0,
  showReflection: true,
};
images.push(imgObj);

render();
// --- Mouse events til drag & drop ---
previewArea.addEventListener('mousedown', e => {
  const rect = previewArea.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Find øverste billede under musen (øverste i array = øverste i z-index)
  for(let i = images.length - 1; i >= 0; i--) {
    const img = images[i];
    if (isPointInImage(mouseX, mouseY, img)) {
      currentDrag = img;
      offsetX = mouseX - img.x;
      offsetY = mouseY - img.y;

      // bring billedet til front
      images.splice(i, 1);
      images.push(currentDrag);

      break;
    }
  }
});

previewArea.addEventListener("mousedown", e => {
  if (e.target.tagName === "IMG") {
    const wrapper = e.target.parentElement;
    const index = Array.from(previewArea.children).indexOf(wrapper);
    currentDrag = images[index];

    const rect = previewArea.getBoundingClientRect();
    offsetX = e.clientX - rect.left - currentDrag.x;
    offsetY = e.clientY - rect.top - currentDrag.y;

    previewArea.addEventListener("mousemove", onMouseMove);
    previewArea.addEventListener("mouseup", onMouseUp);
  }
});

function onMouseMove(e) {
  const rect = previewArea.getBoundingClientRect();
  let x = e.clientX - rect.left - offsetX;
  let y = e.clientY - rect.top - offsetY;

  if (document.getElementById("toggleGrid").checked) {
    const snap = snapToGuides(x, y, currentDrag.width, currentDrag.height);
    x = snap.x;
    y = snap.y;
  }

  currentDrag.x = x;
  currentDrag.y = y;

  render();
}

function onMouseUp() {
  previewArea.removeEventListener("mousemove", onMouseMove);
  previewArea.removeEventListener("mouseup", onMouseUp);
  updateGuides(false);
  currentDrag = null;
}


// --- Helper: Tjek om punkt er inde i billede (uden rotation endnu) ---
function isPointInImage(px, py, imgObj) {
  return px >= imgObj.x && px <= imgObj.x + imgObj.width &&
         py >= imgObj.y && py <= imgObj.y + imgObj.height;
}

// --- Render funktion --- 
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Baggrund
  if (!transparentBackground) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Tegn billeder
  images.forEach(imgObj => {
    ctx.save();

    // Flyt til billedets midte for rotation
    ctx.translate(imgObj.x + imgObj.width / 2, imgObj.y + imgObj.height / 2);
    ctx.rotate(imgObj.rotation * Math.PI / 180);

    // Tegn billede centreret
    ctx.drawImage(imgObj.img, -imgObj.width / 2, -imgObj.height / 2, imgObj.width, imgObj.height);

    ctx.restore();

    // Tegn refleksion under billedet (grundlæggende)
    if (imgObj.showReflection) {
      ctx.save();

      ctx.translate(imgObj.x + imgObj.width / 2, imgObj.y + imgObj.height * 1.5);
      ctx.scale(1, -1);
      ctx.globalAlpha = reflectionOpacity;

      ctx.drawImage(imgObj.img, -imgObj.width / 2, -imgObj.height / 2, imgObj.width, imgObj.height);

      ctx.restore();
    }
  });

  // TODO: Snap linjer og midterlinje guides (kommer i del 2)
}

// Initial render
render();
// ---------- Del 2: Resize, rotation, refleksion fade, UI-opdateringer ----------

// --- Opacity-slider ---
document.getElementById("opacitySlider").addEventListener("input", (e) => {
  reflectionOpacity = parseFloat(e.target.value);
  render();
});

// --- Baggrundsfarvevælger ---
document.getElementById("bgColorPicker").addEventListener("input", (e) => {
  backgroundColor = e.target.value;
  render();
});

// --- Transparent toggle ---
document.getElementById("transparentToggle").addEventListener("change", (e) => {
  transparentBackground = e.target.checked;
  render();
});

// --- Canvas size selector ---
document.getElementById("canvasSize").addEventListener("change", (e) => {
  const value = e.target.value;
  if (value === "auto") {
    // Tilpas til største billede (ekstra funktion hvis du ønsker det)
    let maxX = 0, maxY = 0;
    images.forEach(img => {
      maxX = Math.max(maxX, img.x + img.width);
      maxY = Math.max(maxY, img.y + img.height);
    });
    canvas.width = maxX + 100;
    canvas.height = maxY + 100;
  } else {
    const [w, h] = value.split("x").map(Number);
    canvas.width = w;
    canvas.height = h;
  }
  render();
});

// --- Midterguides toggle ---
document.getElementById("toggleGrid").addEventListener("change", () => {
  document.body.classList.toggle("show-midlines");
  render();
});

// --- Roter billede med mus + tast ---
previewArea.addEventListener('wheel', (e) => {
  if (!currentDrag) return;

  e.preventDefault();
  currentDrag.rotation += (e.deltaY > 0 ? 5 : -5); // 5 grader per scroll
  render();
});

// --- Resize med Shift + træk (simple version) ---
previewArea.addEventListener('mousemove', e => {
  if (!currentDrag || !e.shiftKey) return;

  const rect = previewArea.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  currentDrag.width = Math.max(20, mouseX - currentDrag.x);
  currentDrag.height = Math.max(20, mouseY - currentDrag.y);
  render();
});

// ---------- Del 3: Eksport funktion ----------
function exportCanvas() {
  const dataURL = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = "eksporteret_billede.png";
  link.href = dataURL;
  link.click();
}

// --- Bind eksport knap hvis du har en ---
// document.getElementById("exportButton").addEventListener("click", exportCanvas);
