"""
export_for_web.py

Splits metrics.json into smaller files the website can load quickly.

Reads:
  data/processed/metrics.json

Writes:
  public/data/overview.json          - everything the /overview page needs
  public/data/faculty-list.json      - just names and scores, for the dropdown
  public/data/faculty/<id>.json      - one file per teacher, loaded on demand

Run from the project folder:  python scripts/export_for_web.py
"""

from pathlib import Path
import json
import shutil

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"

# public/ is the folder Next.js serves files from
WEB_DATA = PROJECT_ROOT / "public" / "data"
WEB_FACULTY = WEB_DATA / "faculty"


# Work out how big a file is, in kilobytes
def size_kb(path):
    return round(path.stat().st_size / 1024, 1)


# ---------------------------------------------------------------
# LOAD THE METRICS
# ---------------------------------------------------------------

with open(PROCESSED_DIR / "metrics.json", encoding="utf-8") as f:
    metrics = json.load(f)

print("Loaded metrics.json"
      f"  ({size_kb(PROCESSED_DIR / 'metrics.json')} KB)")
print()


# ---------------------------------------------------------------
# MAKE THE OUTPUT FOLDERS
# ---------------------------------------------------------------

# Start clean so old files never linger
if WEB_DATA.exists():
    shutil.rmtree(WEB_DATA)

WEB_FACULTY.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------
# FILE 1 - THE OVERVIEW PAGE
# ---------------------------------------------------------------

# Everything the institutional page needs, and nothing more.
overview = {
    "target": metrics["target"],
    "institution": metrics["institution"],
    "participation": metrics["participation"],
    "coverage": metrics["coverage"],
    "bySemester": metrics["bySemester"],
    "byAcademicYear": metrics["byAcademicYear"],
    "byUkpsfCategory": metrics["byUkpsfCategory"],
    "byUkpsfCode": metrics["byUkpsfCode"],
    "byQuestion": metrics["byQuestion"],
    "byCourse": metrics["byCourse"],
    "byDepartment": metrics["byDepartment"],
    "byProgramme": metrics["byProgramme"],
    "improvement": metrics["improvement"],
}

# Data quality figures, so the dashboard can be honest about coverage
quality_path = PROJECT_ROOT / "data" / "quality" / "excluded_records.csv"
excluded_total = 0
excluded_reasons = {}
if quality_path.exists():
    import csv
    with open(quality_path, encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            excluded_total += 1
            reason = row.get("DataQualityStatus", "UNKNOWN")
            excluded_reasons[reason] = excluded_reasons.get(reason, 0) + 1

overview["dataQuality"] = {
    "validRecords": metrics["institution"]["questionCount"],
    "excludedRecords": excluded_total,
    "excludedReasons": excluded_reasons,
    "semestersWithQuestionData": len(metrics["bySemester"]),
    "semestersSupplied": 4,
    "note": (
        "Spring 2022 was supplied as department summaries only, with no "
        "question-level data. Department and programme fields are absent "
        "from all evaluation files."
    ),
}

# Count how many faculty and courses fall below the target
faculty_below = [f for f in metrics["byFaculty"].values()
                 if f["status"] == "Improvement Required"]
course_below = [c for c in metrics["byCourse"].values()
                if c["status"] == "Improvement Required"]

overview["improvementSummary"] = {
    "facultyTotal": len(metrics["byFaculty"]),
    "facultyBelow": len(faculty_below),
    "facultyBelowPercent": round(
        len(faculty_below) / len(metrics["byFaculty"]) * 100, 1),
    "courseTotal": len(metrics["byCourse"]),
    "courseBelow": len(course_below),
    "courseBelowPercent": round(
        len(course_below) / len(metrics["byCourse"]) * 100, 1),
}

with open(WEB_DATA / "overview.json", "w", encoding="utf-8") as f:
    json.dump(overview, f, ensure_ascii=False)

print(f"overview.json        {size_kb(WEB_DATA / 'overview.json'):>7} KB")


# ---------------------------------------------------------------
# FILE 2 - THE FACULTY DROPDOWN LIST
# ---------------------------------------------------------------

# Only what the dropdown needs. The full detail is fetched later.
faculty_list = []
for fid, detail in metrics["facultyDetail"].items():
    faculty_list.append({
        "id": fid,
        "name": detail["name"],
        "score": detail["overall"]["score"],
        "status": detail["overall"]["status"],
        "classCount": detail["classCount"],
        "semesters": sorted(
            detail["bySemester"].keys(),
            key=lambda k: detail["bySemester"][k]["semesterOrder"]),
    })

faculty_list.sort(key=lambda f: f["name"])

with open(WEB_DATA / "faculty-list.json", "w", encoding="utf-8") as f:
    json.dump({"faculty": faculty_list}, f, ensure_ascii=False)

print(f"faculty-list.json    {size_kb(WEB_DATA / 'faculty-list.json'):>7} KB"
      f"   ({len(faculty_list)} faculty)")


# ---------------------------------------------------------------
# FILE 3 - QUESTION TRACKING BY DEGREE LEVEL
# ---------------------------------------------------------------

with open(WEB_DATA / "question-tracking.json", "w", encoding="utf-8") as f:
    json.dump({"byDegree": metrics["questionTracking"]}, f, ensure_ascii=False)

print(f"question-tracking.json {size_kb(WEB_DATA / 'question-tracking.json'):>5} KB"
      f"   ({len(metrics['questionTracking'])} degree levels)")


# ---------------------------------------------------------------
# FILE 3 - ONE FILE PER TEACHER
# ---------------------------------------------------------------

# The browser fetches only the teacher the user selected.
largest = 0
for fid, detail in metrics["facultyDetail"].items():

    # Add the benchmarks so the page can compare without extra loading
    detail["benchmarks"] = {
        "institution": metrics["institution"]["score"],
        "target": metrics["target"],
    }

    path = WEB_FACULTY / f"{fid}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(detail, f, ensure_ascii=False)

    largest = max(largest, path.stat().st_size)

print(f"faculty/*.json       {round(largest / 1024, 1):>7} KB"
      f"   (largest of {len(metrics['facultyDetail'])} files)")


# ---------------------------------------------------------------
# SUMMARY
# ---------------------------------------------------------------

print()
print("A visitor to /overview loads one file.")
print("A visitor to /faculty loads the list, then one teacher's file.")
print("Nobody ever downloads all 74 teachers at once.")
print()
print("Saved to public/data/")
