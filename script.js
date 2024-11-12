class CanvasDrawer {
  // Конструктор класса, инициализирует элементы и параметры
  constructor(
    canvasId, // Идентификатор холста
    colorPickerId, // Идентификатор для выбора цвета
    thicknessRangeId, // Идентификатор для выбора толщины линии
    saveBtnId, // Идентификатор кнопки для сохранения
    uploadBtnId, // Идентификатор кнопки для загрузки изображения
    clearCanvasBtnId, // Идентификатор кнопки для очистки холста
    eraseBtnId, // Идентификатор кнопки для стирания
    fillBtnId, // Идентификатор кнопки для заливки
    bezierBtnId, // Идентификатор кнопки для включения режима Беэзиер кривых
    drawingModeId // Идентификатор для выбора режима рисования
  ) {
    // Получаем элементы из DOM по их идентификаторам
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.drawingCanvas = document.createElement("canvas"); // Создаем дополнительный холст для рисования
    this.drawingCanvas.width = this.canvas.width; // Устанавливаем размеры как у основного холста
    this.drawingCanvas.height = this.canvas.height;
    this.drawingCtx = this.drawingCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    // Инициализируем другие элементы управления
    this.colorPicker = document.getElementById(colorPickerId);
    this.thicknessRange = document.getElementById(thicknessRangeId);
    this.saveBtn = document.getElementById(saveBtnId);
    this.uploadBtn = document.getElementById(uploadBtnId);
    this.clearCanvasBtn = document.getElementById(clearCanvasBtnId);
    this.eraseBtn = document.getElementById(eraseBtnId);
    this.fillBtn = document.getElementById(fillBtnId);
    this.bezierBtn = document.getElementById(bezierBtnId);
    this.drawingModeSelect = document.getElementById(drawingModeId);

    // Инициализация переменных
    this.painting = false; // Флаг, который определяет рисуем ли мы
    this.erasing = false; // Флаг для режима стирания
    this.filling = false; // Флаг для режима заливки
    this.drawingBezier = false; // Флаг для режима рисования кривых Беэзиер
    this.currentShape = "free"; // Текущий выбранный режим рисования (свободная линия)
    this.controlPoints = []; // Массив контрольных точек для кривых Беэзиер
    this.bezierCurves = []; // Массив для хранения всех кривых Беэзиер
    this.selectedPoint = null; // Текущая выбранная точка для редактирования кривых
    this.savedImageData = null; // Сохраненные данные изображения для восстановления
    this.startX = 0; // Начальная координата X
    this.startY = 0; // Начальная координата Y
    this.init(); // Инициализация обработчиков событий
  }

  // Метод для установки обработчиков событий
  init() {
    // Обработчик начала рисования (нажатие кнопки мыши)
    this.canvas.addEventListener("mousedown", (e) => this.startPosition(e));
    // Обработчик завершения рисования (отпуск кнопки мыши)
    this.canvas.addEventListener("mouseup", () => this.endPosition());
    // Обработчик движения мыши для рисования
    this.canvas.addEventListener("mousemove", (e) => this.draw(e));
    // Обработчик ухода мыши с холста
    this.canvas.addEventListener("mouseleave", () => this.endPosition());
    // Обработчик, если мышь снова входит в холст
    this.canvas.addEventListener("mouseenter", (e) => {
      if (e.buttons === 1) this.startPosition(e);
    });

    // Обработчик клика для заливки области
    this.canvas.addEventListener("click", (e) => {
      if (this.filling) this.fillArea(e);
    });

    // Обработчики для различных кнопок управления
    this.saveBtn.addEventListener("click", () => this.saveImage());
    this.uploadBtn.addEventListener("change", (e) => this.uploadImage(e));
    this.clearCanvasBtn.addEventListener("click", () => this.clearCanvas());
    this.eraseBtn.addEventListener("click", () => this.toggleEraser());
    this.fillBtn.addEventListener("click", () => this.toggleFillMode());
    this.bezierBtn.addEventListener("click", () => this.toggleBezierMode());

    // Обработчик для изменения режима рисования
    this.drawingModeSelect.addEventListener("change", (e) =>
      this.setDrawingMode(e.target.value)
    );
  }

  // Метод для изменения режима рисования
  setDrawingMode(mode) {
    this.currentShape = mode;
  }

  // Метод для начала рисования (обработчик события mousedown)
  startPosition(e) {
    const x = e.clientX - this.canvas.offsetLeft;
    const y = e.clientY - this.canvas.offsetTop;

    if (this.filling) return; // Если включен режим заливки, ничего не делаем

    // Если рисуем Беэзиер кривую
    if (this.drawingBezier) {
      const point = this.getControlPointAt(x, y);
      if (point) {
        this.selectedPoint = point;
      } else {
        this.controlPoints.push({ x, y });
        if (this.controlPoints.length === 3) {
          this.bezierCurves.push([...this.controlPoints]);
          this.controlPoints = [];
          this.redrawCanvas(); // Перерисовываем холст с новыми кривыми
        }
      }
    } else {
      this.painting = true; // Включаем рисование
      if (!this.erasing) {
        // Если не стираем, начинаем рисование с точки
        this.startX = x;
        this.startY = y;
        this.drawingCtx.beginPath(); // Начинаем новый путь
        this.drawingCtx.moveTo(x, y); // Перемещаемся в начальную точку
      }
      this.draw(e); // Рисуем
    }
  }

  // Метод для завершения рисования (обработчик события mouseup)
  endPosition() {
    this.painting = false; // Выключаем рисование
    this.selectedPoint = null; // Сбрасываем выбранную точку для кривых
    this.drawingCtx.beginPath(); // Завершаем текущий путь рисования
  }

  // Основной метод рисования, вызывается при каждом движении мыши
  draw(e) {
    const x = e.clientX - this.canvas.offsetLeft;
    const y = e.clientY - this.canvas.offsetTop;

    if (!this.painting && !this.selectedPoint) return; // Если не рисуем и не выбрана точка для кривых

    if (this.selectedPoint) {
      // Если выбрана точка кривой, перемещаем ее и перерисовываем кривую
      this.selectedPoint.x = x;
      this.selectedPoint.y = y;
      this.redrawCanvas();
    } else if (this.painting && !this.drawingBezier) {
      // Если рисуем обычной линией или фигурой
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
      this.updateMainCanvas(); // Обновляем основной холст
    }
  }

  // Метод для рисования свободной линии
  drawFreeLine(x, y) {
    const ctx = this.drawingCtx; // Используем временный холст для рисования
    ctx.lineWidth = this.thicknessRange.value; // Толщина линии
    ctx.lineCap = "round"; // Закругленные концы линий

    // Устанавливаем режим рисования или стирания
    if (this.erasing) {
      ctx.globalCompositeOperation = "destination-out"; // Для стирания
      ctx.strokeStyle = "rgba(0,0,0,1)"; // Цвет не важен при стирании
    } else {
      ctx.globalCompositeOperation = "source-over"; // Для рисования
      ctx.strokeStyle = this.colorPicker.value; // Цвет линии
    }

    // Рисуем линию
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Если рисуем, обновляем основной холст
    if (!this.erasing) {
      this.updateMainCanvas();
    }
  }

  // Метод для рисования прямоугольника
  drawRectangle(x, y) {
    this.drawingCtx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Очищаем временный холст

    // Вычисляем координаты и размеры прямоугольника
    const width = Math.abs(x - this.startX);
    const height = Math.abs(y - this.startY);
    const rectX = Math.min(this.startX, x);
    const rectY = Math.min(this.startY, y);

    // Рисуем прямоугольник
    this.drawingCtx.beginPath();
    this.drawingCtx.lineWidth = this.thicknessRange.value;
    this.drawingCtx.strokeStyle = this.colorPicker.value;
    this.drawingCtx.fillStyle = "transparent"; // Без заливки
    this.drawingCtx.setLineDash([]); // Сплошная линия
    this.drawingCtx.rect(rectX, rectY, width, height);
    this.drawingCtx.stroke();
  }

  // Метод для рисования круга
  drawCircle(x, y) {
    this.drawingCtx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Очищаем временный холст

    // Вычисляем радиус круга
    const radius = Math.sqrt(
      Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2)
    );

    // Рисуем круг
    this.drawingCtx.beginPath();
    this.drawingCtx.lineWidth = this.thicknessRange.value;
    this.drawingCtx.strokeStyle = this.colorPicker.value;
    this.drawingCtx.fillStyle = "transparent";
    this.drawingCtx.setLineDash([]);
    this.drawingCtx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
    this.drawingCtx.stroke();
  }

  // Метод для рисования треугольника
  drawTriangle(x, y) {
    this.drawingCtx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Очищаем холст

    this.drawingCtx.beginPath();
    this.drawingCtx.lineWidth = this.thicknessRange.value;
    this.drawingCtx.strokeStyle = this.colorPicker.value;
    this.drawingCtx.fillStyle = "transparent"; // Без заливки
    this.drawingCtx.setLineDash([]);

    // Рисуем треугольник
    this.drawingCtx.moveTo(this.startX, this.startY);
    this.drawingCtx.lineTo(x, y);
    this.drawingCtx.lineTo(this.startX - (x - this.startX), y);
    this.drawingCtx.closePath();
    this.drawingCtx.stroke();
  }

  // Метод для рисования квадрата
  drawSquare(x, y) {
    this.drawingCtx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Очищаем холст

    const side = Math.max(Math.abs(x - this.startX), Math.abs(y - this.startY)); // Вычисляем сторону квадрата
    const squareX = x > this.startX ? this.startX : this.startX - side;
    const squareY = y > this.startY ? this.startY : this.startY - side;

    this.drawingCtx.beginPath();
    this.drawingCtx.lineWidth = this.thicknessRange.value;
    this.drawingCtx.strokeStyle = this.colorPicker.value;
    this.drawingCtx.fillStyle = "transparent";
    this.drawingCtx.setLineDash([]);
    this.drawingCtx.rect(squareX, squareY, side, side); // Рисуем квадрат
    this.drawingCtx.stroke();
  }

  // Метод для обновления основного холста (перерисовка)
  updateMainCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Очищаем основной холст
    if (this.backgroundImage) {
      // Восстанавливаем фоновое изображение, если оно есть
      this.ctx.drawImage(
        this.backgroundImage,
        0,
        0,
        this.canvas.width,
        this.canvas.height
      );
    }
    // Рисуем временный холст с рисунком
    this.ctx.drawImage(this.drawingCanvas, 0, 0);
    // Рисуем все кривые Беэзиер
    if (this.bezierCurves.length > 0) {
      this.bezierCurves.forEach((curve) => this.drawBezier(curve));
    }
  }

  // Метод для перерисовки холста (восстановление сохраненного состояния)
  redrawCanvas() {
    if (this.savedImageData) {
      this.ctx.putImageData(this.savedImageData, 0, 0); // Восстанавливаем сохраненные данные
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Если нет сохраненных данных, очищаем холст
    }
    this.ctx.drawImage(this.drawingCanvas, 0, 0); // Рисуем временный холст
    this.bezierCurves.forEach((curve) => this.drawBezier(curve)); // Рисуем все кривые Беэзиер
  }

  // Метод для очистки холста
  clearCanvas() {
    this.backgroundImage = null; // Сбрасываем фоновое изображение
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Очищаем основной холст
    this.drawingCtx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Очищаем холст для рисования
    this.savedImageData = null; // Сбрасываем сохраненные данные изображения
    this.controlPoints = []; // Очищаем контрольные точки для кривых
    this.bezierCurves = []; // Очищаем кривые Беэзиер
    this.updateMainCanvas(); // Обновляем основной холст
  }

  // Метод для переключения между режимами рисования и рисования кривых Безье
  toggleBezierMode() {
    this.drawingBezier = !this.drawingBezier; // Переключаем флаг состояния рисования кривых Безье
    this.bezierBtn.textContent = this.drawingBezier
      ? "Режим рисования" // Если активен режим кривых Безье, показываем "Режим рисования"
      : "Режим кривых Безье"; // Иначе показываем "Режим кривых Безье"

    // Сохраняем или восстанавливаем состояние канваса в зависимости от режима
    if (this.drawingBezier) {
      this.saveCanvasState(); // Сохраняем текущее состояние канваса
    } else {
      this.restoreCanvasState(); // Восстанавливаем сохраненное состояние канваса
    }

    this.controlPoints = []; // Очищаем массив контрольных точек
    this.selectedPoint = null; // Сбрасываем выбранную точку
    this.updateMainCanvas(); // Обновляем основной холст
  }

  // Метод для нахождения контрольной точки, на которой был кликнут пользователь
  getControlPointAt(x, y) {
    for (const curve of this.bezierCurves) {
      // Проходим по всем кривым Безье
      for (const point of curve) {
        // Проходим по точкам кривой
        // Проверяем, близка ли точка к координатам клика
        if (Math.hypot(point.x - x, point.y - y) < 10) {
          return point; // Возвращаем найденную точку, если расстояние от нее меньше 10 пикселей
        }
      }
    }
    return null; // Если точка не найдена, возвращаем null
  }

  // Метод для рисования кривой Безье на холсте
  drawBezier(curve) {
    if (curve.length < 3) return; // Для кривой Безье нужно минимум 3 точки

    const [p0, p1, p2] = curve; // Извлекаем 3 контрольные точки

    this.ctx.beginPath(); // Начинаем рисование
    this.ctx.moveTo(p0.x, p0.y); // Перемещаемся в первую точку кривой
    this.ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y); // Рисуем кривую Безье второго порядка
    this.ctx.strokeStyle = this.colorPicker.value; // Устанавливаем цвет линии
    this.ctx.lineWidth = this.thicknessRange.value; // Устанавливаем толщину линии
    this.ctx.stroke(); // Рисуем линию
    this.ctx.closePath(); // Закрываем путь

    // Если активен режим рисования кривых Безье, рисуем контрольные точки
    if (this.drawingBezier) {
      this.ctx.fillStyle = "red"; // Цвет для контрольных точек
      [p0, p1, p2].forEach((point) => {
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2); // Рисуем круг вокруг точки
        this.ctx.fill();
        this.ctx.closePath();
      });
    }
  }

  // Метод для переключения между режимом заливки и рисования
  toggleFillMode() {
    this.filling = !this.filling; // Переключаем режим заливки
    this.fillBtn.textContent = this.filling ? "Режим рисования" : "Заливка"; // Обновляем текст кнопки

    // Сохраняем или восстанавливаем состояние канваса в зависимости от режима
    if (this.filling) {
      this.saveCanvasState(); // Сохраняем состояние канваса
    } else {
      this.restoreCanvasState(); // Восстанавливаем сохраненное состояние канваса
    }
  }

  // Метод для сохранения текущего состояния канваса
  saveCanvasState() {
    this.savedImageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    ); // Сохраняем текущее изображение
  }

  // Метод для восстановления сохраненного состояния канваса
  restoreCanvasState() {
    if (this.savedImageData) {
      this.ctx.putImageData(this.savedImageData, 0, 0); // Восстанавливаем сохраненные данные на канвасе
    }
  }

  // Метод для выполнения заливки области на холсте
  fillArea(e) {
    const x = e.clientX - this.canvas.offsetLeft; // Получаем координату X клика
    const y = e.clientY - this.canvas.offsetTop; // Получаем координату Y клика
    const fillColor = this.hexToRgb(this.colorPicker.value); // Преобразуем выбранный цвет в RGB

    // Получаем данные пикселей с временного холста
    const imageData = this.drawingCtx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    const targetColor = this.getPixelColor(imageData, x, y); // Получаем цвет пикселя по координатам клика
    if (this.colorsMatch(targetColor, fillColor)) return; // Если цвет пикселя уже совпадает с цветом заливки, выходим

    // Выполняем заливку
    this.floodFill(imageData, x, y, targetColor, fillColor);

    // Обновляем данные временного холста и основного канваса
    this.drawingCtx.putImageData(imageData, 0, 0);
    this.updateMainCanvas();

    // Сохраняем состояние канваса после заливки, чтобы оно не сбрасывалось
    this.saveCanvasState();
  }

  // Метод для получения цвета пикселя по координатам (x, y)
  getPixelColor(imageData, x, y) {
    const index = (y * imageData.width + x) * 4; // Рассчитываем индекс пикселя в массиве данных
    const data = imageData.data;
    return [data[index], data[index + 1], data[index + 2], data[index + 3]]; // Возвращаем цвет в формате [R, G, B, A]
  }

  // Метод для проверки, совпадают ли два цвета
  colorsMatch(color1, color2) {
    return color1.every((value, i) => value === color2[i]); // Проверяем, совпадают ли все компоненты цвета
  }

  // Алгоритм заливки (алгоритм "заливки через область")
  floodFill(imageData, x, y, targetColor, fillColor) {
    const stack = [[x, y]]; // Стек для обработки пикселей
    const { width, height, data } = imageData; // Получаем данные изображения
    const visit = new Array(width * height).fill(false); // Массив для отслеживания посещенных пикселей

    // Процесс заливки с помощью стека
    while (stack.length) {
      const [currentX, currentY] = stack.pop(); // Извлекаем пиксель из стека
      const index = (currentY * width + currentX) * 4;
      if (
        visit[currentY * width + currentX] || // Если пиксель уже посещен или не совпадает с целевым цветом
        !this.colorsMatch(
          [data[index], data[index + 1], data[index + 2], data[index + 3]],
          targetColor
        )
      ) {
        continue;
      }

      visit[currentY * width + currentX] = true; // Отметить пиксель как посещенный
      data[index] = fillColor[0]; // Устанавливаем цвет заливки
      data[index + 1] = fillColor[1];
      data[index + 2] = fillColor[2];
      data[index + 3] = 255; // Устанавливаем непрозрачность

      // Добавляем соседние пиксели в стек
      if (currentX > 0) stack.push([currentX - 1, currentY]);
      if (currentX < width - 1) stack.push([currentX + 1, currentY]);
      if (currentY > 0) stack.push([currentX, currentY - 1]);
      if (currentY < height - 1) stack.push([currentX, currentY + 1]);
    }
  }

  // Преобразование цвета из HEX в RGB
  hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16); // Убираем знак # и конвертируем в число
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]; // Возвращаем массив RGB
  }

  // Метод для сохранения изображения канваса в файл
  saveImage() {
    const link = document.createElement("a"); // Создаем ссылку для скачивания
    link.download = "canvas.png"; // Устанавливаем имя файла
    link.href = this.canvas.toDataURL("image/png"); // Получаем данные изображения в формате PNG
    link.click(); // Имитируем клик по ссылке для скачивания
  }

  // Метод для загрузки изображения на канвас
  uploadImage(e) {
    const file = e.target.files[0]; // Получаем файл из события
    if (!file) return; // Если файл не выбран, выходим
    const reader = new FileReader(); // Создаем новый объект FileReader
    reader.onload = (event) => {
      const img = new Image(); // Создаем объект изображения
      img.onload = () => {
        // Когда изображение загружено, рисуем его на канвасе
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawingCtx.clearRect(
          0,
          0,
          this.drawingCanvas.width,
          this.drawingCanvas.height
        );
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height); // Рисуем изображение
        this.backgroundImage = img; // Сохраняем изображение для использования в качестве фона
        this.updateMainCanvas(); // Обновляем основной канвас
      };
      img.src = event.target.result; // Устанавливаем источник изображения
    };
    reader.readAsDataURL(file); // Читаем файл как Data URL
  }

  // Метод для переключения между режимом стирания и рисования
  toggleEraser() {
    this.erasing = !this.erasing; // Переключаем режим стирания
    this.eraseBtn.textContent = this.erasing
      ? "Режим рисования" // Если активен режим стирания, показываем "Режим рисования"
      : "Режим стирания"; // Иначе показываем "Режим стирания"
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
