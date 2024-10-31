class CanvasDrawer {
  constructor(canvasId, colorPickerId, thicknessRangeId, saveBtnId, uploadBtnId, clearCanvasBtnId, eraseBtnId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.colorPicker = document.getElementById(colorPickerId);
    this.thicknessRange = document.getElementById(thicknessRangeId);
    this.saveBtn = document.getElementById(saveBtnId);
    this.uploadBtn = document.getElementById(uploadBtnId);
    this.clearCanvasBtn = document.getElementById(clearCanvasBtnId);
    this.eraseBtn = document.getElementById(eraseBtnId);
    this.painting = false;
    this.erasing = false;

    this.init();
  }

  init() {
    this.canvas.addEventListener("mousedown", (e) => this.startPosition(e));
    this.canvas.addEventListener("mouseup", () => this.endPosition());
    this.canvas.addEventListener("mousemove", (e) => this.draw(e));
    this.canvas.addEventListener("mouseleave", () => this.endPosition());
    this.canvas.addEventListener("mouseenter", (e) => {
      if (e.buttons === 1) this.startPosition(e);
    });

    this.saveBtn.addEventListener("click", () => this.saveImage());
    this.uploadBtn.addEventListener("change", (e) => this.uploadImage(e));
    this.clearCanvasBtn.addEventListener("click", () => this.clearCanvas());
    this.eraseBtn.addEventListener("click", () => this.toggleEraser());
  }

  startPosition(e) {
    this.painting = true;
    this.draw(e);
  }

  endPosition() {
    this.painting = false;
    this.ctx.beginPath();
  }

  draw(e) {
    if (!this.painting) return;
    this.ctx.lineWidth = this.thicknessRange.value;
    this.ctx.lineCap = "round";
    this.ctx.strokeStyle = this.erasing ? "#f0f0f0" : this.colorPicker.value;

    this.ctx.lineTo(e.clientX - this.canvas.offsetLeft, e.clientY - this.canvas.offsetTop);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX - this.canvas.offsetLeft, e.clientY - this.canvas.offsetTop);
  }

  saveImage() {
    const link = document.createElement("a");
    link.download = "canvas.png";
    link.href = this.canvas.toDataURL("image/png");
    link.click();
  }

  uploadImage(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  toggleEraser() {
    this.erasing = !this.erasing;
    this.eraseBtn.textContent = this.erasing ? "Режим рисования" : "Режим стирания";
  }
}

// Инициализация объекта CanvasDrawer с переданными id элементов
const drawer = new CanvasDrawer("canvas", "colorPicker", "thicknessRange", "saveBtn", "uploadBtn", "clearCanvasBtn", "eraseBtn");
