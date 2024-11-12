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
    bezierBtnId,
    drawingModeId
  ) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.drawingCanvas = document.createElement("canvas");
    this.drawingCanvas.width = this.canvas.width;
    this.drawingCanvas.height = this.canvas.height;
    this.drawingCtx = this.drawingCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    this.colorPicker = document.getElementById(colorPickerId);
    this.thicknessRange = document.getElementById(thicknessRangeId);
    this.saveBtn = document.getElementById(saveBtnId);
    this.uploadBtn = document.getElementById(uploadBtnId);
    this.clearCanvasBtn = document.getElementById(clearCanvasBtnId);
    this.eraseBtn = document.getElementById(eraseBtnId);
    this.fillBtn = document.getElementById(fillBtnId);
    this.bezierBtn = document.getElementById(bezierBtnId);
    this.drawingModeSelect = document.getElementById(drawingModeId);
    this.painting = false;
    this.erasing = false;
    this.filling = false;
    this.drawingBezier = false;
    this.currentShape = "free"; // Добавляем текущую выбранную форму
    this.controlPoints = [];
    this.bezierCurves = [];
    this.selectedPoint = null;
    this.savedImageData = null;
    this.startX = 0; // Начальная координата X
    this.startY = 0; // Начальная координата Y
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
    this.bezierBtn.addEventListener("click", () => this.toggleBezierMode());
    
    // Добавляем обработчик изменения режима рисования
    this.drawingModeSelect.addEventListener("change", (e) => this.setDrawingMode(e.target.value));
  }

  // Метод для изменения режима рисования
  setDrawingMode(mode) {
    this.currentShape = mode;
  }

  startPosition(e) {
    const x = e.clientX - this.canvas.offsetLeft;
    const y = e.clientY - this.canvas.offsetTop;

    if (this.filling) return;

    if (this.drawingBezier) {
      const point = this.getControlPointAt(x, y);
      if (point) {
        this.selectedPoint = point;
      } else {
        this.controlPoints.push({ x, y });
        if (this.controlPoints.length === 3) {
          this.bezierCurves.push([...this.controlPoints]);
          this.controlPoints = [];
          this.redrawCanvas();
        }
      }
    } else {
      this.painting = true;
      if (!this.erasing) {
        this.startX = x; // Сохраняем начальную координату X
        this.startY = y; // Сохраняем начальную координату Y
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(x, y);
      }
      this.draw(e);
    }
  }

  endPosition() {
    this.painting = false;
    this.selectedPoint = null;
    this.drawingCtx.beginPath();
  } 

// Также убедитесь, что метод draw правильно вызывает эти функции
draw(e) {
  const x = e.clientX - this.canvas.offsetLeft;
  const y = e.clientY - this.canvas.offsetTop;

  if (!this.painting && !this.selectedPoint) return;

  if (this.selectedPoint) {
      this.selectedPoint.x = x;
      this.selectedPoint.y = y;
      this.redrawCanvas();
  } else if (this.painting && !this.drawingBezier) {
      switch (this.currentShape) {
          case "free":
              this.drawFreeLine(x, y);
              break;
          case "circle":
              this.drawCircle(x, y);
              break;
          case "square":
              this.drawSquare(x, y);
              break;
          case "rectangle":
              this.drawRectangle(x, y);
              break;
          case "triangle":
              this.drawTriangle(x, y);
              break;
      }
      this.updateMainCanvas();
  }
}

drawFreeLine(x, y) {
  const ctx = this.drawingCtx; // Всегда рисуем на временном холсте
  ctx.lineWidth = this.thicknessRange.value;
  ctx.lineCap = "round";
  
  if (this.erasing) {
    // Включаем режим стирания
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)"; // Цвет стирания не важен, так как мы стираем
  } else {
    // Включаем режим рисования
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = this.colorPicker.value;
  }

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);

  if (!this.erasing) {
    // Если мы рисуем, а не стираем, обновляем основной холст после рисования
    this.updateMainCanvas();
  }
}




drawRectangle(x, y) {
  // Очищаем холст перед рисованием
  this.drawingCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
  const width = Math.abs(x - this.startX);
  const height = Math.abs(y - this.startY);
  const rectX = Math.min(this.startX, x);
  const rectY = Math.min(this.startY, y);
  
  this.drawingCtx.beginPath();
  this.drawingCtx.lineWidth = this.thicknessRange.value;
  this.drawingCtx.strokeStyle = this.colorPicker.value;
  this.drawingCtx.fillStyle = 'transparent';
  this.drawingCtx.setLineDash([]); // Сплошная линия
  this.drawingCtx.rect(rectX, rectY, width, height);
  this.drawingCtx.stroke();
}


drawCircle(x, y) {
  // Очищаем холст перед рисованием
  this.drawingCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
  const radius = Math.sqrt(
      Math.pow(x - this.startX, 2) + 
      Math.pow(y - this.startY, 2)
  );
  
  this.drawingCtx.beginPath();
  this.drawingCtx.lineWidth = this.thicknessRange.value;
  this.drawingCtx.strokeStyle = this.colorPicker.value;
  this.drawingCtx.fillStyle = 'transparent';
  this.drawingCtx.setLineDash([]); // Сплошная линия
  this.drawingCtx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
  this.drawingCtx.stroke();
}

drawTriangle(x, y) {
  // Очищаем холст перед рисованием
  this.drawingCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
  this.drawingCtx.beginPath();
  this.drawingCtx.lineWidth = this.thicknessRange.value;
  this.drawingCtx.strokeStyle = this.colorPicker.value;
  this.drawingCtx.fillStyle = 'transparent';
  this.drawingCtx.setLineDash([]); // Сплошная линия
  
  this.drawingCtx.moveTo(this.startX, this.startY);
  this.drawingCtx.lineTo(x, y);
  this.drawingCtx.lineTo(this.startX - (x - this.startX), y);
  this.drawingCtx.closePath();
  this.drawingCtx.stroke();
}

drawSquare(x, y) {
  // Очищаем холст перед рисованием
  this.drawingCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  
  const side = Math.max(
      Math.abs(x - this.startX),
      Math.abs(y - this.startY)
  );
  
  const squareX = x > this.startX ? this.startX : this.startX - side;
  const squareY = y > this.startY ? this.startY : this.startY - side;
  
  this.drawingCtx.beginPath();
  this.drawingCtx.lineWidth = this.thicknessRange.value;
  this.drawingCtx.strokeStyle = this.colorPicker.value;
  this.drawingCtx.fillStyle = 'transparent';
  this.drawingCtx.setLineDash([]); // Сплошная линия
  this.drawingCtx.rect(squareX, squareY, side, side);
  this.drawingCtx.stroke();
}

updateMainCanvas() {
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  if (this.backgroundImage) {
    // Восстанавливаем изображение на холсте перед рисованием
    this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);
  }
  this.ctx.drawImage(this.drawingCanvas, 0, 0);
  if (this.bezierCurves.length > 0) {
    this.bezierCurves.forEach((curve) => this.drawBezier(curve));
  }
}

  redrawCanvas() {
    if (this.savedImageData) {
      this.ctx.putImageData(this.savedImageData, 0, 0); // Restore the saved image data
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear the main canvas
    }
    this.ctx.drawImage(this.drawingCanvas, 0, 0); // Draw the drawing canvas
    this.bezierCurves.forEach((curve) => this.drawBezier(curve)); // Redraw all Bézier curves
  }

  clearCanvas() {
    this.backgroundImage = null; // Сбрасываем загруженное изображение
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawingCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.savedImageData = null; // Сбрасываем сохраненное состояние
    this.controlPoints = [];
    this.bezierCurves = [];
    this.updateMainCanvas();
}


  toggleBezierMode() {
    this.drawingBezier = !this.drawingBezier;
    this.bezierBtn.textContent = this.drawingBezier
      ? "Режим рисования"
      : "Режим кривых Безье";

    if (this.drawingBezier) {
      this.saveCanvasState(); // Save the current canvas state
    } else {
      this.restoreCanvasState(); // Restore the saved canvas state
    }

    this.controlPoints = [];
    this.selectedPoint = null;
    this.updateMainCanvas();
  }

  getControlPointAt(x, y) {
    for (const curve of this.bezierCurves) {
      for (const point of curve) {
        if (Math.hypot(point.x - x, point.y - y) < 10) {
          return point;
        }
      }
    }
    return null;
  }

  drawBezier(curve) {
    if (curve.length < 3) return;

    const [p0, p1, p2] = curve;

    this.ctx.beginPath();
    this.ctx.moveTo(p0.x, p0.y);
    this.ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y); // Кривая второго порядка
    this.ctx.strokeStyle = this.colorPicker.value;
    this.ctx.lineWidth = this.thicknessRange.value;
    this.ctx.stroke();
    this.ctx.closePath();

    if (this.drawingBezier) {
      this.ctx.fillStyle = "red";
      [p0, p1, p2].forEach((point) => {
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.closePath();
      });
    }
  }
  
  toggleFillMode() {
    this.filling = !this.filling;
    this.fillBtn.textContent = this.filling ? "Режим рисования" : "Заливка";
  
    if (this.filling) {
      this.saveCanvasState();
    } else {
      this.restoreCanvasState();
    }
  }
  
  

  saveCanvasState() {
    this.savedImageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
  }

  restoreCanvasState() {
    if (this.savedImageData) {
      this.ctx.putImageData(this.savedImageData, 0, 0);
    }
  }

  fillArea(e) {
    const x = e.clientX - this.canvas.offsetLeft;
    const y = e.clientY - this.canvas.offsetTop;
    const fillColor = this.hexToRgb(this.colorPicker.value);
  
    // Выполняем заливку на drawingCanvas
    const imageData = this.drawingCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const targetColor = this.getPixelColor(imageData, x, y);
    if (this.colorsMatch(targetColor, fillColor)) return;
  
    this.floodFill(imageData, x, y, targetColor, fillColor);
  
    // Обновляем данные drawingCtx и сохраняем их на основном canvas
    this.drawingCtx.putImageData(imageData, 0, 0);
    this.updateMainCanvas();
  
    // Сохраняем текущее состояние, чтобы заливка не сбрасывалась при рисовании других элементов
    this.saveCanvasState();
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
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        this.backgroundImage = img; // Сохраняем изображение в backgroundImage
        this.updateMainCanvas();
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
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
  "fillBtn",
  "bezierBtn",
  "drawingMode"
);