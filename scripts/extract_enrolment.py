"""
extract_enrolment.py

Builds the class-section enrolment lookup by reading the timetable PDFs.

The evaluation spreadsheets say how many students answered a survey
("Eval Students") but not how many were enrolled in the class, so on
their own they cannot give a response rate. The timetables can: every
course row ends with a Capacity and an Enroll figure for that section.

Reads:
  data/raw/extracted/.../Time table 20201.pdf
  data/raw/extracted/.../Time table 20211.pdf
  data/raw/extracted/.../Timetable 20212.pdf

Writes:
  data/lookups/section_enrolment.csv

Reads the source files only. Never changes them.

Run from the project folder:  python scripts/extract_enrolment.py
"""

# ---------------------------------------------------------------
# TOOLS WE BORROW FROM PYTHON
# ---------------------------------------------------------------

# Handles folder locations
from pathlib import Path

# Reads PDF files
import pdfplumber

# Finds patterns in text
import re

# Writes CSV files
import csv


# ---------------------------------------------------------------
# SETTINGS - where everything lives
# ---------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_ROOT / "data" / "raw" / "extracted"
LOOKUP_DIR = PROJECT_ROOT / "data" / "lookups"

PACKAGE = RAW_DIR / "2 Years Data for Teaching Evaluation Surveys Results"

# The same three timetables the department lookup reads
TIMETABLES = [
    ("20201", "Fall 2020",
     PACKAGE / "Teaching Evaluation Fall 2020" / "Time table 20201.pdf"),
    ("20212", "Spring 2021",
     PACKAGE / "Teaching Evaluation Spring 2021" / "Timetable 20212.pdf"),
    ("20211", "Fall 2021",
     PACKAGE / "Teaching Evaluation Fall 2021" / "CSMIS" / "Time table 20211.pdf"),
]

# One timetable row looks like this:
#
#   7 102106 Entrepreneurship 2 Evening Theoritcal - AC-003 ( .. ) Dr.Asaad 40 39
#   |  |     |                | |                                          |  |
#   |  code  name        section study type ..                      capacity  enrolled
#
# The study type is the anchor: it always follows the section number,
# and it is either a time of day or the word "Foundation". Capacity and
# enrolment are the last two numbers on the line.
ROW = re.compile(
    r"^\s*\d+\s+(\d{6})\*?\s+.*?\s+(\d+)\s+"
    r"(?:Morning|Evening|Foundation)\b.*?(\d+)\s+(\d+)\s*$"
)

# A row we should have read but could not match
LOOKS_LIKE_A_ROW = re.compile(r"^\s*\d+\s+\d{6}\*?\s")


# ---------------------------------------------------------------
# READ ONE TIMETABLE
# ---------------------------------------------------------------

# Go through a timetable PDF and note the capacity and enrolment of
# every class section it lists.
def read_timetable(path):

    found = {}
    skipped = []

    with pdfplumber.open(path) as pdf:

        for page in pdf.pages:

            for line in (page.extract_text() or "").split("\n"):

                # Only course rows are of interest here
                if not LOOKS_LIKE_A_ROW.match(line):
                    continue

                match = ROW.match(line)

                # A row we recognised but could not read is worth
                # showing, rather than quietly dropping
                if not match:
                    skipped.append(line.strip())
                    continue

                course = match.group(1)
                section = match.group(2)
                capacity = int(match.group(3))
                enrolled = int(match.group(4))

                found[(course, section)] = (capacity, enrolled)

    return found, skipped


# ---------------------------------------------------------------
# READ EVERY TIMETABLE
# ---------------------------------------------------------------

print("Reading timetable PDFs:")

records = []
total_skipped = 0

for code, name, path in TIMETABLES:

    if not path.exists():
        print(f"  {name:<13} FILE NOT FOUND: {path.name}")
        continue

    found, skipped = read_timetable(path)
    total_skipped = total_skipped + len(skipped)

    for (course, section), (capacity, enrolled) in sorted(found.items()):
        records.append({
            "SemesterCode": code,
            "SemesterName": name,
            "CourseCode": course,
            "Section": section,
            "Capacity": capacity,
            "Enrolled": enrolled,
            "Source": path.name,
        })

    enrolled_total = sum(v[1] for v in found.values())

    print(f"  {name:<13} {len(found):>4} sections"
          f"   {enrolled_total:>6,} enrolled"
          f"   {len(skipped):>3} unreadable rows")

    for line in skipped[:3]:
        print(f"      could not read: {line[:90]}")


# ---------------------------------------------------------------
# SAVE THE LOOKUP
# ---------------------------------------------------------------

LOOKUP_DIR.mkdir(parents=True, exist_ok=True)
output = LOOKUP_DIR / "section_enrolment.csv"

with open(output, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=records[0].keys())
    writer.writeheader()
    writer.writerows(records)

print()
print("Saved:", output)
print(f"       {len(records)} class sections"
      f"   {sum(r['Enrolled'] for r in records):,} enrolled places")

if total_skipped:
    print()
    print(f"WARNING: {total_skipped} course rows could not be read.")
