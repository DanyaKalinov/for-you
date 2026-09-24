(() => {
  "use strict";

  const canvas = document.getElementById("particles");
  const ctx = canvas.getContext("2d", { alpha: true });
  const bar = document.getElementById("progress");
  const counter = document.getElementById("counter");
  const loader = document.getElementById("loader");
  const hint = document.getElementById("scrollHint");
  const replayBtn = document.getElementById("replayBtn");

  let W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  let targetP = 0, p = 0, time = 0;
  const TAU = Math.PI * 2;

  const N = W < 768 ? 4000 : 7000;
  const P = [];
  const fireworks = [];
  const starSparks = [];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
  const rand = (a, b) => a + Math.random() * (b - a);

  function resize() {
    W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function pointHeart() {
    const t = Math.random() * TAU;
    const edge = Math.pow(Math.random(), 0.35);
    const scaleFactor = Math.min(W, H) / 38;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x: x * edge * scaleFactor, y: -y * edge * scaleFactor };
  }

  function pointStar() {
    const a = Math.floor(Math.random() * 5) * TAU / 5 + rand(-.06, .06);
    const r = Math.pow(Math.random(), .6) * Math.min(W, H) * .28;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }

  function pointCakeAndPetals() {
    const part = Math.random();
    const scale = Math.min(W, H) * 0.35;
    if (part < 0.45) {
      return { x: rand(-scale * 0.4, scale * 0.4), y: rand(0, scale * 0.3) };
    } else if (part < 0.7) {
      return { x: rand(-scale * 0.28, scale * 0.28), y: rand(-scale * 0.2, 0) };
    } else if (part < 0.8) {
      const candleX = (Math.floor(rand(0, 3)) - 1) * scale * 0.15;
      return { x: candleX + rand(-scale * 0.02, scale * 0.02), y: rand(-scale * 0.35, -scale * 0.2) };
    } else if (part < 0.88) {
      const candleX = (Math.floor(rand(0, 3)) - 1) * scale * 0.15;
      return { x: candleX + rand(-scale * 0.03, scale * 0.03), y: rand(-scale * 0.42, -scale * 0.35) };
    } else {
      const ang = Math.random() * TAU;
      const dist = rand(scale * 0.5, scale * 1.1);
      return { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist };
    }
  }

  for (let i = 0; i < N; i++) {
    const a = Math.random() * TAU, r = Math.pow(Math.random(), .55) * Math.min(W, H) * .7;
    P.push({
      rnd: { x: Math.cos(a) * r, y: Math.sin(a) * r },
      heart: pointHeart(), 
      star: pointStar(),
      cake: pointCakeAndPetals(),
      z: Math.random(), 
      size: rand(0.8, 1.8), 
      phase: Math.random() * TAU, 
      speed: rand(.3, 1.1)
    });
  }

  function morph(a, b, t) { 
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }; 
  }

  function target(part, i) {
    if (p < 0.8) return morph(part.rnd, part.heart, smooth(clamp(p / 0.8, 0, 1)));
    if (p < 2.4) return part.heart;
    if (p < 3.2) return morph(part.heart, part.star, smoother(clamp((p - 2.4) / 0.8, 0, 1)));
    if (p < 4.8) return morph(part.star, part.cake, smoother(clamp((p - 3.2) / 1.6, 0, 1)));
    return part.cake;
  }

  function palette() {
    if (p < 1.6) return [110, 190, 255];
    if (p < 2.8) return [255, 110, 180];
    if (p < 4.2) return [170, 130, 255];
    if (p < 5.2) return [255, 190, 100];
    return [255, 120, 200];
  }

  function cinematicScroll() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    targetP = (scrollY / max) * 6;
    p += (targetP - p) * 0.08;
  }

  // Отрисовка идеально чистого и резкого текста для любой сцены
  function drawCleanText(lines, fontSize, color, alpha = 1) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;

    const isMobile = W < 600;
    const maxW = W * 0.92;
    
    ctx.font = `800 ${fontSize}px "Manrope", "Arial Black", sans-serif`;

    // Авто-подгонка под ширину мобильного экрана
    let adjustedFont = fontSize;
    lines.forEach(line => {
      const w = ctx.measureText(line).width;
      if (w > maxW) {
        const r = maxW / w;
        adjustedFont = Math.floor(adjustedFont * r);
      }
    });

    ctx.font = `800 ${adjustedFont}px "Manrope", "Arial Black", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    const lh = adjustedFont * 1.35;
    const startY = H / 2 - ((lines.length - 1) * lh) / 2;

    lines.forEach((line, idx) => {
      ctx.fillText(line, W / 2, startY + idx * lh);
    });

    ctx.restore();
  }

  function renderSceneTexts() {
    const isMobile = W < 600;

    // Сцена 1 (p: 0 - 0.8)
    if (p < 0.8) {
      const a = clamp(p / 0.6, 0, 1) * clamp((0.8 - p) / 0.2, 0, 1);
      drawCleanText(["ПРИВЕТ ЛЮБИМАЯ", "СЕГОДНЯ", "ОСОБЕННЫЙ ДЕНЬ"], isMobile ? 26 : 42, "#6ee7b7", a);
    }
    // Сцена 2 (p: 0.8 - 1.6)
    else if (p < 1.6) {
      const a = clamp((p - 0.8) / 0.3, 0, 1) * clamp((1.6 - p) / 0.3, 0, 1);
      drawCleanText(["ТЫ МОЁ САМОЕ", "ЛЮБИМОЕ ЧУДО"], isMobile ? 28 : 46, "#38bdf8", a);
    }
    // Сцена 3 (Сердце без перекрытия текстом)
    // Сцена 4 (Комплименты 6 строк) - ТЕПЕРЬ 100% ЧИТАЕМЫЙ И КРАСИВЫЙ ТЕКСТ!
    else if (p >= 2.4 && p < 3.2) {
      const a = clamp((p - 2.4) / 0.25, 0, 1) * clamp((3.2 - p) / 0.25, 0, 1);
      const lines = [
        "ТВОЯ УЛЫБКА МЕНЯЕТ ВСЁ ВОКРУГ",
        "ОБОЖАЮ ТВОЙ НЕЖНЫЙ ВЗГЛЯД",
        "С ТОБОЙ НЕВЕРОЯТНО ТЕПЛО",
        "ТЫ ВДОХНОВЛЯЕШЬ МЕНЯ КАЖДЫЙ ДЕНЬ",
        "РЯДОМ С ТОБОЙ ВСЁ СТАНОВИТСЯ ЯРЧЕ",
        "В ЭТОТ ДЕНЬ РОДИЛАСЬ МОЯ ВСЕЛЕННАЯ"
      ];
      drawCleanText(lines, isMobile ? 18 : 26, "#f472b6", a);
    }
    // Сцена 5 (p: 3.2 - 4.0)
    else if (p >= 3.2 && p < 4.0) {
      const a = clamp((p - 3.2) / 0.25, 0, 1) * clamp((4.0 - p) / 0.25, 0, 1);
      drawCleanText(["ТЫ", "НЕВЕРОЯТНАЯ"], isMobile ? 42 : 68, "#c084fc", a);
    }
    // Сцена 6 (p: 4.0 - 4.8)
    else if (p >= 4.0 && p < 4.8) {
      const a = clamp((p - 4.0) / 0.25, 0, 1) * clamp((4.8 - p) / 0.25, 0, 1);
      drawCleanText(["В ЭТОТ ДЕНЬ", "РОДИЛАСЬ МОЯ", "ВСЕЛЕННАЯ"], isMobile ? 28 : 44, "#fbbf24", a);
    }
    // Сцена 7 (Финал)
    else if (p >= 5.4) {
      const a = clamp((p - 5.4) / 0.3, 0, 1);
      const lines = isMobile 
        ? ["С ДНЁМ РОЖДЕНИЯ", "ЛАТУЛЯ", "Я ЛЮБЛЮ ТЕБЯ", "МОЁ СОЛНЫШКО"] 
        : ["С ДНЁМ РОЖДЕНИЯ ЛАТУЛЯ", "Я ЛЮБЛЮ ТЕБЯ МОЁ СОЛНЫШКО"];
      drawCleanText(lines, isMobile ? 24 : 40, "#f43f5e", a);
    }
  }

  function drawFinalHeartEffect() {
    if (p < 1.6 || p > 2.4) return;
    
    const alpha = clamp((p - 1.6) / 0.25, 0, 1) * clamp((2.4 - p) / 0.25, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;

    const cx = W / 2, cy = H / 2;
    const pulse = 1 + Math.sin(time * 3) * 0.03;

    ctx.font = `italic 500 ${Math.round(Math.min(W / 9, 44))}px 'Cormorant Garamond', serif`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#f472b6";
    ctx.shadowBlur = 20;
    ctx.fillText("I Love You", cx, cy);

    ctx.restore();
  }

  function spawnFirework() {
    if (p > 5.55 && Math.random() < 0.12) {
      const x = rand(W * 0.05, W * 0.95);
      const y = rand(H * 0.08, H * 0.92);
      const count = Math.floor(rand(20, 40));
      const color = [rand(140, 255), rand(120, 255), rand(160, 255)];

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * TAU;
        const spd = rand(1.2, 4.2);
        fireworks.push({
          x, y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          alpha: rand(0.7, 0.95),
          color,
          size: rand(1.0, 2.2)
        });
      }
    }
  }

  function updateAndDrawFireworks() {
    if (p <= 5.45) { fireworks.length = 0; return; }
    
    for (let i = fireworks.length - 1; i >= 0; i--) {
      const f = fireworks[i];
      f.x += f.vx;
      f.y += f.vy;
      f.vy += 0.025;
      f.alpha -= 0.016;

      if (f.alpha <= 0) {
        fireworks.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(${f.color[0]},${f.color[1]},${f.color[2]},${f.alpha})`;
      ctx.arc(f.x, f.y, f.size, 0, TAU);
      ctx.fill();
    }
  }

  window.addEventListener("pointerdown", (e) => {
    if (e.target.closest("#replayBtn")) return;

    const x = e.clientX;
    const y = e.clientY;
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * TAU;
      const spd = rand(2, 5);
      starSparks.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 1,
        alpha: 1,
        size: rand(1.2, 2.5)
      });
    }
  });

  function updateAndDrawStarSparks() {
    for (let i = starSparks.length - 1; i >= 0; i--) {
      const s = starSparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.08;
      s.alpha -= 0.025;

      if (s.alpha <= 0) {
        starSparks.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 240, 180, ${s.alpha})`;
      ctx.arc(s.x, s.y, s.size, 0, TAU);
      ctx.fill();
    }
  }

  replayBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function frame() {
    time += .008;
    cinematicScroll();
    ctx.clearRect(0, 0, W, H);

    const idx = clamp(Math.round(p), 0, 6);
    bar.style.width = (clamp(p / 6, 0, 1) * 100) + "%";
    counter.textContent = String(idx + 1).padStart(2, "0") + " / 07";
    
    if (idx === 6) {
      hint.style.opacity = "0";
      replayBtn.classList.add("visible");
    } else {
      hint.style.opacity = "1";
      replayBtn.classList.remove("visible");
    }

    const col = palette(), cx = W / 2, cy = H / 2;

    // Отрисовка фонового волшебного облака частиц
    for (let i = 0; i < P.length; i++) {
      const part = P[i], q = target(part, i);
      const driftX = Math.sin(time * part.speed + part.phase) * 0.6;
      const driftY = Math.cos(time * part.speed * .7 + part.phase) * 0.6;
      
      const x = cx + (q.x + driftX);
      const y = cy + (q.y + driftY);
      const a = 0.25 + 0.45 * Math.sin(time * 2 + part.phase);

      ctx.beginPath();
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
      ctx.arc(x, y, part.size, 0, TAU);
      ctx.fill();
    }

    // Рендер безупречно чёткого текста и спецеффектов
    renderSceneTexts();
    drawFinalHeartEffect();

    spawnFirework();
    updateAndDrawFireworks();
    updateAndDrawStarSparks();

    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      resize();
      setTimeout(() => loader.classList.add("hide"), 300);
      frame();
    });
  } else {
    resize();
    setTimeout(() => loader.classList.add("hide"), 500);
    frame();
  }
})();
