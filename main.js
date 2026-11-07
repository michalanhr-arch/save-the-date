(() => {
  'use strict';

  // ---------- Wedding details: edit here ----------
  const WEDDING = {
    // Israel is still on summer time (UTC+3) at the end of October 2027
    start: '2027-10-27T19:30:00+03:00',
    // When false, the calendar entry is an all-day event and the hour is not shown
    timeConfirmed: true,
    durationHours: 7.5, // 19:30 until 03:00
    venue: 'צל החורש, בית ברל',
    // The venue's street address, as Google Maps knows it; it goes in the calendar event's location
    address: '',
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
      location: [WEDDING.venue, WEDDING.address].filter(Boolean).join(', '),
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
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 840;
        canvas.getContext('2d').drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            root.style.setProperty('--paper-texture', `url("${URL.createObjectURL(blob)}")`);
            root.classList.add('paper-ready');
          }
          resolve();
        });
      };
      img.onerror = resolve;
      img.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    });
  }


  /** Speckled grey ink, used as a texture inside the month heading's letters. */
  let inkGrain = null;
  function paintInkGrain() {
    const size = 192; // shown at 96px, so one speck per CSS pixel on retina screens
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const data = ctx.createImageData(size, size);
    for (let i = 0; i < data.data.length; i += 4) {
      data.data[i] = 150;
      data.data[i + 1] = 145;
      data.data[i + 2] = 134;
      data.data[i + 3] = Math.round(255 * (0.25 + Math.random() * 0.55));
    }
    ctx.putImageData(data, 0, 0);
    inkGrain = canvas.toDataURL();
    root.style.setProperty('--ink-grain', `url("${inkGrain}")`);
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
    // The month's heading stands on the top line of the week before the wedding, with blank paper above it
    const titleSize = Math.min(clamp(vw * 0.13, 40, 72), vh * 0.075);
    const roomForTitle = (top + ch / 2 - titleSize * 1.4) / (1.5 * ch);
    const startScale = clamp(Math.min(vw / (4.2 * cw), roomForTitle), 0.22, 0.6);
    Object.assign(geo, { vw, vh, cw, ch, top, startScale, titleSize });
    root.style.setProperty('--cw', `${cw}px`);
    root.style.setProperty('--ch', `${ch}px`);
    root.style.setProperty('--top', `${top}px`);
  }

  // ---------- Calendar grid ----------

  const calendar = $('#calendar');

  /** Draws grid lines and day numbers around the wedding day, enough to fill the zoomed-out view. */
  function buildCalendar() {
    const { vw, vh, cw, ch, top, startScale, titleSize } = geo;
    // The calendar page starts at the top of the week before the wedding; above it is the heading
    const pageTop = -ch;
    // Distance from the cell's centre to the farthest visible edge, in unscaled pixels
    const reachX = vw / 2 / startScale + cw;
    const reachY = Math.max(top + ch / 2, vh - top - ch / 2) / startScale + ch;
    const cols = Math.ceil(reachX / cw);
    const rows = Math.ceil(reachY / ch);
    const frag = document.createDocumentFragment();

    for (let k = -cols; k <= cols + 1; k++) {
      const line = document.createElement('div');
      line.className = 'line line--v';
      line.style.cssText = `left:${k * cw}px;top:${pageTop}px;height:${ch / 2 + reachY - pageTop}px`;
      line.dataset.order = String(cols + 1 - k); // right to left
      frag.appendChild(line);
    }
    for (let k = -1; k <= rows + 1; k++) {
      const line = document.createElement('div');
      line.className = 'line line--h';
      line.style.cssText = `top:${k * ch}px;left:${cw / 2 - reachX}px;width:${reachX * 2}px`;
      line.dataset.order = String(k + 1); // top to bottom
      frag.appendChild(line);
    }

    // The month's name is set like a printed calendar's heading: right-aligned with the day numbers
    // of the rightmost column in the zoomed-out view, standing on a grid line. It scales with the grid,
    // so it simply leaves the frame as the camera closes in.
    const fontSize = titleSize / startScale;
    const header = document.createElement('div');
    header.className = inkGrain ? 'month-title textured' : 'month-title';
    header.textContent = MONTHS[month - 1];
    const viewRight = cw / 2 + vw / 2 / startScale;
    const columnEdge = Math.floor((viewRight - 8 / startScale) / cw) * cw;
    header.style.cssText = `font-size:${fontSize}px;left:${columnEdge - cw * 0.05}px;top:${pageTop - fontSize * 0.25}px`;

    // Everything printed on the calendar fades in as one piece, which is far cheaper than ~70 separate fades
    const print = document.createElement('div');
    print.className = 'print';
    print.appendChild(header);

    // Weeks run Sunday → Saturday from right to left, so a column's weekday is fixed
    for (let r = -1; r <= rows; r++) {
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
        print.appendChild(cell);
      }
    }

    frag.appendChild(print);
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

  // ---------- The dancing couple ----------

  /** Draws the couple's lines in on a canvas, one after another, at a steady pen speed. */
  const couple = (() => {
    const canvas = $('#us');
    const ctx = canvas.getContext('2d');
    const source = $('#us-source');
    const [vx, vy, vw, vh] = source.getAttribute('viewBox').split(/\s+/).map(Number);
    // The drawing is thin filled outlines; stroking both edges brings it up to the other doodles' weight
    const LINE = 7.5;
    const lines = [...source.querySelectorAll('path')].map((el) => {
      const path = new Path2D(el.getAttribute('d'));
      return { path, len: el.getTotalLength ? el.getTotalLength() : 0 };
    });
    let progress = Infinity;
    let schedule = [];

    function draw() {
      const { width: w, height: h } = canvas;
      const k = w / vw;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (progress <= 0) return;
      ctx.setTransform(k, 0, 0, k, -vx * k, -vy * k);
      ctx.strokeStyle = getComputedStyle(root).getPropertyValue('--ink').trim();
      ctx.lineWidth = LINE;
      ctx.lineCap = ctx.lineJoin = 'round';
      lines.forEach((line, i) => {
        const f = progress === Infinity ? 1 : (progress - schedule[i].start) / schedule[i].time;
        if (f <= 0) return;
        ctx.setLineDash(f >= 1 || !line.len ? [] : [line.len * f, line.len * 2]);
        ctx.stroke(line.path);
      });
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(w * vh / vw);
      if (!w || (w === canvas.width && h === canvas.height)) return;
      canvas.width = w;
      canvas.height = h;
      draw();
    }

    function write(delay, duration) {
      const total = lines.reduce((a, l) => a + l.len, 0);
      let at = 0;
      schedule = lines.map((l) => {
        const slot = { start: at, time: Math.max(120, (l.len / total) * duration) };
        at += slot.time * 0.85;
        return slot;
      });
      const end = Math.max(...schedule.map((s) => s.start + s.time));
      progress = 0;
      draw();
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

    return { resize, write, finish: () => { progress = Infinity; draw(); } };
  })();

  function playIntro() {
    const ease = 'cubic-bezier(.65,0,.2,1)';
    const easeOut = 'cubic-bezier(.2,.7,.2,1)';
    const anims = [];
    const run = (el, frames, opts) => anims.push(el.animate(frames, { fill: 'backwards', ...opts }));

    calendar.querySelectorAll('.line--v').forEach((el) => {
      run(el, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
        { duration: 1400, delay: Number(el.dataset.order) * 70, easing: ease });
    });
    calendar.querySelectorAll('.line--h').forEach((el) => {
      run(el, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: 1400, delay: 150 + Number(el.dataset.order) * 80, easing: ease });
    });
    run(calendar.querySelector('.print'), [{ opacity: 0 }, { opacity: 1 }],
      { duration: 1200, delay: 800, easing: 'ease-out' });

    // The month stays in view long enough to read as a calendar, then the camera closes in on the wedding day
    run($('#zoom'), [{ transform: `scale(${geo.startScale})` }, { transform: 'scale(1)' }],
      { duration: 2800, delay: 2300, easing: ease });

    const t = 4700;
    const WRITE = 2200;
    anims.push({ finished: script.write(t, WRITE) });
    // "The wedding of" and the names are one title, so they arrive together
    document.querySelectorAll('.lead, .names').forEach((el) => {
      run(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
        { duration: 1000, delay: t + 500, easing: easeOut });
    });
    document.querySelectorAll('.details > div').forEach((el, i) => {
      run(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 800, delay: t + 1000 + i * 150, easing: 'ease-out' });
    });
    // The doodles wait for the writing to finish, so only one thing is being drawn at a time
    const doodlesAt = t + WRITE + 200;
    document.querySelectorAll('.doodle').forEach((svg, i) => {
      svg.querySelectorAll('path').forEach((path, j) => {
        const len = path.getTotalLength() + 1;
        path.style.strokeDasharray = `${len} ${len}`;
        // Long lines (like the dancing couple's outline) take longer, at a similar pen speed
        const k = path.ownerSVGElement.getBoundingClientRect().width / path.ownerSVGElement.viewBox.baseVal.width;
        run(path, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration: clamp(len * k * 3, 450, 2600), delay: doodlesAt + i * 300 + j * 110, easing: 'ease-in-out' });
      });
    });
    anims.push({ finished: couple.write(doodlesAt + 300, 2200) });
    run($('#below'), [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: 900, delay: t + 1500, easing: easeOut });

    root.classList.remove('intro-pending');
    root.classList.add('intro-playing');
    return Promise.all(anims.map((a) => a.finished)).catch(() => {});
  }

  // ---------- Start ----------

  fillDetails();
  fillLinks();
  tickCountdown();
  const paperReady = paintPaper();
  paintInkGrain();
  measure();
  buildCalendar();
  script.resize();
  couple.resize();

  let introDone = false;
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      measure();
      script.resize();
      couple.resize();
  couple.resize();
      if (introDone) buildCalendar();
    }, 150);
  });

  // Start once the fonts and the paper are ready, so nothing swaps in mid-animation
  const fontsReady = Promise.race([
    Promise.all([document.fonts ? document.fonts.ready : null, paperReady]),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  fontsReady.then(() => {
    if (reducedMotion) {
      script.finish();
      couple.finish();
      root.classList.remove('intro-pending');
      introDone = true;
      return;
    }
    playIntro().then(() => {
      root.classList.remove('intro-playing');
      introDone = true;
      root.classList.add('alive');
    });
  });
})();
