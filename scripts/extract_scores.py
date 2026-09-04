"""
extract_scores.py

Reads all four semesters of teaching evaluation data.

Produces three files:
  data/processed/evaluations_clean.csv  - question-level scores we can use
  data/processed/summary_2022.csv       - Spring 2022, summary grain only
  data/quality/excluded_records.csv     - scores we cannot use, with reasons

Reads the source files only. Never changes them.

Run from the project folder:  python scripts/extract_scores.py
"""

# ---------------------------------------------------------------
# TOOLS WE BORROW FROM PYTHON
# ---------------------------------------------------------------

# Handles folder locations
from pathlib import Path

# Reads Excel files
import pandas as pd

# Writes CSV files
import csv


# ---------------------------------------------------------------
# SETTINGS - where everything lives
# ---------------------------------------------------------------

# Find the project folder (go up two levels from this script)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# The folder holding the unzipped data
RAW_DIR = PROJECT_ROOT / "data" / "raw" / "extracted"

# Where the clean output goes
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"

# Where the excluded rows go
QUALITY_DIR = PROJECT_ROOT / "data" / "quality"

# Where our lookup tables live
LOOKUP_DIR = PROJECT_ROOT / "data" / "lookups"

# The top folder inside the unzipped package
PACKAGE = RAW_DIR / "2 Years Data for Teaching Evaluation Surveys Results"

# The four sources chosen in Phase 3
FALL_2020 = PACKAGE / "Teaching Evaluation Fall 2020" / "20201.xlsx"
SPRING_2021 = PACKAGE / "Teaching Evaluation Spring 2021" / "Evaluation results 20212.xlsx"
FALL_2021 = PACKAGE / "Teaching Evaluation Fall 2021" / "CSMIS" / "Evaluation20211.xlsx"
SPRING_2022 = PACKAGE / "Teaching Evaluation Spring 2022" / "Final 20222 Teaching Evaluation"


# ---------------------------------------------------------------
# SMALL REUSABLE INSTRUCTIONS
# ---------------------------------------------------------------

# Tidy up one cell of text
def clean(value):

    # Empty cells come back as None
    if value is None:
        return ""

    # Turn it into text
    text = str(value)

    # pandas writes empty cells as the word "nan"
    if text == "nan":
        return ""

    # Replace the invisible non-breaking space with a normal space
    text = text.replace("\xa0", " ")

    # Squash repeated spaces and trim the ends
    return " ".join(text.split())


# Turn a score like "% 62.35" into the number 62.35
def to_number(text):

    # Tidy it and remove the percent sign
    text = clean(text).replace("%", "").strip()

    # An empty cell means no data - not zero
    if text == "":
        return None

    # Try to turn it into a number
    try:
        return float(text)
    except ValueError:
        return None


# Decide whether a score can be used
def check(score):

    # Blank means no data - never treat it as zero
    if score is None:
        return "NO_DATA"

    # Impossible - a percentage cannot exceed 100
    if score > 100:
        return "INVALID_ABOVE_100"

    # Impossible - a percentage cannot be negative
    if score < 0:
        return "INVALID_BELOW_0"

    # Everything else is usable
    return "VALID"


# The letters we expect a name to start with
ASCII_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


# Make a tidy version of a faculty name for display
def clean_name(name):

    # Start with the tidied text
    text = clean(name)

    # Some names begin with a stray character left over from a bad
    # export - an accented letter or an Arabic diacritic. Remove
    # anything at the front that is not a plain A-Z letter.
    trimmed = text
    while trimmed and trimmed[0] not in ASCII_LETTERS:
        trimmed = trimmed[1:]

    # One name is written entirely in Arabic, so trimming leaves
    # nothing. In that case keep the original rather than lose it.
    if trimmed == "":
        return text

    return trimmed


# ---------------------------------------------------------------
# LOAD THE UKPSF LOOKUP MADE IN PHASE 5
# ---------------------------------------------------------------

# An empty box to hold the mapping
ukpsf = {}

# Read the lookup file one row at a time
with open(LOOKUP_DIR / "ukpsf_questions.csv", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        ukpsf[int(row["QuestionNumber"])] = row


# ---------------------------------------------------------------
# LOAD THE COURSE-TO-DEPARTMENT LOOKUP
# ---------------------------------------------------------------

# Built by scripts/extract_departments.py from the timetable PDFs.
# The evaluation spreadsheets contain no department field.
departments = {}

department_file = LOOKUP_DIR / "course_departments.csv"
if department_file.exists():
    with open(department_file, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            departments[row["CourseCode"]] = row["DepartmentName"]


# Look up the department for a course code. Some codes carry a
# trailing asterisk in one file and not another, so strip it.
def find_department(course_code):
    return departments.get(course_code.replace("*", "").strip(), "")


# ---------------------------------------------------------------
# READER 1 - BLOCK FILES  (Fall 2020 and Fall 2021)
# ---------------------------------------------------------------

# Read the header details at the top of one block
def read_header(sheet, start_row):

    # An empty box to collect what we find
    header = {}

    # Look at the first 8 rows of the block
    for row_number in range(start_row, start_row + 8):

        # Stop if we run off the end of the file
        if row_number >= len(sheet):
            break

        # The left-hand pair: label in column 1, value in column 4
        left_label = clean(sheet.iloc[row_number, 1])
        left_value = clean(sheet.iloc[row_number, 4])

        # The right-hand pair: label in column 8, value in column 10
        right_label = clean(sheet.iloc[row_number, 8])
        right_value = clean(sheet.iloc[row_number, 10])

        # Save whichever labels we found
        if left_label:
            header[left_label] = left_value
        if right_label:
            header[right_label] = right_value

    # Hand the collected details back
    return header


# Read the question scores from one block
def read_scores(sheet, start_row, next_start):

    # A list to collect this block's scores
    scores = []

    # Look at every row from this block until the next one begins
    for row_number in range(start_row, next_start):

        # Stop if we run off the end of the file
        if row_number >= len(sheet):
            break

        # Sequence usually sits in column 2, but one Fall 2021 block
        # is shifted one column left. Try column 2, then column 1.
        sequence = clean(sheet.iloc[row_number, 2])
        if not sequence.isdigit():
            sequence = clean(sheet.iloc[row_number, 1])

        # Skip rows where Sequence is still not a number
        if not sequence.isdigit():
            continue

        number = int(sequence)

        # Keep only 1 to 20. Skip 21 and 22 - those are comment questions.
        if number < 1 or number > 20:
            continue

        # The score sits in column 11
        scores.append({
            "QuestionNumber": number,
            "Score": to_number(sheet.iloc[row_number, 11]),
            "SourceRow": row_number + 1,
        })

    return scores


# Read a whole block-format file
def read_blocks(path, code, name, year, order):

    # Open it as a raw grid
    #   header=None -> do not treat the first row as column names
    #   dtype=str   -> read every cell as text, so leading zeros survive
    sheet = pd.read_excel(path, header=None, dtype=str)

    # Find where each block begins
    starts = []
    for r in range(len(sheet)):
        if clean(sheet.iloc[r, 1]) == "Course Code":
            starts.append(r)

    rows = []

    # Go through each block in turn
    for i in range(len(starts)):

        start = starts[i]

        # Where the next block begins, or the end of the file
        if i + 1 < len(starts):
            end = starts[i + 1]
        else:
            end = len(sheet)

        # Read this block's header details
        header = read_header(sheet, start)

        # Read this block's scores and combine them with the header
        for score in read_scores(sheet, start, end):

            mapping = ukpsf.get(score["QuestionNumber"], {})

            rows.append({
                "SemesterCode": code,
                "SemesterName": name,
                "AcademicYear": year,
                "SemesterOrder": order,
                "CourseCode": header.get("Course Code", ""),
                "CourseName": header.get("Course Name", ""),
                "DepartmentName": find_department(header.get("Course Code", "")),
                "Degree": header.get("Degree", ""),
                "Section": header.get("Section", ""),
                "CourseEdition": header.get("Edition", ""),
                "FacultyID": header.get("Instructor ID", ""),
                "FacultyNameRaw": header.get("Instructor Name", ""),
                "FacultyNameClean": clean_name(header.get("Instructor Name", "")),
                "EvaluatedStudents": header.get("Eval Students", ""),
                "QuestionNumber": score["QuestionNumber"],
                "UKPSFCategory": mapping.get("UKPSFCategory", ""),
                "UKPSFCode": mapping.get("UKPSFCode", ""),
                "ScorePercentage": score["Score"],
                "DataQualityStatus": check(score["Score"]),
                "SourceFile": path.name,
                "SourceRow": score["SourceRow"],
            })

    # Report what this file gave us, so a shortfall is visible
    expected = len(starts) * 20
    print(f"  {path.name:<30} {len(starts):>4} blocks {len(rows):>5} rows"
          f"  (expected {expected})")

    return rows


# ---------------------------------------------------------------
# READER 2 - THE SPRING 2021 FLAT TABLE
# ---------------------------------------------------------------

# Read the Spring 2021 file, which is already a table
def read_spring_2021(path):

    # Open it as a raw grid
    sheet = pd.read_excel(path, header=None, dtype=str)

    # A list to collect the rows we keep
    rows = []

    # Count how many comment rows we throw away
    skipped_comments = 0

    # Row 0 is blank and row 1 holds the headings, so start at row 2
    for r in range(2, len(sheet)):

        # Comment questions start with "List the" - skip them
        description = clean(sheet.iloc[r, 8])
        if description.lower().startswith("list the"):
            skipped_comments = skipped_comments + 1
            continue

        # The question number sits in column 7
        question = clean(sheet.iloc[r, 7])

        # Skip anything that is not a number
        if not question.isdigit():
            continue

        number = int(question)

        # Keep only questions 1 to 20
        if number < 1 or number > 20:
            continue

        # Look up the UKPSF category
        mapping = ukpsf.get(number, {})

        # The score sits in column 10
        score = to_number(sheet.iloc[r, 10])

        rows.append({
            "SemesterCode": "20212",
            "SemesterName": "Spring 2021",
            "AcademicYear": "2020/2021",
            "SemesterOrder": 2,
            "CourseCode": clean(sheet.iloc[r, 0]),
            "CourseName": clean(sheet.iloc[r, 1]),
            "DepartmentName": find_department(clean(sheet.iloc[r, 0])),
            "Degree": clean(sheet.iloc[r, 2]),
            "Section": clean(sheet.iloc[r, 3]),
            "CourseEdition": clean(sheet.iloc[r, 6]),
            "FacultyID": clean(sheet.iloc[r, 4]),
            "FacultyNameRaw": clean(sheet.iloc[r, 5]),
            "FacultyNameClean": clean_name(sheet.iloc[r, 5]),
            "EvaluatedStudents": clean(sheet.iloc[r, 9]),
            "QuestionNumber": number,
            "UKPSFCategory": mapping.get("UKPSFCategory", ""),
            "UKPSFCode": mapping.get("UKPSFCode", ""),
            "ScorePercentage": score,
            "DataQualityStatus": check(score),
            "SourceFile": path.name,
            "SourceRow": r + 1,
        })

    print(f"  {path.name:<30} {'':>4}        {len(rows):>5} rows"
          f"  ({skipped_comments} comment rows skipped)")

    return rows


# ---------------------------------------------------------------
# READER 3 - THE SPRING 2022 SUMMARY GRIDS
# ---------------------------------------------------------------

# Read one Spring 2022 grid and turn it into a long list
def read_summary(path, dept, subject_kind):

    # Open it as a raw grid
    sheet = pd.read_excel(path, header=None, dtype=str)

    # Row 0 holds the column headings
    headers = []
    for c in range(sheet.shape[1]):
        headers.append(clean(sheet.iloc[0, c]))

    # Columns 5 onwards are the subjects. The last one is "Avg" - skip it.
    subject_cols = []
    for c in range(5, sheet.shape[1]):
        if headers[c] and headers[c] != "Avg":
            subject_cols.append(c)

    # Some headings repeat, so count them to spot duplicates
    name_counts = {}
    for c in subject_cols:
        name_counts[headers[c]] = name_counts.get(headers[c], 0) + 1

    rows = []

    # Go down the question rows
    for r in range(1, sheet.shape[0]):

        # The question number sits in column 4
        q = clean(sheet.iloc[r, 4])
        if not q.isdigit():
            continue

        number = int(q)
        if number < 1 or number > 20:
            continue

        mapping = ukpsf.get(number, {})

        # Go across the subject columns
        for c in subject_cols:

            name = headers[c]

            # If a heading appears twice, add the column number to tell them apart
            if name_counts[name] > 1:
                label = f"{name} (col {c})"
            else:
                label = name

            score = to_number(sheet.iloc[r, c])

            rows.append({
                "SemesterCode": "20222",
                "SemesterName": "Spring 2022",
                "AcademicYear": "2021/2022",
                "SemesterOrder": 4,
                "DepartmentCode": dept,
                "SubjectType": subject_kind,
                "SubjectLabel": label,
                "QuestionNumber": number,
                "UKPSFCategory": mapping.get("UKPSFCategory", ""),
                "UKPSFCode": mapping.get("UKPSFCode", ""),
                "ScorePercentage": score,
                "EvaluatedStudents": "",
                "DataQualityStatus": check(score),
                "DataGrain": "Summary",
                "SourceFile": f"{dept}/{path.name}",
                "SourceRow": r + 1,
            })

    print(f"  {dept}/{path.name:<18} {len(subject_cols):>3} {subject_kind:<7} columns"
          f"  {len(rows):>4} rows")

    return rows


# ---------------------------------------------------------------
# READ THE THREE QUESTION-LEVEL FILES
# ---------------------------------------------------------------

print("UKPSF lookup loaded:", len(ukpsf), "questions")
print()
print("Reading question-level files:")

# A list to hold every score from every file
all_rows = []

# Fall 2020 - block format
all_rows = all_rows + read_blocks(FALL_2020, "20201", "Fall 2020", "2020/2021", 1)

# Spring 2021 - flat table
all_rows = all_rows + read_spring_2021(SPRING_2021)

# Fall 2021 - block format
all_rows = all_rows + read_blocks(FALL_2021, "20211", "Fall 2021", "2021/2022", 3)


# ---------------------------------------------------------------
# READ SPRING 2022  (summary grain - kept in its own file)
# ---------------------------------------------------------------

print()
print("Reading Spring 2022 summaries:")

summary_rows = []

for dept in ["AFS", "CSMIS", "GFP", "ID"]:

    # Staff.xlsx holds course columns
    summary_rows = summary_rows + read_summary(
        SPRING_2022 / dept / "Staff.xlsx", dept, "Course")

    # Programme.xlsx holds faculty columns
    summary_rows = summary_rows + read_summary(
        SPRING_2022 / dept / "Programme.xlsx", dept, "Faculty")


# ---------------------------------------------------------------
# SPLIT INTO USABLE AND EXCLUDED, THEN SAVE EVERYTHING
# ---------------------------------------------------------------

# Scores we can calculate with
valid = [r for r in all_rows if r["DataQualityStatus"] == "VALID"]

# Scores we cannot use, kept so nothing disappears silently
excluded = [r for r in all_rows if r["DataQualityStatus"] != "VALID"]

# Make sure the output folders exist before writing anything
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
QUALITY_DIR.mkdir(parents=True, exist_ok=True)

# Save the clean question-level data
with open(PROCESSED_DIR / "evaluations_clean.csv", "w",
          newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=all_rows[0].keys())
    writer.writeheader()
    writer.writerows(valid)

# Save the excluded rows
with open(QUALITY_DIR / "excluded_records.csv", "w",
          newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=all_rows[0].keys())
    writer.writeheader()
    writer.writerows(excluded)

# Save Spring 2022 on its own - different grain from the main table
with open(PROCESSED_DIR / "summary_2022.csv", "w",
          newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(f, fieldnames=summary_rows[0].keys())
    writer.writeheader()
    writer.writerows(summary_rows)


# ---------------------------------------------------------------
# SHOW THE SUMMARY
# ---------------------------------------------------------------

print()
print("QUESTION-LEVEL DATA  (Fall 2020, Spring 2021, Fall 2021)")
print("  Total rows read :", len(all_rows))
print("  Valid           :", len(valid))
print("  Excluded        :", len(excluded))

# Break the exclusions down by reason
reasons = {}
for row in excluded:
    reason = row["DataQualityStatus"]
    reasons[reason] = reasons.get(reason, 0) + 1

print("  Excluded by reason:")
for reason in sorted(reasons):
    print(f"    {reason:<20} {reasons[reason]}")

print()
print("SUMMARY DATA  (Spring 2022)")
print("  Rows            :", len(summary_rows))

print()
print("Saved: data/processed/evaluations_clean.csv")
print("Saved: data/processed/summary_2022.csv")
print("Saved: data/quality/excluded_records.csv")
