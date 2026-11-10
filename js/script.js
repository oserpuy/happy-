/* ============================================================
   B-DAY — Personal Birthday Site Script
   Шрифты: Playfair Display + Manrope | PIN-код, плеер, reveal
   ============================================================ */

// ==================== НАСТРОЙКИ (изменяй здесь) ====================
const PIN_CODE = "2026"; // ← СМЕНИ на свой секретный код!
// ====================================================================

document.addEventListener("DOMContentLoaded", () => {
  initPinScreen();
  initMusicPlayer();
  initScrollReveal();
});

/* ----------------------------------------------------------------
   1. PIN-ЭКРАН: логика ввода и проверки кода
------------------------------------------------------------------- */
function initPinScreen() {
  const boxes = document.querySelectorAll(".pin-box");
  const loginBtn = document.getElementById("loginBtn");
  const errorEl = document.getElementById("pinError");
  const card = document.querySelector(".pin-card");

  if (!boxes.length) return;

  // Автофокус на первом поле
  boxes[0].focus();

  boxes.forEach((box, i) => {
    // Набираем цифру → переходим к следующему полю
    box.addEventListener("input", () => {
      // Оставляем только цифры
      box.value = box.value.replace(/\D/g, "");
      if (box.value && i < boxes.length - 1) {
        boxes[i + 1].focus();
      }
    });

    // Backspace: если поле пустое — очищаем и уходим назад
    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && i > 0) {
        boxes[i - 1].value = "";
        boxes[i - 1].focus();
      }
      // Enter — попробовать войти
      if (e.key === "Enter") tryLogin();
    });

    // Клик по следующему полю — можно редактировать предыдущее
    box.addEventListener("click", () => {
      errorEl.textContent = "";
    });
  });

  loginBtn.addEventListener("click", tryLogin);

  function getCode() {
    return Array.from(boxes).map((b) => b.value).join("");
  }

  function tryLogin() {
    const code = getCode();

    if (code.length !== PIN_CODE.length) {
      errorEl.textContent = "Введите все цифры кода 🤫";
      card.classList.remove("shake");
      void card.offsetWidth; // перезапуск CSS-анимации
      card.classList.add("shake");
      return;
    }

    if (code === PIN_CODE) {
      unlockSite();
    } else {
      errorEl.textContent = "Неверный код… попробуй ещё раз 🙈";
      card.classList.remove("shake");
      void card.offsetWidth;
      card.classList.add("shake");

      // Очистка через 500 мс после тряски
      setTimeout(() => {
        boxes.forEach((b) => (b.value = ""));
        boxes[0].focus();
      }, 500);
    }
  }

  function unlockSite() {
    const authScreen = document.getElementById("authScreen");
    authScreen.classList.add("is-hidden");

    // Запускаем музыку после короткой паузы (браузеры разрешают автоплей)
    setTimeout(() => {
      if (audioPlayer) {
        audioPlayer.play().catch(() => {});
      }
    }, 800);
  }
}

/* ----------------------------------------------------------------
   2. МУЗЫКАЛЬНЫЙ ПЛЕЕР: play/pause, прогресс-бар, перемотка
------------------------------------------------------------------- */
let audioPlayer = null;

function initMusicPlayer() {
  const playBtn      = document.getElementById("playBtn");
  const musicToggle  = document.getElementById("musicToggle");
  const progressFill = document.getElementById("progressFill");
  const progressBar  = document.getElementById("progressBar");
  const timeCurrent  = document.getElementById("timeCurrent");
  const timeTotal    = document.getElementById("timeTotal");
  const audioHint    = document.getElementById("audioHint");
  const bgMusic      = document.getElementById("bgMusic");

  // Используем <audio> из HTML (src уже прописан)
  if (bgMusic) {
    audioPlayer = bgMusic;
  } else {
    return;
  }

  function formatTime(sec) {
    if (!sec || isNaN(sec)) return "–:––";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function setPlaying(isOn) {
    document.getElementById("player").classList.toggle("is-playing", isOn);
    if (musicToggle) musicToggle.classList.toggle("is-on", isOn);
    playBtn.setAttribute("aria-pressed", String(isOn));
  }

  // Toggle play/pause из виджета плеера
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (audioPlayer.paused) audioPlayer.play().catch(showHint);
      else audioPlayer.pause();
    });
  }

  // Кнопка в навбаре — тоже toggle
  if (musicToggle) {
    musicToggle.addEventListener("click", () => {
      if (audioPlayer.paused) audioPlayer.play().catch(showHint);
      else audioPlayer.pause();
    });
  }

  function showHint() {
    if (audioHint) audioHint.hidden = false;
  }

  // Статус воспроизведения
  audioPlayer.addEventListener("play", () => setPlaying(true));
  audioPlayer.addEventListener("pause", () => setPlaying(false));
  audioPlayer.addEventListener("ended", () => setPlaying(false));

  // Прогресс-бар: обновление + перемотка кликом
  if (progressBar) {
    progressBar.addEventListener("click", (e) => {
      const rect = progressBar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (!isNaN(audioPlayer.duration)) {
        audioPlayer.currentTime = percent * audioPlayer.duration;
      }
    });
  }

  // Обновление прогресса и времени
  audioPlayer.addEventListener("timeupdate", () => {
    const dur = audioPlayer.duration || 1;
    const pct = (audioPlayer.currentTime / dur) * 100;
    if (progressFill) progressFill.style.width = isNaN(pct) ? "0%" : pct + "%";
    if (timeCurrent) timeCurrent.textContent = formatTime(audioPlayer.currentTime);
  });

  // Длительность трека
  audioPlayer.addEventListener("loadedmetadata", () => {
    if (timeTotal) timeTotal.textContent = formatTime(audioPlayer.duration);
  });

  // Если файл не найден — подсказка
  audioPlayer.addEventListener("error", showHint);

  setPlaying(false);
}

/* ----------------------------------------------------------------
   3. SCROLL REVEAL: плавное появление блоков при скролле
------------------------------------------------------------------- */
function initScrollReveal() {
  const items = document.querySelectorAll("[data-reveal]");

  if (!items.length) return;

  // Fallback: если IntersectionObserver нет — показываем сразу
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target); // анимируем только один раз
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
  );

  items.forEach((el) => observer.observe(el));
}

/* ----------------------------------------------------------------
   4. Кнопки в hero-блоке
------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  const readLetterBtn = document.getElementById("readLetterBtn");
  const jumpLetterBtn = document.getElementById("jumpLetterBtn");
  const letterSection = document.getElementById("letter");

  if (readLetterBtn && letterSection) {
    readLetterBtn.addEventListener("click", () =>
      letterSection.scrollIntoView({ behavior: "smooth" })
    );
  }
  if (jumpLetterBtn && letterSection) {
    jumpLetterBtn.addEventListener("click", () =>
      letterSection.scrollIntoView({ behavior: "smooth" })
    );
  }
});
