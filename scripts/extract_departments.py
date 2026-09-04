"""
extract_departments.py

Builds the course-to-department lookup by reading the timetable PDFs.

The evaluation spreadsheets contain no department field. The timetable
PDFs do: each page carries a "Dept :" header, and every course listed
underneath it belongs to that department.

Reads:
  data/raw/extracted/.../Time table 20201.pdf
  data/raw/extracted/.../Time table 20211.pdf
  data/raw/extracted/.../Timetable 20212.pdf

Writes:
  data/lookups/course_departments.csv

Reads the source files only. Never changes them.

Run from the project folder:  python scripts/extract_departments.py
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

# One timetable per semester. Duplicate copies are ignored.
TIMETABLES = [
    ("20201", "Fall 2020",
     PACKAGE / "Teaching Evaluation Fall 2020" / "Time table 20201.pdf"),
    ("20212", "Spring 2021",
     PACKAGE / "Teaching Evaluation Spring 2021" / "Timetable 20212.pdf"),
    ("20211", "Fall 2021",
     PACKAGE / "Teaching Evaluation Fall 2021" / "CSMIS" / "Time table 20211.pdf"),
]


# ---------------------------------------------------------------
# SMALL REUSABLE INSTRUCTIONS
# ---------------------------------------------------------------

# Tidy a course code. Some codes carry a trailing asterisk in one
# file and not in another, so we strip it to make them match.
def tidy_code(code):
    return code.replace("*", "").strip()


# Tidy a department name and correct the one spelling mistake in
# the source. "Sceinces" appears that way in every timetable.
def tidy_department(name):
    name = " ".join(name.split())
    if name == "Computer Sceinces":
        return "Computer Sciences"
    return name


# ---------------------------------------------------------------
# READ ONE TIMETABLE
# ---------------------------------------------------------------

# Go through a timetable PDF and note which department each course
# sits under. Pages are grouped by department, with a "Dept :" line
# at the top of each one.
def read_timetable(path):

    found = {}
    rows_read = 0

    with pdfplumber.open(path) as pdf:

        current_department = None

        for page in pdf.pages:

            text = page.extract_text() or ""

            # A new department heading resets which one we are in
            heading = re.search(r"Dept\s*:\s*(.+)", text)
            if heading:
                current_department = tidy_department(heading.group(1))

            # Course rows start with a sequence number, then a
            # six-digit course code
            for code in re.findall(r"^\s*\d+\s+(\d{6}\*?)\s", text, flags=re.M):
                if current_department:
                    found[tidy_code(code)] = current_department
                    rows_read = rows_read + 1

    return found, rows_read


# ---------------------------------------------------------------
# READ EVERY TIMETABLE
# ---------------------------------------------------------------

print("Reading timetable PDFs:")

# course code -> {semester: department}
by_course = {}

for code, name, path in TIMETABLES:

    if not path.exists():
        print(f"  {name:<13} FILE NOT FOUND: {path.name}")
        continue

    found, rows_read = read_timetable(path)

    for course, department in found.items():
        by_course.setdefault(course, {})[name] = department

    print(f"  {name:<13} {rows_read:>4} course rows"
          f"   {len(found):>4} distinct courses")


# ---------------------------------------------------------------
# CHECK THE SEMESTERS AGREE
# ---------------------------------------------------------------

# A course should belong to the same department in every semester.
# If it does not, we record the disagreement rather than choosing.
conflicts = []
for course, per_semester in by_course.items():
    departments = set(per_semester.values())
    if len(departments) > 1:
        conflicts.append((course, per_semester))

print()
print("Distinct courses      :", len(by_course))
print("Departments found     :",
      len({d for s in by_course.values() for d in s.values()}))
print("Courses disagreeing across semesters:", len(conflicts))

for course, per_semester in conflicts[:10]:
    print(f"   {course}: {per_semester}")


# ---------------------------------------------------------------
# SAVE THE LOOKUP
# ---------------------------------------------------------------

LOOKUP_DIR.mkdir(parents=True, exist_ok=True)
output = LOOKUP_DIR / "course_departments.csv"

records = []
for course in sorted(by_course):
    per_semester = by_course[course]

    # Where semesters agree there is one answer. Where they do not,
    # take the most recent and flag it so nothing is hidden.
    departments = list(per_semester.values())
    department = departments[-1]
    agreed = len(set(departments)) == 1

    records.append({
        "CourseCode": course,
        "DepartmentName": department,
        "SemestersSeen": len(per_semester),
        "ConsistentAcrossSemesters": "Yes" if agreed else "No",
        "Source": "Timetable PDFs",
    })

with open(output, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=records[0].keys())
    writer.writeheader()
    writer.writerows(records)

print()
print("Saved:", output)
print(f"       {len(records)} courses")


# ---------------------------------------------------------------
# SHOW WHAT WE FOUND
# ---------------------------------------------------------------

counts = {}
for record in records:
    name = record["DepartmentName"]
    counts[name] = counts.get(name, 0) + 1

print()
print("Courses per department:")
for name in sorted(counts, key=lambda n: -counts[n]):
    print(f"   {name:<34} {counts[name]:>4}")
