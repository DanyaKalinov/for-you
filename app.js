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

  const N = W < 600 ? 7000 : 10000;
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
    rebuildTargets();
  }

  // Сэмплирование текста с запасом высоты, чтобы ничего не обрезалось
  function sampleText(linesArray, targetFontPx, isComplimentsScene = false) {
    const isMobile = W < 600;
    const ow = Math.floor(Math.min(W * 0.94, 950));
    // Делаем канвас с запасом высоты
    const oh = Math.floor(Math.max(H * 0.95, 1000));
    const oc = document.createElement("canvas");
    oc.width = ow; oc.height = oh;
    const g = oc.getContext("2d", { willReadFrequently: true });
    
    let fontPx = targetFontPx;
    g.font = `900 ${fontPx}px "Manrope", "Arial Black", sans-serif`;

    // Подгонка по ширине
    linesArray.forEach(line => {
      if (!line) return;
      const metrics = g.measureText(line);
      if (metrics.width > ow) {
        const ratio = ow / metrics.width;
        fontPx = Math.floor(fontPx * ratio * 0.92);
      }
    });

    // Межстрочный интервал
    let lineHeight = fontPx * (isComplimentsScene ? 1.6 : 1.35);
    let totalHeight = linesArray.length * lineHeight;
    
    // Если по высоте превышает 75% экрана смартфона — аккуратно масштабируем
    const maxAllowedH = H * 0.75;
    if (totalHeight > maxAllowedH) {
      const ratio = maxAllowedH / totalHeight;
      fontPx = Math.floor(fontPx * ratio);
      lineHeight = fontPx * (isComplimentsScene ? 1.6 : 1.35);
    }

    g.font = `900 ${fontPx}px "Manrope", "Arial Black", sans-serif`;
    g.clearRect(0, 0, ow, oh);
    g.fillStyle = "#ffffff"; 
    g.textAlign = "center"; 
    g.textBaseline = "middle";

    const startY = oh / 2 - ((linesArray.length - 1) * lineHeight) / 2;

    linesArray.forEach((line, idx) => {
      if (line) {
        g.fillText(line, ow / 2, startY + idx * lineHeight);
      }
    });

    const data = g.getImageData(0, 0, ow, oh).data;
    const pts = [];

    // Плотный шаг частиц для отличной читаемости
    const step = isMobile ? (isComplimentsScene ? 1.3 : 1.6) : 1.7;

    for (let y = 0; y < oh; y += step) {
      for (let x = 0; x < ow; x += step) {
        if (data[Math.floor(y) * ow * 4 + Math.floor(x) * 4 + 3] > 80) {
          pts.push({ x: x - ow / 2, y: y - oh / 2 });
        }
      }
    }
    return pts;
  }

  // Контурное сердце
  function pointHeart() {
    const t = Math.random() * TAU;
    const edge = 0.88 + Math.random() * 0.12;
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

  let textTargets = [];
  function rebuildTargets() {
    const isMobile = W < 600;

    const configs = [
      // 0: Сцена 1
      { lines: ["ПРИВЕТ ЛЮБИМАЯ", "СЕГОДНЯ", "ОСОБЕННЫЙ ДЕНЬ"], size: isMobile ? 24 : 42 },
      // 1: Сцена 2
      { lines: ["ТЫ МОЁ САМОЕ", "ЛЮБИМОЕ ЧУДО"], size: isMobile ? 26 : 46 },
      
      // 2: Комплименты Часть 1 (2 комплимента)
      { 
        lines: isMobile ? [
          "ТВОЯ УЛЫБКА",
          "МЕНЯЕТ ВСЁ ВОКРУГ",
          "",
          "ОБОЖАЮ ТВОЙ",
          "НЕЖНЫЙ ВЗГЛЯД"
        ] : [
          "ТВОЯ УЛЫБКА МЕНЯЕТ ВСЁ ВОКРУГ",
          "ОБОЖАЮ ТВОЙ НЕЖНЫЙ ВЗГЛЯД"
        ],
        size: isMobile ? 23 : 34,
        isCompliments: true
      },

      // 3: Комплименты Часть 2 (2 комплимента)
      { 
        lines: isMobile ? [
          "С ТОБОЙ",
          "НЕВЕРОЯТНО ТЕПЛО",
          "",
          "ТЫ ВДОХНОВЛЯЕШЬ МЕНЯ",
          "КАЖДЫЙ ДЕНЬ"
        ] : [
          "С ТОБОЙ НЕВЕРОЯТНО ТЕПЛО",
          "ТЫ ВДОХНОВЛЯЕШЬ МЕНЯ КАЖДЫЙ ДЕНЬ"
        ],
        size: isMobile ? 22 : 32,
        isCompliments: true
      },

      // 4: Комплименты Часть 3 (2 комплимента)
      { 
        lines: isMobile ? [
          "РЯДОМ С ТОБОЙ",
          "ВСЁ СТАНОВИТСЯ ЯРЧЕ",
          "",
          "В ЭТОТ ДЕНЬ РОДИЛАСЬ",
          "МОЯ ВСЕЛЕННАЯ"
        ] : [
          "РЯДОМ С ТОБОЙ ВСЁ СТАНОВИТСЯ ЯРЧЕ",
          "В ЭТОТ ДЕНЬ РОДИЛАСЬ МОЯ ВСЕЛЕННАЯ"
        ],
        size: isMobile ? 21 : 30,
        isCompliments: true
      },

      // 5: Сцена Ты Невероятная
      { lines: ["ТЫ", "НЕВЕРОЯТНАЯ"], size: isMobile ? 36 : 64 },
      
      // 6: Сцена Финал
      { 
        lines: isMobile 
          ? ["С ДНЁМ РОЖДЕНИЯ", "ЛАТУЛЯ", "Я ЛЮБЛЮ ТЕБЯ", "МОЁ СОЛНЫШКО"] 
          : ["С ДНЁМ РОЖДЕНИЯ ЛАТУЛЯ", "Я ЛЮБЛЮ ТЕБЯ МОЁ СОЛНЫШКО"],
        size: isMobile ? 22 : 44
      }
    ];

    textTargets = configs.map(c => sampleText(c.lines, c.size, c.isCompliments));
  }

  for (let i = 0; i < N; i++) {
    const a = Math.random() * TAU, r = Math.pow(Math.random(), .55) * Math.min(W, H) * .7;
    P.push({
      rnd: { x: Math.cos(a) * r, y: Math.sin(a) * r },
      heart: pointHeart(), 
      star: pointStar(),
      cake: pointCakeAndPetals(),
      size: rand(0.9, 1.5), 
      phase: Math.random() * TAU, 
      speed: rand(.3, 1.1)
    });
  }

  function assignText(textIndex, i) {
    const pts = textTargets[textIndex] || [];
    if (!pts || pts.length === 0) return { x: 0, y: 0 };
    return pts[i % pts.length];
  }

  function morph(a, b, t) { 
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }; 
  }

  function target(part, i) {
    if (p < 0.8) return morph(part.rnd, assignText(0, i), smooth(clamp(p / 0.8, 0, 1)));
    if (p < 1.6) return morph(assignText(0, i), assignText(1, i), smoother(clamp((p - 0.8) / 0.8, 0, 1)));
    if (p < 2.4) return morph(assignText(1, i), assignText(2, i), smoother(clamp((p - 1.6) / 0.8, 0, 1)));
    if (p < 3.2) return morph(assignText(2, i), assignText(3, i), smoother(clamp((p - 2.4) / 0.8, 0, 1)));
    if (p < 4.0) return morph(assignText(3, i), assignText(4, i), smoother(clamp((p - 3.2) / 0.8, 0, 1)));
    if (p < 4.8) return morph(assignText(4, i), assignText(5, i), smoother(clamp((p - 4.0) / 0.8, 0, 1)));
    if (p < 5.6) return morph(assignText(5, i), part.heart, smoother(clamp((p - 4.8) / 0.8, 0, 1)));
    if (p < 6.2) return morph(part.heart, part.star, smoother(clamp((p - 5.6) / 0.6, 0, 1)));
    if (p < 6.8) return morph(part.star, part.cake, smoother(clamp((p - 6.2) / 0.6, 0, 1)));
    return morph(part.cake, assignText(6, i), smoother(clamp((p - 6.8) / 0.6, 0, 1)));
  }

  function palette() {
    if (p < 1.6) return [192, 132, 252]; 
    if (p < 4.0) return [168, 85, 247];  
    if (p < 5.6) return [244, 114, 182]; 
    if (p < 6.6) return [251, 146, 60];  
    return [244, 63, 94];                 
  }

  function cinematicScroll() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    targetP = (scrollY / max) * 7.4;
    p += (targetP - p) * 0.08;
  }

  function drawFinalHeartEffect() {
    if (p < 4.8 || p > 5.6) return;
    
    const alpha = clamp((p - 4.8) / 0.25, 0, 1) * clamp((5.6 - p) / 0.25, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;

    const cx = W / 2, cy = H / 2;
    const count = W < 600 ? 32 : 48;
    
    const expandProgress = clamp((p - 4.95) / 0.35, 0, 1);
    const scaleProgress = smoother(expandProgress);

    const pulse = 1 + Math.sin(time * 3) * 0.03;
    const finalScale = (Math.min(W, H) / 42) * pulse;
    const currentScale = finalScale * scaleProgress;

    ctx.font = "900 11px sans-serif";
    ctx.fillStyle = "#f472b6";
    ctx.shadowColor = "#e879f9";
    ctx.shadowBlur = 8;

    if (scaleProgress > 0.05) {
      for (let i = 0; i < count; i++) {
        const t = (i / count) * TAU;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        
        const px = cx + x * currentScale;
        const py = cy - y * currentScale;

        const flick = 0.75 + 0.25 * Math.sin(time * 5 + i);
        ctx.globalAlpha = alpha * flick * scaleProgress;
        ctx.fillText("Love You", px - 22, py);
      }
    }

    const centerAlpha = alpha * clamp((p - 4.8) / 0.2, 0, 1);
    ctx.globalAlpha = centerAlpha;
    ctx.font = `italic 500 ${Math.round(Math.min(W / 9, 44))}px 'Cormorant Garamond', serif`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#f472b6";
    ctx.shadowBlur = 18;
    ctx.fillText("I Love You", cx, cy);

    ctx.restore();
  }

  function spawnFirework() {
    if (p > 6.9 && Math.random() < 0.12) {
      const x = rand(W * 0.05, W * 0.95);
      const y = rand(H * 0.08, H * 0.92);
      const count = Math.floor(rand(20, 40));
      const color = [rand(160, 255), rand(100, 220), rand(180, 255)];

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
    if (p <= 6.8) { fireworks.length = 0; return; }
    
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
      ctx.fillStyle = `rgba(244, 114, 182, ${s.alpha})`;
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

    const idx = clamp(Math.round(p), 0, 7);
    bar.style.width = (clamp(p / 7.4, 0, 1) * 100) + "%";
    counter.textContent = String(Math.min(idx + 1, 8)).padStart(2, "0") + " / 08";
    
    if (p >= 7.0) {
      hint.style.opacity = "0";
      replayBtn.classList.add("visible");
    } else {
      hint.style.opacity = "1";
      replayBtn.classList.remove("visible");
    }

    const col = palette(), cx = W / 2, cy = H / 2;
    const isTextScene = (p < 4.8) || (p > 6.8);

    for (let i = 0; i < P.length; i++) {
      const part = P[i], q = target(part, i);
      
      const driftX = isTextScene ? 0 : Math.sin(time * part.speed + part.phase) * 0.35;
      const driftY = isTextScene ? 0 : Math.cos(time * part.speed * .7 + part.phase) * 0.35;
      
      const x = cx + (q.x + driftX);
      const y = cy + (q.y + driftY);
      
      const a = isTextScene ? 0.88 : (0.45 + 0.5 * Math.sin(time * 2 + part.phase));

      ctx.beginPath();
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
      ctx.arc(x, y, part.size, 0, TAU);
      ctx.fill();
    }

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
