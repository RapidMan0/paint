class CanvasDrawer {
  constructor(
    canvasId,
    colorPickerId,
    thicknessRangeId,
    saveBtnId,
    uploadBtnId,
    clearCanvasBtnId,
    eraseBtnId,
    fillBtnId,
    bezierBtnId // Новый аргумент для кнопки рисования кривых Безье
  ) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.colorPicker = document.getElementById(colorPickerId);
    this.thicknessRange = document.getElementById(thicknessRangeId);
    this.saveBtn = document.getElementById(saveBtnId);
    this.uploadBtn = document.getElementById(uploadBtnId);
    this.clearCanvasBtn = document.getElementById(clearCanvasBtnId);
    this.eraseBtn = document.getElementById(eraseBtnId);
    this.fillBtn = document.getElementById(fillBtnId);
    this.bezierBtn = document.getElementById(bezierBtnId); // Привязка к кнопке
    this.painting = false;
    this.erasing = false;
    this.filling = false;
    this.drawingBezier = false; // Новое состояние для рисования Безье
    this.controlPoints = []; // Массив контрольных точек

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

    this.canvas.addEventListener("click", (e) => {
      if (this.filling) this.fillArea(e);
    });

    this.saveBtn.addEventListener("click", () => this.saveImage());
    this.uploadBtn.addEventListener("change", (e) => this.uploadImage(e));
    this.clearCanvasBtn.addEventListener("click", () => this.clearCanvas());
    this.eraseBtn.addEventListener("click", () => this.toggleEraser());
    this.fillBtn.addEventListener("click", () => this.toggleFillMode());
    this.bezierBtn.addEventListener("click", () => this.toggleBezierMode()); // Обработчик для кнопки Безье
  }

  toggleBezierMode() {
    this.drawingBezier = !this.drawingBezier;
    this.bezierBtn.textContent = this.drawingBezier ? "Режим рисования" : "Режим кривых Безье";
    this.controlPoints = []; // Сбрасываем контрольные точки
  }

  startPosition(e) {
    if (this.filling) return; // Отключаем рисование при активной заливке
    if (this.drawingBezier) {
      this.controlPoints.push({ x: e.clientX - this.canvas.offsetLeft, y: e.clientY - this.canvas.offsetTop });
      if (this.controlPoints.length === 3) { // Если три точки, рисуем Безье
        this.drawBezier();
        this.controlPoints = []; // Сбрасываем точки после рисования
      }
    } else {
      this.painting = true;
      this.draw(e);
    }
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
    this.ctx.lineTo(
      e.clientX - this.canvas.offsetLeft,
      e.clientY - this.canvas.offsetTop
    );
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(
      e.clientX - this.canvas.offsetLeft,
      e.clientY - this.canvas.offsetTop
    );
  }

  drawBezier() {
    if (this.controlPoints.length < 3) return;

    const [p0, p1, p2] = this.controlPoints;

    // Рисуем кривую Безье
    this.ctx.beginPath();
    this.ctx.moveTo(p0.x, p0.y);
    this.ctx.bezierCurveTo(p1.x, p1.y, p1.x, p1.y, p2.x, p2.y);
    this.ctx.strokeStyle = this.colorPicker.value;
    this.ctx.lineWidth = this.thicknessRange.value;
    this.ctx.stroke();
    this.ctx.closePath();

    // Рисуем маленькие круги на каждой из контрольных точек
    this.ctx.fillStyle = "red";
    [p0, p1, p2].forEach((point) => {
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.closePath();
    });
}


  toggleFillMode() {
    this.filling = !this.filling;
    this.fillBtn.textContent = this.filling ? "Режим рисования" : "Заливка";
  }

  fillArea(e) {
    const x = e.clientX - this.canvas.offsetLeft;
    const y = e.clientY - this.canvas.offsetTop;
    const fillColor = this.hexToRgb(this.colorPicker.value);
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const targetColor = this.getPixelColor(imageData, x, y);
    if (this.colorsMatch(targetColor, fillColor)) return;
    this.floodFill(imageData, x, y, targetColor, fillColor);
    this.ctx.putImageData(imageData, 0, 0);
  }

  getPixelColor(imageData, x, y) {
    const index = (y * imageData.width + x) * 4;
    const data = imageData.data;
    return [data[index], data[index + 1], data[index + 2], data[index + 3]];
  }

  colorsMatch(color1, color2) {
    return color1.every((value, i) => value === color2[i]);
  }

  floodFill(imageData, x, y, targetColor, fillColor) {
    const stack = [[x, y]];
    const { width, height, data } = imageData;
    const visit = new Array(width * height).fill(false);

    while (stack.length) {
      const [currentX, currentY] = stack.pop();
      const index = (currentY * width + currentX) * 4;
      if (
        visit[currentY * width + currentX] ||
        !this.colorsMatch(
          [data[index], data[index + 1], data[index + 2], data[index + 3]],
          targetColor
        )
      ) {
        continue;
      }

      visit[currentY * width + currentX] = true;
      data[index] = fillColor[0];
      data[index + 1] = fillColor[1];
      data[index + 2] = fillColor[2];
      data[index + 3] = 255;

      if (currentX > 0) stack.push([currentX - 1, currentY]);
      if (currentX < width - 1) stack.push([currentX + 1, currentY]);
      if (currentY > 0) stack.push([currentX, currentY - 1]);
      if (currentY < height - 1) stack.push([currentX, currentY + 1]);
    }
  }

  hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
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
    this.eraseBtn.textContent = this.erasing
      ? "Режим рисования"
      : "Режим стирания";
  }
}

// Инициализация объекта CanvasDrawer с переданными id элементов
const drawer = new CanvasDrawer(
  "canvas",
  "colorPicker",
  "thicknessRange",
  "saveBtn",
  "uploadBtn",
  "clearCanvasBtn",
  "eraseBtn",
  "fillBtn", // Новый аргумент для кнопки заливки
  "bezierBtn" // Новый аргумент для кнопки Безье
);
