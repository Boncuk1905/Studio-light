document.getElementById("imageUpload").addEventListener("change", function (e) {
  const previewArea = document.getElementById("previewArea");
  previewArea.innerHTML = "";

  Array.from(e.target.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = document.createElement("img");
      img.src = event.target.result;
      img.style.width = "200px";
      img.style.margin = "10px";
      previewArea.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});
