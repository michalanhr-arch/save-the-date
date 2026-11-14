"""Builds es/index.html, the Spanish page, from the Hebrew index.html.

The two pages share styles.css, main.js and assets/; only the page's own text differs.
main.js picks its wording (dates, months, calendar event) from <html lang>.
Run after any change to index.html:
    python3 tools/make-spanish.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://michalandnoam.com/"

REPLACEMENTS = [
    ('<html lang="he" dir="rtl">', '<html lang="es" dir="ltr">'),
    ("<title>מיכל ונועם – Save the Date</title>", "<title>Michal y Noam – Save the Date</title>"),
    ('content="מיכל ונועם מתחתנים! 27.10.2027 – שמרו את התאריך."',
     'content="¡Michal y Noam se casan! 27.10.2027 – reserva la fecha."'),
    ('content="מיכל ונועם – Save the Date"', 'content="Michal y Noam – Save the Date"'),
    ('content="מתחתנים ב־27.10.2027. שמרו את התאריך!"', 'content="Nos casamos el 27.10.2027. ¡Reserva la fecha!"'),
    (f'<meta property="og:url" content="{SITE}">', f'<meta property="og:url" content="{SITE}es/">'),
    ('<meta property="og:locale" content="he_IL">', '<meta property="og:locale" content="es_ES">'),
    (f'content="{SITE}assets/og.jpg?v=', f'content="{SITE}assets/og-es.jpg?v='),
    ('content="Save the Date – החתונה של מיכל ונועם, 27.10.2027"',
     'content="Save the Date – La boda de Michal y Noam, 27.10.2027"'),
    ('aria-label="Save the Date – מיכל ונועם"', 'aria-label="Save the Date – Michal y Noam"'),
    ('<span class="lead">החתונה של</span>', '<span class="lead">La boda de</span>'),
    # Two lines, broken where a reader would pause
    ('<span class="names">מיכל ונועם</span>', '<span class="names">Michal<br>y Noam</span>'),
    ('<dt class="sr-only">תאריך</dt>', '<dt class="sr-only">Fecha</dt>'),
    ('<dt class="sr-only">תאריך עברי</dt>', '<dt class="sr-only">Fecha hebrea</dt>'),
    ('<dt class="sr-only">מקום</dt>', '<dt class="sr-only">Lugar</dt>'),
    ('aria-label="ספירה לאחור והוספה ליומן"', 'aria-label="Cuenta regresiva y calendario"'),
    # Left to right, the countdown reads from days down to seconds
    ('''              <span class="countdown__unit"><b data-unit="seconds">00</b><small>שניות</small></span>
              <span class="countdown__unit"><b data-unit="minutes">00</b><small>דקות</small></span>
              <span class="countdown__unit"><b data-unit="hours">00</b><small>שעות</small></span>
              <span class="countdown__unit"><b data-unit="days">000</b><small>ימים</small></span>''',
     '''              <span class="countdown__unit"><b data-unit="days">000</b><small>días</small></span>
              <span class="countdown__unit"><b data-unit="hours">00</b><small>horas</small></span>
              <span class="countdown__unit"><b data-unit="minutes">00</b><small>minutos</small></span>
              <span class="countdown__unit"><b data-unit="seconds">00</b><small>segundos</small></span>'''),
    ("                הוספה ליומן Google\n", "                Añadir al calendario\n"),
    ('aria-label="הסרטון שלנו באינסטגרם"', 'aria-label="Nuestro vídeo en Instagram"'),
    # The page lives one folder down, so shared files are one level up
    ('href="assets/', 'href="../assets/'),
    ('href="styles.css"', 'href="../styles.css"'),
    ('src="main.js"', 'src="../main.js"'),
]


def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for old, new in REPLACEMENTS:
        if old not in html:
            raise SystemExit(f"Not found in index.html, update tools/make-spanish.py:\n{old}")
        html = html.replace(old, new)

    # Any Hebrew left outside comments is text this script doesn't translate yet
    visible = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    leftover = sorted(set(re.findall(r"[֐-׿][֐-׿\s״׳־,!.]*", visible)))
    if leftover:
        raise SystemExit("Untranslated Hebrew in the Spanish page: " + " | ".join(leftover))

    out = ROOT / "es" / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"Wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
