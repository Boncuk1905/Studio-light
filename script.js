const uploadInput = document.getElementById("imageUpload");
const previewArea = document.getElementById("previewArea");
const canvas = document.getElementById("exportCanvas");
const opacitySlider = document.getElementById("opacitySlider");
const lightSlider = document.getElementById("lightAngleSlider");
const bgPicker = document.getElementById("bgColorPicker");
const sizeSel = document.getElementById("canvasSize");
const fmtSel = document.getElementById("fileFormat");

uploadInput.addEventListener("change", handleUpload);
opacitySlider.addEventListener("input", updateReflect);
lightSlider.addEventListener("input", updateShadows);

let dragEl = null, dx=0, dy=0;
let lightRad = lightSlider.value * Math.PI/180;

function handleUpload(e){
  previewArea.innerHTML = "";
  const files = [...e.target.files];
  files.forEach((file,i)=>{
    const r = new FileReader();
    r.onload = ev=>{
      const url = ev.target.result;
      const w = document.createElement("div");
      w.className = "image-wrapper";
      w.style.setProperty("--img-url",`url(${url})`);
      w.style.setProperty("--reflection-opacity",opacitySlider.value);
      w.style.left = `${20 + (i%4)*230}px`;
      w.style.top = `${20 + Math.floor(i/4)*320}px`;
      const img = new Image();
      img.src = url;
      img.onload = ()=>{
        const h = img.naturalHeight/img.naturalWidth;
        w.style.height = `${200*h}px`;
        w.appendChild(img);
        previewArea.appendChild(w);
        makeDrag(w);
        updateShadows();
      };
    };
    r.readAsDataURL(file);
  });
}

function updateReflect(){
  document.querySelectorAll(".image-wrapper").forEach(w =>{
    w.style.setProperty("--reflection-opacity",opacitySlider.value);
  });
}

function updateShadows(){
  lightRad = lightSlider.value * Math.PI/180;
  document.querySelectorAll(".image-wrapper").forEach(w => {
    const d = 8;
    const x = Math.cos(lightRad)*d, y = Math.sin(lightRad)*d;
    w.style.filter = `drop-shadow(${x}px ${y}px 8px rgba(0,0,0,0.15))`;
  });
}

function makeDrag(w){
  w.addEventListener("mousedown",e=>{
    dragEl = w;
    const r = w.getBoundingClientRect();
    dx = e.clientX - r.left; dy = e.clientY - r.top;
    w.style.zIndex = 99;
  });
}

window.addEventListener("mousemove", e=>{
  if(!dragEl) return;
  const p = previewArea.getBoundingClientRect();
  let x = e.clientX - p.left - dx, y = e.clientY - p.top - dy;
  x = Math.max(0,Math.min(x,p.width-dragEl.clientWidth));
  y = Math.max(0,Math.min(y,p.height-dragEl.clientHeight));
  dragEl.style.left = x+"px"; dragEl.style.top = y+"px";
});
window.addEventListener("mouseup",()=>{
  if(dragEl) dragEl.style.zIndex = 1;
  dragEl = null;
});

function clearImages(){
  previewArea.innerHTML = "";
}

function exportLayout(){
  const items = [...document.querySelectorAll(".image-wrapper")];
  if(!items.length) return;

  let cw,ch;
  if(sizeSel.value=="auto"){
    const r = previewArea.getBoundingClientRect();
    cw=r.width; ch=r.height;
  } else [cw,ch] = sizeSel.value.split("x").map(Number);

  canvas.width = cw; canvas.height = ch;
  const cx = canvas.getContext("2d");
  cx.fillStyle = bgPicker.value;
  cx.fillRect(0,0,cw,ch);
  cx.imageSmoothingQuality = "high";

  const pr = previewArea.getBoundingClientRect();
  const margin = 20;

  items.forEach(w=>{
    const img = w.querySelector("img");
    const wd = w.getBoundingClientRect();
    const rx = (wd.left - pr.left);
    const ry = (wd.top - pr.top);
    const sx = cw/pr.width, sy = ch/pr.height;
    const px = rx*sx, py=ry*sy, pxw = wd.width*sx, pxh = wd.height*sy;
    // glass-skærm
    const gh=pxh*0.1;
    const grad = cx.createLinearGradient(px,py+pxh,px,py+pxh+gh);
    grad.addColorStop(0, "rgba(255,255,255,0.4)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    cx.fillStyle = grad;
    cx.filter="blur(8px)";
    cx.fillRect(px,py+pxh-gh/2,pxw,gh);
    cx.filter="none";
    cx.drawImage(img,px,py,pxw,pxh);
    // refleksion
    cx.save();
    cx.translate(px,py+pxh*2);
    cx.scale(1,-1); cx.globalAlpha = parseFloat(opacitySlider.value);
    cx.drawImage(img,0,0,pxw,pxh);
    cx.restore();
    cx.globalAlpha = 1;
  });

  const link = document.createElement("a");
  link.href = canvas.toDataURL(`image/${fmtSel.value}`,1.0);
  link.download=`layout.${fmtSel.value}`;
  link.click();
}
