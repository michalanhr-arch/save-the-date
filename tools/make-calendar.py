"""Builds the calendar files that iPhones (and Outlook) add the wedding from.

Keep the event in step with WEDDING and TEXTS in main.js. Run after changing either:
    python3 tools/make-calendar.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

START = "20271027T163000Z"  # 19:30 in Israel (UTC+3)
END = "20271028T000000Z"  # 03:00
LOCATION = "צל החורש, בית ברל"
# Reminders, before the start
ALARMS = ["-PT3H", "-P7D"]

TEXTS = {
    "he": ("החתונה של מיכל ונועם 🎉", "מצפים לראותכם בחתונת השנה!"),
    "es": ("La boda de Michal y Noam 🎉", "¡Os esperamos en la boda del año!"),
}


def escape(text):
    return text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def fold(line):
    """Splits a line into 75-byte pieces, as calendar files require, without breaking a character."""
    out, current = [], b""
    for ch in line:
        b = ch.encode("utf-8")
        if len(current) + len(b) > 75:
            out.append(current)
            current = b" "
        current += b
    out.append(current)
    return b"\r\n".join(out)


def build(lang):
    title, details = TEXTS[lang]
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//michalandnoam.com//Save the Date//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:wedding-{lang}@michalandnoam.com",
        "DTSTAMP:20261114T000000Z",
        f"DTSTART:{START}",
        f"DTEND:{END}",
        f"SUMMARY:{escape(title)}",
        f"DESCRIPTION:{escape(details)}",
        f"LOCATION:{escape(LOCATION)}",
        "URL:https://michalandnoam.com/" + ("es/" if lang == "es" else ""),
    ]
    for trigger in ALARMS:
        lines += ["BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{escape(title)}", f"TRIGGER:{trigger}", "END:VALARM"]
    lines += ["END:VEVENT", "END:VCALENDAR"]
    return b"\r\n".join(fold(l) for l in lines) + b"\r\n"


def main():
    for lang in TEXTS:
        out = ROOT / "assets" / f"wedding-{lang}.ics"
        out.write_bytes(build(lang))
        print(f"Wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
