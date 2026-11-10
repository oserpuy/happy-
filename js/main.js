/* ============================================
   B-DAY — Personal Birthday Site
   JavaScript: PIN, music player, particles,
   wish candle, scroll progress, nav highlighting,
   story photos, scroll reveal
   ============================================ */

// ==================== CONFIG (edit to customize) ====================
const SECRET_PIN = "1111"; // ← change this!
const MUSIC_SOURCES = [
  {
    src: "assets/audio/birthday-song.mp3",
    title: "Our Song"
  },
  {
    src: "https://cdn.pixabay.com/download/audio/2022-03-10/audio_c8c8a73467.mp3?filename=romantic-piano-slow-tender-ballad-love-song-129525.mp3",
    title: "Romantic Piano (Pixabay)"
  }
];

// ==================== PIN SCREEN ====================
const pinScreen = document.getElementById("pin-screen");
const pinInputs = [...document.querySelectorAll(".pin-digit")];
const pinError = document.getElementById("pin-error");
const pinCard = document.querySelector(".pin-card");
let isUnlocking = false;

function initPin() {
  if (!pinInputs.length) return;

  pinInputs.forEach((input, index) => {
    // Каждое поле — строго одна цифра
    input.maxLength = 1;
    input.setAttribute("maxlength", "1");

    input.addEventListener("focus", () => input.select());
    input.addEventListener("click", () => input.select());

    input.addEventListener("input", () => {
      if (isUnlocking) return;

      // Оставляем только первую цифру (защита от вставки/автозаполнения)
      const digit = (input.value.match(/\d/) || [""])[0];
      input.value = digit;
      input.classList.toggle("is-filled", Boolean(digit));
      pinError.textContent = "";

      if (!digit) return;

      // Автоматически переходим к следующему квадрату
      if (index < pinInputs.length - 1) {
        pinInputs[index + 1].focus();
      }

      // Последняя цифра — сразу проверяем код
      const code = getPinCode();
      if (code.length === pinInputs.length) {
        tryUnlock(code);
      }
    });

    input.addEventListener("keydown", event => {
      if (isUnlocking) return;

      if (event.key === "Backspace") {
        event.preventDefault();

        if (input.value) {
          // Стираем текущую цифру
          input.value = "";
          input.classList.remove("is-filled");
        } else if (index > 0) {
          // Поле пустое — возвращаемся назад и стираем предыдущую цифру
          const previous = pinInputs[index - 1];
          previous.value = "";
          previous.classList.remove("is-filled");
          previous.focus();
        }

        pinError.textContent = "";
        return;
      }

      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        pinInputs[index - 1].focus();
        return;
      }

      if (event.key === "ArrowRight" && index < pinInputs.length - 1) {
        event.preventDefault();
        pinInputs[index + 1].focus();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        tryUnlock(getPinCode());
        return;
      }

      // Разрешаем только цифры и служебные клавиши
      if (
        event.key.length === 1 &&
        !/^\d$/.test(event.key) &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
      }
    });

    // Вставка всего кода сразу
    input.addEventListener("paste", event => {
      if (isUnlocking) return;
      event.preventDefault();

      const clipboard = event.clipboardData || window.clipboardData;
      if (!clipboard) return;

      const pasted = clipboard
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, pinInputs.length - index);

      if (!pasted) return;

      pasted.split("").forEach((digit, offset) => {
        const box = pinInputs[index + offset];
        if (!box) return;
        box.value = digit;
        box.classList.add("is-filled");
      });

      const nextIndex = Math.min(index + pasted.length, pinInputs.length - 1);
      pinInputs[nextIndex].focus();

      const code = getPinCode();
      if (code.length === pinInputs.length) {
        tryUnlock(code);
      }
    });
  });
}

function getPinCode() {
  return pinInputs.map(input => input.value).join("");
}

function clearPin() {
  pinInputs.forEach(input => {
    input.value = "";
    input.classList.remove("is-filled");
  });
}

function shakePinCard() {
  if (!pinCard) return;
  pinCard.classList.remove("shake");
  void pinCard.offsetWidth;
  pinCard.classList.add("shake");
  pinCard.addEventListener("animationend", () => {
    pinCard.classList.remove("shake");
  }, { once: true });
}

function tryUnlock(value) {
  if (isUnlocking) return;

  if (value.length !== pinInputs.length) {
    pinError.textContent = "Введи все четыре цифры";
    shakePinCard();
    const firstEmpty = pinInputs.find(input => !input.value);
    firstEmpty?.focus();
    return;
  }

  if (value === SECRET_PIN) {
    isUnlocking = true;
    pinError.textContent = "";
    pinScreen.classList.add("is-unlocking");
    document.body.classList.remove("pin-locked");

    // Плавно убираем экран и запускаем конфетти
    setTimeout(() => {
      pinScreen.remove();
      fireConfetti();
    }, 900);
    return;
  }

  pinError.textContent = "Неверный код. Попробуй ещё раз";
  clearPin();
  shakePinCard();
  pinInputs[0]?.focus();
}

// ==================== MUSIC PLAYER ====================
let currentTrackIndex = 0;
let isPlaying = false;
let seeking = false;
const audio = document.getElementById("bgMusic");
const playBtn = document.getElementById("play-btn");
const progressBar = document.getElementById("progress-bar");
const timeDisplay = document.getElementById("time-display");
const trackName = document.getElementById("track-name");
const playerWidget = document.getElementById("player");
const playerToggle = document.getElementById("player-toggle");
const widePlayerQuery = window.matchMedia("(min-width: 1361px)");

function setPlayerOpen(open) {
  if (!playerWidget || !playerToggle) return;

  playerWidget.classList.toggle("is-open", open);
  playerToggle.setAttribute("aria-expanded", String(open));
  playerToggle.setAttribute("aria-label", open ? "Закрыть музыкальный плеер" : "Открыть музыкальный плеер");
}

function initPlayerToggle() {
  if (!playerWidget || !playerToggle) return;

  // На широких экранах плеер открыт сразу, на телефонах — спрятан
  setPlayerOpen(widePlayerQuery.matches);

  playerToggle.addEventListener("click", () => {
    setPlayerOpen(!playerWidget.classList.contains("is-open"));
  });

  // Esc закрывает карточку плеера на телефоне
  document.addEventListener("keydown", event => {
    if (
      event.key === "Escape" &&
      !widePlayerQuery.matches &&
      playerWidget.classList.contains("is-open")
    ) {
      setPlayerOpen(false);
      playerToggle.focus();
    }
  });
}

function getCurrentTrack() {
  return MUSIC_SOURCES[currentTrackIndex] || MUSIC_SOURCES[0];
}

function updatePlayBtn() {
  if (!playBtn) return;
  const iconPlay = playBtn.querySelector(".icon-play");
  const iconPause = playBtn.querySelector(".icon-pause");
  if (!iconPlay || !iconPause) return;

  iconPlay.style.display = isPlaying ? "none" : "block";
  iconPause.style.display = isPlaying ? "block" : "none";
  playBtn.setAttribute("aria-pressed", String(isPlaying));
}

async function togglePlay() {
  if (!audio) {
    console.warn("Audio element #bgMusic not found");
    return;
  }

  // Пауза
  if (!audio.paused) {
    audio.pause();
    return;
  }

  // Если источник ещё не задан или предыдущий не загрузился — берём текущий трек
  if (!audio.getAttribute("src") || audio.error) {
    audio.src = getCurrentTrack().src;
  }

  if (trackName) trackName.textContent = getCurrentTrack().title;

  try {
    await audio.play();
  } catch (error) {
    console.warn("Audio play error:", error);

    // Локальный файл не найден — один раз пробуем резервный источник
    if (currentTrackIndex < MUSIC_SOURCES.length - 1) {
      currentTrackIndex += 1;
      audio.src = getCurrentTrack().src;
      if (trackName) trackName.textContent = getCurrentTrack().title;

      try {
        await audio.play();
      } catch (fallbackError) {
        console.warn("Audio fallback error:", fallbackError);
        if (trackName) trackName.textContent = "Не удалось загрузить трек";
      }
    } else if (trackName) {
      trackName.textContent = "Не удалось загрузить трек";
    }
  }
}

function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updateProgress() {
  if (!audio) return;
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;

  if (duration > 0 && !seeking && progressBar) {
    progressBar.value = (audio.currentTime / duration) * 100;
  }

  if (timeDisplay) {
    timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(duration)}`;
  }
}

function initPlayer() {
  if (!playBtn || !audio) {
    console.warn("Player markup is incomplete");
    return;
  }

  playBtn.addEventListener("click", togglePlay);

  audio.addEventListener("play", () => {
    isPlaying = true;
    updatePlayBtn();
    playerWidget?.classList.add("playing");
    playerToggle?.classList.add("is-playing");
    if (trackName) trackName.textContent = getCurrentTrack().title;
  });

  audio.addEventListener("pause", () => {
    isPlaying = false;
    updatePlayBtn();
    playerWidget?.classList.remove("playing");
    playerToggle?.classList.remove("is-playing");
  });

  audio.addEventListener("ended", () => {
    isPlaying = false;
    updatePlayBtn();
    playerWidget?.classList.remove("playing");
    playerToggle?.classList.remove("is-playing");
    seeking = false;
    if (progressBar) progressBar.value = 0;
    if (timeDisplay) timeDisplay.textContent = "0:00 / 0:00";
    if (trackName) trackName.textContent = "Press play again…";
  });

  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("loadedmetadata", updateProgress);

  // Если локальный файл не загрузился — подставляем резервный трек
  audio.addEventListener("error", () => {
    console.warn("Audio source error:", audio.currentSrc || audio.src);

    if (currentTrackIndex < MUSIC_SOURCES.length - 1) {
      const wasPlaying = !audio.paused;
      currentTrackIndex += 1;
      audio.src = getCurrentTrack().src;
      if (trackName) trackName.textContent = getCurrentTrack().title;
      if (wasPlaying) {
        audio.play().catch(err => console.warn("Audio fallback error:", err));
      }
    } else if (trackName) {
      trackName.textContent = "Не удалось загрузить трек";
    }
  });

  // Перемотка трека
  if (progressBar) {
    progressBar.addEventListener("input", () => {
      seeking = true;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (timeDisplay) {
        const preview = (parseFloat(progressBar.value) / 100) * duration;
        timeDisplay.textContent = `${formatTime(preview)} / ${formatTime(duration)}`;
      }
    });

    progressBar.addEventListener("change", () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (duration > 0) {
        audio.currentTime = (parseFloat(progressBar.value) / 100) * duration;
      }
      seeking = false;
    });
  }

  // Клик по обложке тоже запускает/останавливает музыку
  const artEl = playerWidget?.querySelector(".album-art");
  if (artEl) {
    artEl.style.cursor = "pointer";
    artEl.addEventListener("click", togglePlay);
  }

  if (audio.readyState >= 1) updateProgress();
  updatePlayBtn();
}

// ==================== FLOATING PARTICLES CANVAS ====================
const canvas = document.getElementById("particles");
let ctx, particles;

function initParticles() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  ctx = canvas.getContext("2d");

  const count = Math.min(70, Math.floor(innerWidth / 18));
  particles = Array.from({ length: count }, createParticle);

  animateParticles();

  window.addEventListener("resize", () => {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  });
}

function createParticle() {
  const size = Math.random() * 3 + 1;
  return {
    x: Math.random() * innerWidth,
    y: innerHeight + size,
    size,
    speedY: -(Math.random() * 0.6 + 0.2),
    driftX: (Math.random() - 0.5) * 0.4,
    alpha: Math.random() * 0.45 + 0.15,
    wobbleAmp: Math.random() * 30 + 10,
    wobbleFreq: Math.random() * 0.02 + 0.01,
    phase: Math.random() * Math.PI * 2,
    color: Math.random() > 0.5 ? "247,161,196" : "232,196,107",
    isHeart: false
  };
}

function animateParticles() {
  if (!ctx) return;
  ctx.clearRect(0, 0, innerWidth, innerHeight);

  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  particles.forEach(p => {
    p.phase += p.wobbleFreq;
    const wobbleX = Math.sin(p.phase) * p.wobbleAmp;
    p.y += p.speedY;
    p.x += p.driftX + Math.cos(p.phase * 2) * 0.3;

    if (p.y < -15 || p.x < -40 || p.x > innerWidth + 40) {
      Object.assign(p, createParticle());
    }

    ctx.save();
    ctx.globalAlpha = p.alpha;

    if (Math.random() < 0.02 && !p.isHeart) {
      // Occasionally draw a small heart instead of dot
      p.isHeart = true;
      const s = p.size * 1.6;
      ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
      ctx.beginPath();
      ctx.moveTo(p.x + wobbleX, p.y + s / 3);
      ctx.bezierCurveTo(p.x + wobbleX - s, p.y - s / 2, p.x + wobbleX - s / 4, p.y - s, p.x + wobbleX, p.y + s / 4);
      ctx.bezierCurveTo(p.x + wobbleX + s / 4, p.y - s, p.x + wobbleX + s, p.y - s / 2, p.x + wobbleX, p.y + s / 3);
      ctx.fill();
    } else {
      // Soft glowing dot
      const grad = ctx.createRadialGradient(
        p.x + wobbleX, p.y, 0,
        p.x + wobbleX, p.y, p.size * 2.5
      );
      grad.addColorStop(0, `rgba(${p.color}, ${p.alpha})`);
      grad.addColorStop(1, `rgba(${p.color}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x + wobbleX, p.y, p.size * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });

  requestAnimationFrame(animateParticles);
}

// ==================== SCROLL REVEAL (IntersectionObserver) ====================
function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "60px" });

  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
}

// ==================== SCROLL PROGRESS (vertical bar) ====================
const progressFill = document.getElementById("scroll-progress-fill");

function updateScrollProgress() {
  if (!progressFill) return;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
  progressFill.style.height = `${pct}%`;
}

// ==================== NAVBAR ACTIVE LINK (scroll spy) ====================
const navLinks = document.querySelectorAll(".nav-link");
const sections = [...document.querySelectorAll("section[id]")];

function initScrollSpy() {
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle("active",
            link.getAttribute("href") === `#${id}`);
        });
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px" });

  sections.forEach(sec => observer.observe(sec));
}

// ==================== PHOTO ROTATION (6 slides) ====================
const photoSlides = document.querySelectorAll(".moment-card .photo-frame img, .photo-slide");
let currentSlide = 0;

function rotatePhotos() {
  if (!photoSlides.length || photoSlides.length < 2) return;
  photoSlides.forEach((img, i) => {
    img.style.opacity = i === currentSlide ? "1" : "0";
    img.style.transform = i === currentSlide
      ? "scale(1)"
      : `translateY(${i > currentSlide ? "-30px" : "30px"}) scale(0.95)`;
  });
  currentSlide = (currentSlide + 1) % photoSlides.length;
}

// ==================== STORY PHOTOS ====================
function initStoryImages() {
  document.querySelectorAll(".story-image-container img").forEach(img => {
    const container = img.closest(".story-image-container");
    if (!container) return;

    const markState = () => {
      const hasImage = Boolean(img.getAttribute("src")) && img.naturalWidth > 0;
      container.classList.toggle("has-image", hasImage);
    };

    if (img.complete) markState();
    img.addEventListener("load", markState);
    img.addEventListener("error", () => container.classList.remove("has-image"));
  });
}

// ==================== WISH CANDLE (blow into microphone) ====================
function initWishCandle() {
  const candle = document.getElementById("candle");
  if (!candle) return;

  const stage = candle.closest(".wish-stage");
  const statusEl = document.getElementById("wish-status");
  const micBtn = document.getElementById("mic-btn");
  const blowBtn = document.getElementById("blow-btn");
  const breathMeter = document.getElementById("breath-meter");
  const breathLevel = document.getElementById("breath-level");

  let isOut = false;
  let listening = false;
  let stream = null;
  let audioCtx = null;
  let analyser = null;
  let source = null;
  let rafId = null;

  const setStatus = text => {
    if (statusEl) statusEl.textContent = text;
  };

  function burstSparks() {
    if (!stage) return;

    const stageRect = stage.getBoundingClientRect();
    const candleRect = candle.getBoundingClientRect();
    const originX = candleRect.left + candleRect.width / 2 - stageRect.left;
    const originY = candleRect.top + candleRect.height * 0.18;
    const colors = ["#ffd166", "#f7a1c4", "#fff3b0", "#e8c46b"];

    for (let i = 0; i < 22; i++) {
      const spark = document.createElement("span");
      spark.className = "wish-spark";
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 120;

      spark.style.left = `${originX}px`;
      spark.style.top = `${originY}px`;
      spark.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--ty", `${Math.sin(angle) * distance - 40}px`);
      spark.style.setProperty("--spark-color", colors[i % colors.length]);
      spark.style.setProperty("--spark-delay", `${Math.random() * 0.15}s`);
      spark.style.setProperty("--spark-duration", `${0.7 + Math.random() * 0.8}s`);

      stage.appendChild(spark);
      setTimeout(() => spark.remove(), 1800);
    }
  }

  function stopMic() {
    listening = false;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;

    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;

    if (source) {
      try { source.disconnect(); } catch (error) { /* already disconnected */ }
    }
    source = null;
    analyser = null;

    if (audioCtx && audioCtx.state !== "closed") {
      audioCtx.close().catch(() => {});
    }
    audioCtx = null;

    if (micBtn) {
      micBtn.classList.remove("is-listening");
      if (!isOut) micBtn.textContent = "Включить микрофон";
    }
    breathMeter?.classList.remove("is-visible");
    if (breathLevel) breathLevel.style.width = "0%";
  }

  function extinguish() {
    if (isOut) return;

    isOut = true;
    candle.classList.add("is-out");
    candle.setAttribute("aria-pressed", "true");
    setStatus("Желание загадано. Пусть оно обязательно сбудется.");
    stopMic();

    if (micBtn) {
      micBtn.disabled = true;
      micBtn.textContent = "Свеча задута";
    }
    if (blowBtn) blowBtn.textContent = "Зажечь снова";

    burstSparks();
  }

  function relight() {
    isOut = false;
    candle.classList.remove("is-out");
    candle.setAttribute("aria-pressed", "false");
    setStatus("Загадай желание…");

    if (micBtn) {
      micBtn.disabled = false;
      micBtn.textContent = "Включить микрофон";
    }
    if (blowBtn) blowBtn.textContent = "Задуть вручную";
  }

  candle.addEventListener("click", () => {
    if (!isOut) extinguish();
  });

  candle.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOut) extinguish();
    }
  });

  blowBtn?.addEventListener("click", () => {
    if (isOut) relight();
    else extinguish();
  });

  micBtn?.addEventListener("click", async () => {
    if (isOut) return;

    if (listening) {
      stopMic();
      setStatus("Микрофон выключен. Можно задуть свечу вручную.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Микрофон недоступен. Задуй свечу вручную.");
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true
        }
      });

      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) throw new Error("AudioContext is not supported");

      audioCtx = new AudioCtor();
      await audioCtx.resume();

      source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);

      listening = true;
      micBtn.classList.add("is-listening");
      micBtn.textContent = "Выключить микрофон";
      breathMeter?.classList.add("is-visible");
      setStatus("Просто дунь в микрофон — хватит даже лёгкого выдоха.");

      const floatData = new Float32Array(analyser.fftSize);
      const byteData = new Uint8Array(analyser.fftSize);
      let ambient = 0;
      let blowStartedAt = 0;
      let frames = 0;
      let peak = 0;

      const loop = () => {
        if (!listening || isOut || !analyser) return;

        let rms = 0;

        if (analyser.getFloatTimeDomainData) {
          analyser.getFloatTimeDomainData(floatData);
          for (let i = 0; i < floatData.length; i++) {
            rms += floatData[i] * floatData[i];
          }
          rms = Math.sqrt(rms / floatData.length);
        } else {
          analyser.getByteTimeDomainData(byteData);
          for (let i = 0; i < byteData.length; i++) {
            const value = (byteData[i] - 128) / 128;
            rms += value * value;
          }
          rms = Math.sqrt(rms / byteData.length);
        }

        frames++;
        if (frames === 1) ambient = rms;
        else ambient = ambient * 0.97 + rms * 0.03;

        // Сглаженный пик: короткий «пуф» тоже дойдёт до условия ниже
        peak = Math.max(rms, peak * 0.82);

        // Чувствительный порог: подстраивается под фон, но остаётся низким
        const threshold = Math.max(0.012, ambient * 1.6);

        if (breathLevel) {
          const level = Math.min(100, Math.max(0, (peak / (threshold * 3.2)) * 100));
          breathLevel.style.width = `${level}%`;
        }

        const now = performance.now();
        const isBlowing = peak > threshold;
        const isStrongPuff = peak > threshold * 2.2;

        if (isBlowing) {
          if (!blowStartedAt) blowStartedAt = now;

          const held = now - blowStartedAt;

          // Сильный короткий выдох — почти сразу, слабый — чуть дольше
          if (held > 160 || (isStrongPuff && held > 90)) {
            extinguish();
            return;
          }
        } else {
          blowStartedAt = 0;
        }

        rafId = requestAnimationFrame(loop);
      };

      loop();
    } catch (error) {
      console.warn("Microphone error:", error);
      stopMic();
      setStatus("Не получилось включить микрофон. Задуй свечу вручную.");
    }
  });

  window.addEventListener("beforeunload", stopMic);
}

// ==================== CONFETTI CELEBRATION ====================
function fireConfetti() {
  const colors = ["#f7a1c4", "#e8c46b", "#ffffff", "#ffb3d9"];
  for (let i = 0; i < 140; i++) {
    const el = document.createElement("div");
    el.style.cssText = `
      position: fixed;
      top: -25px;
      left: ${Math.random() * 100}vw;
      width: ${Math.random() * 9 + 6}px;
      height: ${Math.random() * 7 + 4}px;
      background: ${colors[i % colors.length]};
      border-radius: Math.random() > 0.5 ? "50%" : "2px";
      z-index: 9999;
      pointer-events: none;
      animation: confettiFall ${Math.random() * 3 + 3}s ease-in forwards;
      transform: rotate(${Math.random() * 360}deg);
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 7500);
  }

  if (!document.getElementById("confetti-style")) {
    const s = document.createElement("style");
    s.id = "confetti-style";
    s.textContent = `
      @keyframes confettiFall {
        to { transform: translateY(110vh) rotate(${Math.random() * 720}deg); opacity: 0; }
      }
    `;
    document.head.appendChild(s);
  }
}

// ==================== INIT ====================
window.addEventListener("DOMContentLoaded", () => {
  initPin();
  initPlayer();
  initPlayerToggle();
  initParticles();
  initReveal();
  initScrollSpy();
  initStoryImages();
  initWishCandle();

  // Scroll progress
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateScrollProgress();
        ticking = false;
      });
      ticking = true;
    }
  });
  updateScrollProgress();

  // Smooth scroll for nav links (offset for fixed navbar)
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        const y = target.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    });
  });

  // Focus first PIN digit on load
  setTimeout(() => pinInputs[0]?.focus(), 400);
});
