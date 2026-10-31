(() => {
  'use strict';

  // ---------- Wedding details: edit here ----------
  const WEDDING = {
    // Israel is still on summer time (UTC+3) at the end of October 2027
    start: '2027-10-28T19:00:00+03:00',
    // Until the hour is final, the calendar entry is an all-day event and the hour is not shown
    timeConfirmed: false,
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
    let dateText = `יום ${WEEKDAYS[weddingWeekday]}, ${pad(day)}.${pad(month)}.${year}`;
    if (WEDDING.timeConfirmed) dateText += `, ${WEDDING.start.slice(11, 16)}`;
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
      action: 'TEMPLATE',
      text: WEDDING.calendarTitle,
      dates,
      location: WEDDING.venue,
      details: WEDDING.calendarDetails,
      ctz: 'Asia/Jerusalem',
    });
    $('#gcal').href = `https://calendar.google.com/calendar/render?${gcal}`;
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
    root.style.setProperty('--paper-texture', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
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
    const startScale = clamp(vw / (5.5 * cw), 0.22, 0.6);
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

  /**
   * Writes "Save the Date" stroke by stroke: the mask's pen strokes (traced from the glyphs
   * by tools/handwriting.py, in writing order) are drawn at a steady pen speed.
   */
  function writeScript(delay, duration) {
    const strokes = [...document.querySelectorAll('#script-pen path')];
    const lengths = strokes.map((p) => p.getTotalLength());
    // Each stroke starts before the previous one ends, so the pen never stalls between them
    const OVERLAP = 0.3;
    const speed = (lengths.reduce((a, b) => a + b, 0) * (1 - OVERLAP)) / duration;
    let at = delay;
    const anims = strokes.map((path, i) => {
      const len = lengths[i] + 1;
      path.style.strokeDasharray = `${len} ${len}`;
      path.style.strokeDashoffset = String(len);
      const time = lengths[i] / speed;
      const anim = path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: time, delay: at, easing: 'linear', fill: 'forwards' });
      at += time * (1 - OVERLAP);
      return anim;
    });
    return Promise.all(anims.map((a) => a.finished)).catch(() => {});
  }

  function playIntro() {
    const ease = 'cubic-bezier(.65,0,.2,1)';
    const easeOut = 'cubic-bezier(.2,.7,.2,1)';
    const anims = [];
    const run = (el, frames, opts) => anims.push(el.animate(frames, { fill: 'backwards', ...opts }));

    calendar.querySelectorAll('.line--v').forEach((el) => {
      run(el, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }],
        { duration: 1100, delay: Number(el.dataset.order) * 70, easing: ease });
    });
    calendar.querySelectorAll('.line--h').forEach((el) => {
      run(el, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: 1100, delay: 150 + Number(el.dataset.order) * 80, easing: ease });
    });
    calendar.querySelectorAll('.day').forEach((el) => {
      run(el, [{ opacity: 0 }, { opacity: 1 }],
        { duration: 600, delay: 500 + Math.random() * 700, easing: 'ease-out' });
    });

    // The camera closes in on the wedding day while the grid is still drawing
    run($('#zoom'), [{ transform: `scale(${geo.startScale})` }, { transform: 'scale(1)' }],
      { duration: 2300, delay: 700, easing: ease });

    const t = 2700;
    writeScript(t, 2200).then(() => $('.script__ink').removeAttribute('mask'));
    [['.names', 500], ['.tagline', 750]].forEach(([sel, d]) => {
      run($(sel), [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
        { duration: 900, delay: t + d, easing: easeOut });
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

  function frame() {
    shown.x += (tilt.x - shown.x) * 0.08;
    shown.y += (tilt.y - shown.y) * 0.08;
    const k = MAX_SHIFT * strength;
    for (const { el, depth } of layers) {
      // Nearer layers slide against the tilt, the paper slides with it
      el.style.transform = `translate3d(${(-shown.x * depth * k).toFixed(2)}px, ${(-shown.y * depth * k).toFixed(2)}px, 0)`;
    }
    requestAnimationFrame(frame);
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
    const ask = () => {
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

  let introDone = false;
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      measure();
      if (introDone) buildCalendar();
    }, 150);
  });

  const fontsReady = Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise((r) => setTimeout(r, 1500)),
  ]);

  fontsReady.then(() => {
    if (reducedMotion) {
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
