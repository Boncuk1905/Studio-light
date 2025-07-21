const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvas = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightSlider = document.getElementById("lightAngleSlider");
const bgPicker = document.getElementById("bgColorPicker");
const sizeSel = document.getElementById("canvasSize");
const fmtSel = document.getElementById("fileFormat");
const toggleGrid = document.getElementById("toggleGrid");

let dragEl=null, dx=0, dy=0;
let isDragging=false;
let lightRad = lightSlider.value * Math.PI/180;

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflect);
lightSlider.addEventListener("input", updateShadows);

function handleUpload(e) {
  previewArea.innerHTML = "";
  const files = [...e.target.files];
  files.forEach((file, i) => {
    const url = URL.createObjectURL(file);
    const w = document.createElement("div");
    w.className="image-wrapper";
    w.style.setProperty("--img-url", `url(${url})`);
    w.style.setProperty("--reflection-opacity", opacitySlider.value);
    w.style.left = `${20 + (i%4)*230}px`;
    w.style.top = `${20 + Math.floor(i/4)*320}px`;

    const img = new Image();
    img.src = url;
    img.onload = ()=> {
      const h = img.naturalHeight / img.naturalWidth;
      w.style.height = `${200*h}px`;
      w.appendChild(img);
      previewArea.appendChild(w);
      makeDrag(w);
      updateShadows();
      URL.revokeObjectURL(url);
    };
  });

  // lave guide-linjer
  addGuides();
}

function updateReflect(){
  document.querySelectorAll(".image-wrapper").forEach(w=>{
    w.style.setProperty("--reflection-opacity", opacitySlider.value);
  });
}

function updateShadows(){
  lightRad = lightSlider.value * Math.PI/180;
  document.querySelectorAll(".image-wrapper").forEach(w=>{
    const d = 8, x = Math.cos(lightRad)*d, y = Math.sin(lightRad)*d;
    w.style.filter = `drop-shadow(${x}px ${y}px 8px rgba(0,0,0,0.15))`;
  });
}

function makeDrag(w){
  w.addEventListener("mousedown", e=>{
    isDragging=true; dragEl=w;
    const r=w.getBoundingClientRect();
    dx=e.clientX-r.left; dy=e.clientY-r.top;
    w.style.zIndex=99;
  });
}

window.addEventListener("mousemove", e=>{
  if(!isDragging||!dragEl) return;
  const pr=previewArea.getBoundingClientRect();
  const r=dragEl.getBoundingClientRect();
  let x=e.clientX-pr.left-dx;
  let y=e.clientY-pr.top-dy;
  x=Math.max(0,Math.min(x, pr.width-r.width));
  y=Math.max(0,Math.min(y, pr.height-r.height));
  dragEl.style.left=x+"px"; dragEl.style.top=y+"px";
});

window.addEventListener("mouseup", ()=>{
  isDragging=false;
  if(dragEl) dragEl.style.zIndex=1;
  dragEl=null;
});

toggleGrid.addEventListener("change", ()=>{
  const lines = document.querySelectorAll(".guide-line");
  lines.forEach(l => l.style.display = toggleGrid.checked ? "block" : "none");
});

function addGuides(){
  document.querySelectorAll(".guide-line").forEach(l=>l.remove());
  const pr = previewArea.getBoundingClientRect();
  const hLine = document.createElement("div");
  hLine.className = "guide-line";
  hLine.style.top = pr.height/2 + "px";
  hLine.style.left="0";
  hLine.style.width = pr.width + "px";
  hLine.style.height = "1px";
  previewArea.appendChild(hLine);
  const vLine = document.createElement("div");
  vLine.className = "guide-line";
  vLine.style.left = pr.width/2 + "px";
  vLine.style.top="0";
  vLine.style.width = "1px";
  vLine.style.height = pr.height + "px";
  previewArea.appendChild(vLine);
}

function clearImages(){
  previewArea.innerHTML="";
}

function exportLayout(){
  const items=[...document.querySelectorAll(".image-wrapper")];
  if(!items.length) return;
  let cw,ch;
  if(sizeSel.value=="auto"){
    const r=previewArea.getBoundingClientRect();
    cw=r.width; ch=r.height;
  } else [cw,ch] = sizeSel.value.split("x").map(Number);

  canvas.width=cw; canvas.height=ch;
  const cx=canvas.getContext("2d");
  cx.fillStyle = bgPicker.value;
  cx.fillRect(0,0,cw,ch);
  cx.imageSmoothingQuality="high";

  const pr = previewArea.getBoundingClientRect();
  items.forEach(w=>{
    const img=w.querySelector("img");
    const r=w.getBoundingClientRect();
    const sx=cw/pr.width, sy=ch/pr.height;
    const px=(r.left-pr.left)*sx, py=(r.top-pr.top)*sy;
    const pw=r.width*sx, ph=r.height*sy;
    const gh = ph*0.1;
    const grad=cx.createLinearGradient(px,py+ph,px,py+ph+gh);
    grad.addColorStop(0,"rgba(255,255,255,0.4)");
    grad.addColorStop(1,"rgba(255,255,255,0)");
    cx.fillStyle=grad;
    cx.filter="blur(8px)";
    cx.fillRect(px,py+ph-gh/2,pw,gh);
    cx.filter="none";
    cx.drawImage(img,px,py,pw,ph);
    cx.save();
    cx.translate(px,py+ph*2);
    cx.scale(1,-1);
    cx.globalAlpha = parseFloat(opacitySlider.value);
    cx.drawImage(img,0,0,pw,ph);
    cx.restore();
    cx.globalAlpha=1;
  });

  const link = document.createElement("a");
  link.href = canvas.toDataURL(`image/${fmtSel.value}`,1.0);
  link.download = `layout.${fmtSel.value}`;
  link.click();
}
