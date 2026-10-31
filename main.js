(() => {
  'use strict';

  // ---------- Wedding details: edit here ----------
  const WEDDING = {
    // Israel is still on summer time (UTC+3) at the end of October 2027
    start: '2027-10-28T19:00:00+03:00',
    // When false, the calendar entry is an all-day event and the hour is not shown
    timeConfirmed: true,
    durationHours: 5,
    venue: 'אולם אירועים',
    calendarTitle: 'החתונה של מיכל ונועם',
    calendarDetails: 'מיכל ונועם מתחתנים! נתראה שם.',
  };

  const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const DAY_MS = 86400000;

  const $ = (sel) => document.querySelector(sel);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The calendar date is read from the string itself so the viewer's time zone never shifts it
  const [year, month, day] = WEDDING.start.slice(0, 10).split('-').map(Number);
  const weddingDay = new Date(Date.UTC(year, month - 1, day));
  const weddingWeekday = weddingDay.getUTCDay();
  const weddingTime = Date.parse(WEDDING.start);

  // ---------- Text content ----------

  /** Writes a number in Hebrew letters, e.g. 27 → כ״ז, 5788 → תשפ״ח. */
  function gematria(n) {
    const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
    const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    const hundreds = ['', 'ק', 'ר', 'ש'];
    let s = '';
    n %= 1000;
    while (n >= 400) { s += 'ת'; n -= 400; }
    if (n >= 100) { s += hundreds[Math.floor(n / 100)]; n %= 100; }
    if (n === 15) s += 'טו';
    else if (n === 16) s += 'טז';
    else s += tens[Math.floor(n / 10)] + ones[n % 10];
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }

  function hebrewDate(date) {
    try {
      const parts = new Intl.DateTimeFormat('he-u-ca-hebrew', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
      }).formatToParts(date);
      const get = (type) => parts.find((p) => p.type === type).value;
      return `${gematria(parseInt(get('day'), 10))} ב${get('month')} ${gematria(parseInt(get('year'), 10))}`;
    } catch {
      return '';
    }
  }

  function fillDetails() {
    const pad = (n) => String(n).padStart(2, '0');
    let dateText = `${WEEKDAYS[weddingWeekday]}, ${pad(day)}.${pad(month)}.${year}`;
    if (WEDDING.timeConfirmed) dateText += ` | ${WEDDING.start.slice(11, 16)}`;
    $('[data-field="date"]').textContent = dateText;
    $('[data-field="hebrewDate"]').textContent = hebrewDate(weddingDay);
    $('[data-field="venue"]').textContent = WEDDING.venue;
  }

  function fillLinks() {
    const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
    const dates = WEDDING.timeConfirmed
      ? `${stamp(weddingTime)}/${stamp(weddingTime + WEDDING.durationHours * 3600000)}`
      : `${ymd(weddingDay)}/${ymd(new Date(weddingDay.getTime() + DAY_MS))}`;
    const gcal = new URLSearchParams({
      text: WEDDING.calendarTitle,
      dates,
      location: WEDDING.venue,
      details: WEDDING.calendarDetails,
      ctz: 'Asia/Jerusalem',
    });
    // render?action=TEMPLATE lands on the agenda in mobile browsers; eventedit opens the new-event form everywhere.
    // The slash between the dates must stay literal for Google to read them.
    $('#gcal').href = `https://calendar.google.com/calendar/r/eventedit?${gcal.toString().replace('%2F', '/')}`;
  }

  // ---------- Countdown ----------

  const countdownEl = $('#countdown');
  const units = {};
  countdownEl.querySelectorAll('[data-unit]').forEach((el) => { units[el.dataset.unit] = el; });

  function tickCountdown() {
    const left = weddingTime - Date.now();
    if (left <= 0) {
      const done = $('#countdown-done');
      countdownEl.hidden = true;
      done.hidden = false;
      done.textContent = left > -DAY_MS ? 'היום זה קורה!' : 'התחתנו! תודה שחגגתם איתנו';
      return;
    }
    const s = Math.floor(left / 1000);
    units.days.textContent = Math.floor(s / 86400);
    units.hours.textContent = String(Math.floor(s / 3600) % 24).padStart(2, '0');
    units.minutes.textContent = String(Math.floor(s / 60) % 60).padStart(2, '0');
    units.seconds.textContent = String(s % 60).padStart(2, '0');
    setTimeout(tickCountdown, 1000 - (Date.now() % 1000));
  }

  // ---------- Paper texture ----------

  function paintPaper() {
    // Embossed fibre grain lit from the top-left, plus sparse dark flecks of recycled paper
    // Drawn at twice its displayed size so it stays crisp on retina screens
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='840' height='840'>
      <filter id='p' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'>
        <feTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='3' seed='3' stitchTiles='stitch' result='grain'/>
        <feDiffuseLighting in='grain' lighting-color='#fff' surfaceScale='0.55' result='lit'>
          <feDistantLight azimuth='225' elevation='68'/>
        </feDiffuseLighting>
        <feComponentTransfer in='lit' result='paper'>
          <feFuncR type='linear' slope='1.075'/><feFuncG type='linear' slope='1.075'/><feFuncB type='linear' slope='1.075'/>
        </feComponentTransfer>
        <feTurbulence type='fractalNoise' baseFrequency='0.22' numOctaves='1' seed='11' stitchTiles='stitch'/>
        <feColorMatrix type='matrix' values='0 0 0 0 0.42  0 0 0 0 0.37  0 0 0 0 0.3  40 0 0 0 -32.2' result='flecks'/>
        <feComposite in='flecks' in2='paper' operator='over'/>
      </filter>
      <rect width='100%' height='100%' filter='url(#p)'/>
    </svg>`;
    // Bake the filter into a bitmap once; a live SVG filter would be re-rendered on every frame of the zoom
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 840;
      canvas.getContext('2d').drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) root.style.setProperty('--paper-texture', `url("${URL.createObjectURL(blob)}")`);
      });
    };
    img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }


  // ---------- Geometry ----------

  const geo = {};

  /** Sizes the wedding-day cell so the card fits it and the countdown fits the cell below. */
  function measure() {
    const vw = window.innerWidth;
    const vh = Math.max(window.innerHeight, 520);
    const cw = Math.round(vw < 700 ? Math.min(vw * 0.66, vh * 0.42) : Math.min(440, vw * 0.36, vh * 0.38));
    const u = cw / 100;
    const ch = Math.round(clamp(vh * 0.47, 128 * u, 165 * u));
    const belowNeeded = 45 * u + 62;
    const top = Math.round(clamp(vh - ch - belowNeeded, vh * 0.06, vh * 0.2));
    // The intro starts zoomed out far enough to read as a month calendar
    const startScale = clamp(vw / (4.2 * cw), 0.22, 0.6);
    Object.assign(geo, { vw, vh, cw, ch, top, startScale });
    root.style.setProperty('--cw', `${cw}px`);
    root.style.setProperty('--ch', `${ch}px`);
    root.style.setProperty('--top', `${top}px`);
  }

  // ---------- Calendar grid ----------

  const calendar = $('#calendar');

  /** Draws grid lines and day numbers around the wedding day, enough to fill the zoomed-out view. */
  function buildCalendar() {
    const { vw, vh, cw, ch, top, startScale } = geo;
    // Distance from the cell's centre to the farthest visible edge, in unscaled pixels
    const reachX = vw / 2 / startScale + cw;
    const reachY = Math.max(top + ch / 2, vh - top - ch / 2) / startScale + ch;
    const cols = Math.ceil(reachX / cw);
    const rows = Math.ceil(reachY / ch);
    const frag = document.createDocumentFragment();

    for (let k = -cols; k <= cols + 1; k++) {
      const line = document.createElement('div');
      line.className = 'line line--v';
      line.style.cssText = `left:${k * cw}px;top:${ch / 2 - reachY}px;height:${reachY * 2}px`;
      line.dataset.order = String(cols + 1 - k); // right to left
      frag.appendChild(line);
    }
    for (let k = -rows; k <= rows + 1; k++) {
      const line = document.createElement('div');
      line.className = 'line line--h';
      line.style.cssText = `top:${k * ch}px;left:${cw / 2 - reachX}px;width:${reachX * 2}px`;
      line.dataset.order = String(k + rows); // top to bottom
      frag.appendChild(line);
    }

    // Weeks run Sunday → Saturday from right to left, so a column's weekday is fixed
    for (let r = -rows; r <= rows; r++) {
      for (let c = -cols; c <= cols; c++) {
        const weekday = weddingWeekday - c;
        if (weekday < 0 || weekday > 6) continue;
        const date = new Date(weddingDay.getTime() + (r * 7 - c) * DAY_MS);
        const cell = document.createElement('div');
        cell.className = 'day';
        if (r === 0 && c === 0) cell.classList.add('day--wedding');
        else if (date.getUTCMonth() !== month - 1) cell.classList.add('day--other-month');
        cell.style.left = `${c * cw}px`;
        cell.style.top = `${r * ch}px`;
        cell.textContent = date.getUTCDate();
        if (date.getUTCDate() === 1) {
          const label = document.createElement('small');
          label.textContent = MONTHS[date.getUTCMonth()];
          cell.appendChild(label);
        }
        frag.appendChild(cell);
      }
    }

    calendar.replaceChildren(frag);
  }

  // ---------- Intro ----------

  // ---------- Hand-written "Save the Date" ----------

  /**
   * Draws "Save the Date" on a canvas, revealed stroke by stroke. The pen strokes (traced from the
   * glyphs by tools/handwriting.py, in writing order) are drawn into a mask that cuts the letters out.
   * A canvas keeps this smooth on phones, where an animated SVG mask is redrawn slowly.
   */
  const script = (() => {
    const canvas = $('#script');
    const ctx = canvas.getContext('2d');
    const pen = document.createElement('canvas');
    const penCtx = pen.getContext('2d');
    const source = $('#script-source');
    const [vx, vy, vw, vh] = source.getAttribute('viewBox').split(/\s+/).map(Number);
    const glyphs = new Path2D($('#script-glyphs').getAttribute('d'));
    const brush = Number($('#script-pen').getAttribute('stroke-width'));
    const strokes = [...source.querySelectorAll('#script-pen path')].map((el) => {
      const d = el.getAttribute('d');
      const n = d.match(/-?\d+(\.\d+)?/g).map(Number);
      let len = 0;
      for (let i = 2; i < n.length; i += 2) len += Math.hypot(n[i] - n[i - 2], n[i + 1] - n[i - 1]);
      return { path: new Path2D(d), len };
    });
    canvas.style.aspectRatio = `${vw} / ${vh}`;
    let grain = null;
    let progress = 0; // ms into the writing; Infinity once finished
    let schedule = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(w * vh / vw);
      if (!w || (w === canvas.width && h === canvas.height)) return;
      canvas.width = pen.width = w;
      canvas.height = pen.height = h;
      grain = makeGrain(dpr);
      draw();
    }

    /** Paper-tooth speckle, one cell per CSS pixel, that rubs some ink away so it reads as pencil. */
    function makeGrain(dpr) {
      const cells = 96;
      const tile = document.createElement('canvas');
      tile.width = tile.height = Math.round(cells * dpr);
      const g = tile.getContext('2d');
      const step = tile.width / cells;
      for (let y = 0; y < cells; y++) {
        for (let x = 0; x < cells; x++) {
          const r = Math.random();
          if (r < 0.5) continue;
          g.fillStyle = `rgba(0,0,0,${((r - 0.5) * 1.4).toFixed(2)})`;
          g.fillRect(x * step, y * step, Math.ceil(step), Math.ceil(step));
        }
      }
      return ctx.createPattern(tile, 'repeat');
    }

    function draw() {
      const { width: w, height: h } = canvas;
      const k = w / vw;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      if (progress <= 0) return;
      ctx.setTransform(k, 0, 0, k, -vx * k, -vy * k);
      ctx.fillStyle = getComputedStyle(root).getPropertyValue('--accent').trim();
      ctx.fill(glyphs);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      if (progress !== Infinity) {
        penCtx.setTransform(1, 0, 0, 1, 0, 0);
        penCtx.clearRect(0, 0, w, h);
        penCtx.setTransform(k, 0, 0, k, -vx * k, -vy * k);
        penCtx.lineWidth = brush;
        penCtx.lineCap = penCtx.lineJoin = 'round';
        strokes.forEach((s, i) => {
          const { start, time } = schedule[i];
          const f = (progress - start) / time;
          if (f <= 0) return;
          penCtx.setLineDash(f >= 1 ? [] : [s.len * f, s.len * 2]);
          penCtx.stroke(s.path);
        });
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(pen, 0, 0);
      }

      if (grain) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = grain;
        ctx.fillRect(0, 0, w, h);
      }
    }

    /** Writes the words over `duration` ms after `delay` ms; each stroke starts before the last one ends. */
    function write(delay, duration) {
      const OVERLAP = 0.3;
      const speed = (strokes.reduce((a, s) => a + s.len, 0) * (1 - OVERLAP)) / duration;
      let at = 0;
      schedule = strokes.map((s) => {
        const time = s.len / speed;
        const slot = { start: at, time };
        at += time * (1 - OVERLAP);
        return slot;
      });
      const end = Math.max(...schedule.map((s) => s.start + s.time));
      return new Promise((resolve) => {
        const t0 = performance.now() + delay;
        const tick = (now) => {
          progress = now - t0;
          if (progress >= end) {
            progress = Infinity;
            draw();
            resolve();
            return;
          }
          if (progress > 0) draw();
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }

    function finish() {
      progress = Infinity;
      draw();
    }

    return { resize, write, finish };
  })();

  function playIntro() {
    const ease = 'cubic-bezier(.65,0,.2,1)';
    const easeOut = 'cubic-bezier(.2,.7,.2,1)';
    const anims = [];
    const run = (el, frames, opts) => anims.push(el.animate(frames, { fill: 'backwards', ...opts }));

    calendar.querySelectorAll('.line--v').forEach((el) => {
      run(el, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
        { duration: 1600, delay: Number(el.dataset.order) * 110, easing: ease });
    });
    calendar.querySelectorAll('.line--h').forEach((el) => {
      run(el, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: 1600, delay: 250 + Number(el.dataset.order) * 120, easing: ease });
    });
    calendar.querySelectorAll('.day').forEach((el) => {
      run(el, [{ opacity: 0 }, { opacity: 1 }],
        { duration: 800, delay: 900 + Math.random() * 1000, easing: 'ease-out' });
    });

    // The month stays in view long enough to read as a calendar, then the camera closes in on the wedding day
    run($('#zoom'), [{ transform: `scale(${geo.startScale})` }, { transform: 'scale(1)' }],
      { duration: 2800, delay: 2300, easing: ease });

    const t = 4700;
    anims.push({ finished: script.write(t, 2200) });
    // "The wedding of" and the names are one title, so they arrive together
    document.querySelectorAll('.lead, .names').forEach((el) => {
      run(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
        { duration: 1000, delay: t + 500, easing: easeOut });
    });
    document.querySelectorAll('.details > div').forEach((el, i) => {
      run(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 800, delay: t + 1000 + i * 150, easing: 'ease-out' });
    });
    document.querySelectorAll('.doodle').forEach((svg, i) => {
      svg.querySelectorAll('path').forEach((path, j) => {
        const len = path.getTotalLength() + 1;
        path.style.strokeDasharray = `${len} ${len}`;
        run(path, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration: 700, delay: t + 600 + i * 250 + j * 160, easing: 'ease-in-out' });
      });
    });
    run($('#below'), [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: 900, delay: t + 1500, easing: easeOut });

    root.classList.remove('intro-pending');
    return Promise.all(anims.map((a) => a.finished)).catch(() => {});
  }

  // ---------- Depth effect ----------

  const layers = [...document.querySelectorAll('[data-depth]')].map((el) => ({ el, depth: Number(el.dataset.depth) }));
  const MAX_SHIFT = 18;
  const tilt = { x: 0, y: 0 };
  const shown = { x: 0, y: 0 };
  let strength = 0;
  let neutral = null;

  let lastX = NaN;
  let lastY = NaN;

  function frame() {
    requestAnimationFrame(frame);
    shown.x += (tilt.x - shown.x) * 0.08;
    shown.y += (tilt.y - shown.y) * 0.08;
    const k = MAX_SHIFT * strength;
    // Skip the style writes when nothing visibly moved
    if (Math.abs(shown.x * k - lastX) < 0.02 && Math.abs(shown.y * k - lastY) < 0.02) return;
    lastX = shown.x * k;
    lastY = shown.y * k;
    for (const { el, depth } of layers) {
      // Nearer layers slide against the tilt, the paper slides with it
      el.style.transform = `translate3d(${(-shown.x * depth * k).toFixed(2)}px, ${(-shown.y * depth * k).toFixed(2)}px, 0)`;
    }
  }

  function onOrientation(e) {
    if (e.beta == null || e.gamma == null) return;
    const angle = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
    let x = e.gamma;
    let y = e.beta;
    if (angle === 90) { x = e.beta; y = -e.gamma; }
    else if (angle === -90 || angle === 270) { x = -e.beta; y = e.gamma; }
    else if (angle === 180) { x = -e.gamma; y = -e.beta; }
    // The neutral pose follows slowly, so however the phone is held it settles back to centre
    if (!neutral) neutral = { x, y };
    neutral.x += (x - neutral.x) * 0.006;
    neutral.y += (y - neutral.y) * 0.006;
    tilt.x = clamp((x - neutral.x) / 16, -1, 1);
    tilt.y = clamp((y - neutral.y) / 16, -1, 1);
  }

  function onPointer(e) {
    if (e.pointerType !== 'mouse') return;
    tilt.x = clamp((e.clientX / geo.vw) * 2 - 1, -1, 1);
    tilt.y = clamp((e.clientY / geo.vh) * 2 - 1, -1, 1);
  }

  function startDepth() {
    const t0 = performance.now();
    const ramp = (now) => {
      strength = Math.min(1, (now - t0) / 900);
      if (strength < 1) requestAnimationFrame(ramp);
    };
    requestAnimationFrame(ramp);
    requestAnimationFrame(frame);
    window.addEventListener('pointermove', onPointer, { passive: true });

    const DOE = window.DeviceOrientationEvent;
    if (!DOE) return;
    if (typeof DOE.requestPermission !== 'function') {
      window.addEventListener('deviceorientation', onOrientation);
      return;
    }
    // iOS only grants motion access from a tap, so ask on the first touch anywhere on the page
    const ask = (e) => {
      // Never let the permission prompt swallow a tap on the calendar button
      if (e.target.closest('a')) return;
      document.removeEventListener('touchend', ask);
      document.removeEventListener('click', ask);
      DOE.requestPermission().then((state) => {
        if (state === 'granted') window.addEventListener('deviceorientation', onOrientation);
      }).catch(() => {});
    };
    document.addEventListener('touchend', ask);
    document.addEventListener('click', ask);
  }

  // ---------- Start ----------

  fillDetails();
  fillLinks();
  tickCountdown();
  paintPaper();
  measure();
  buildCalendar();
  script.resize();

  let introDone = false;
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      measure();
      script.resize();
      if (introDone) buildCalendar();
    }, 150);
  });

  const fontsReady = Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  fontsReady.then(() => {
    if (reducedMotion) {
      script.finish();
      root.classList.remove('intro-pending');
      introDone = true;
      return;
    }
    playIntro().then(() => {
      introDone = true;
      root.classList.add('alive');
      startDepth();
    });
  });
})();
