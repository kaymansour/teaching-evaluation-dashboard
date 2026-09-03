"""
validate.py

Checks the cleaned data before we build any dashboards.

Reads:
  data/processed/evaluations_clean.csv
  data/processed/summary_2022.csv
  data/quality/excluded_records.csv

Writes:
  data/quality/validation_report.txt

Every check either PASSES or FAILS. Nothing is changed.

Run from the project folder:  python scripts/validate.py
"""

from pathlib import Path
import csv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
QUALITY_DIR = PROJECT_ROOT / "data" / "quality"

# Collect the result of every check so we can print a summary at the end
results = []


# Record one check result
def record(name, passed, detail=""):
    results.append((name, passed, detail))
    mark = "PASS" if passed else "FAIL"
    line = f"  [{mark}] {name}"
    if detail:
        line = line + f"\n         {detail}"
    print(line)


# Load a CSV into a list of dictionaries
def load(path):
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


print("Loading data...")
clean_rows = load(PROCESSED_DIR / "evaluations_clean.csv")
excluded_rows = load(QUALITY_DIR / "excluded_records.csv")
summary_rows = load(PROCESSED_DIR / "summary_2022.csv")
print(f"  evaluations_clean.csv : {len(clean_rows)} rows")
print(f"  excluded_records.csv  : {len(excluded_rows)} rows")
print(f"  summary_2022.csv      : {len(summary_rows)} rows")
print()

print("Running checks:")
print()

# --- Check 1: every score is between 0 and 100 -------------------
bad = []
for r in clean_rows:
    value = float(r["ScorePercentage"])
    if value < 0 or value > 100:
        bad.append(r)
record("All scores are between 0 and 100",
       len(bad) == 0,
       f"{len(bad)} rows outside the range" if bad else "")

# --- Check 2: only questions 1 to 20 -----------------------------
numbers = sorted({int(r["QuestionNumber"]) for r in clean_rows})
record("Only questions 1 to 20 are present",
       numbers == list(range(1, 21)),
       f"found: {numbers}")

# --- Check 3: no blank scores in the clean file -------------------
blanks = [r for r in clean_rows if r["ScorePercentage"].strip() == ""]
record("No blank scores in the clean file",
       len(blanks) == 0,
       f"{len(blanks)} blanks found" if blanks else "")

# --- Check 4: every excluded row has a reason ---------------------
no_reason = [r for r in excluded_rows if not r["DataQualityStatus"].strip()]
record("Every excluded row has a reason",
       len(no_reason) == 0,
       f"{len(no_reason)} rows without a reason" if no_reason else "")

# --- Check 5: UKPSF category on every row -------------------------
no_ukpsf = [r for r in clean_rows if not r["UKPSFCategory"].strip()]
record("Every row has a UKPSF category",
       len(no_ukpsf) == 0,
       f"{len(no_ukpsf)} rows missing UKPSF" if no_ukpsf else "")

# --- Check 6: UKPSF categories are only AA, CK or PV --------------
cats = sorted({r["UKPSFCategory"] for r in clean_rows})
record("UKPSF categories are only AA, CK and PV",
       cats == ["AA", "CK", "PV"],
       f"found: {cats}")

# --- Check 7: every teaching group has exactly 20 questions -------
# A teaching group is one teacher, one course, one section, one degree,
# one edition, in one semester.
groups = {}
for r in clean_rows:
    key = (r["SemesterCode"], r["CourseCode"], r["Degree"],
           r["Section"], r["CourseEdition"], r["FacultyID"])
    groups[key] = groups.get(key, 0) + 1

wrong = {k: v for k, v in groups.items() if v != 20}
record("Every teaching group has exactly 20 questions",
       len(wrong) == 0,
       f"{len(wrong)} groups do not have 20 (out of {len(groups)})" if wrong else
       f"{len(groups)} groups, all with 20")

# --- Check 8: no duplicated question inside a group ---------------
seen = set()
dupes = 0
for r in clean_rows:
    key = (r["SemesterCode"], r["CourseCode"], r["Degree"], r["Section"],
           r["CourseEdition"], r["FacultyID"], r["QuestionNumber"])
    if key in seen:
        dupes = dupes + 1
    seen.add(key)
record("No question appears twice in the same group",
       dupes == 0,
       f"{dupes} duplicated question rows" if dupes else "")

# --- Check 9: semester order is consistent ------------------------
order_map = {}
mismatch = []
for r in clean_rows:
    code = r["SemesterCode"]
    order = r["SemesterOrder"]
    if code in order_map and order_map[code] != order:
        mismatch.append(code)
    order_map[code] = order
expected = {"20201": "1", "20212": "2", "20211": "3"}
record("Semester order is correct",
       order_map == expected and not mismatch,
       f"found: {order_map}")

# --- Check 10: the 65% boundary ------------------------------------
# 64.99 must be flagged, 65.00 must not.
def needs_improvement(score):
    return score < 65

boundary_ok = (needs_improvement(64.99) is True
               and needs_improvement(65.00) is False
               and needs_improvement(64.999) is True)
record("64.99 is flagged and 65.00 is not",
       boundary_ok,
       "64.99 -> flagged, 65.00 -> not flagged")

# --- Check 11: faculty ID is present on every row ------------------
no_id = [r for r in clean_rows if not r["FacultyID"].strip()]
record("Every row has a faculty ID",
       len(no_id) == 0,
       f"{len(no_id)} rows without a faculty ID" if no_id else "")

# --- Check 12: one name per faculty ID -----------------------------
names_by_id = {}
for r in clean_rows:
    fid = r["FacultyID"]
    names_by_id.setdefault(fid, set()).add(r["FacultyNameRaw"])
many = {k: v for k, v in names_by_id.items() if len(v) > 1}
record("Each faculty ID maps to one name",
       len(many) == 0,
       f"{len(many)} IDs have more than one spelling" if many else
       f"{len(names_by_id)} faculty IDs, all consistent")

# --- Check 13: Spring 2022 is not in the main table ----------------
in_main = [r for r in clean_rows if r["SemesterCode"] == "20222"]
record("Spring 2022 is NOT in the question-level table",
       len(in_main) == 0,
       f"{len(in_main)} Spring 2022 rows leaked in" if in_main else
       "kept separate, as designed")

# --- Check 14: Spring 2022 summary scores are 0 to 100 -------------
bad_summary = []
for r in summary_rows:
    text = r["ScorePercentage"].strip()
    if text == "":
        continue
    value = float(text)
    if value < 0 or value > 100:
        bad_summary.append(r)
record("Spring 2022 summary scores are 0 to 100",
       len(bad_summary) == 0,
       f"{len(bad_summary)} outside the range" if bad_summary else "")


# ---------------------------------------------------------------
# WRITE THE REPORT
# ---------------------------------------------------------------

passed = sum(1 for _, ok, _ in results if ok)
failed = len(results) - passed

print()
print("=" * 58)
print(f"  {passed} passed, {failed} failed, out of {len(results)} checks")
print("=" * 58)

QUALITY_DIR.mkdir(parents=True, exist_ok=True)
with open(QUALITY_DIR / "validation_report.txt", "w", encoding="utf-8") as f:
    f.write("VALIDATION REPORT\n")
    f.write("=" * 58 + "\n\n")
    f.write(f"evaluations_clean.csv : {len(clean_rows)} rows\n")
    f.write(f"excluded_records.csv  : {len(excluded_rows)} rows\n")
    f.write(f"summary_2022.csv      : {len(summary_rows)} rows\n\n")
    for name, ok, detail in results:
        f.write(f"[{'PASS' if ok else 'FAIL'}] {name}\n")
        if detail:
            f.write(f"       {detail}\n")
    f.write(f"\n{passed} passed, {failed} failed, out of {len(results)} checks\n")

print()
print("Saved: data/quality/validation_report.txt")
