"""
extract_scores.py 

Reads the Fall 2020 evaluation file and pulls out the scores.

Produces two files:
  data/processed/evaluations_clean.csv  - scores we can use
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

# The Fall 2020 file we chose in Phase 3
FALL_2020 = (
    RAW_DIR
    / "2 Years Data for Teaching Evaluation Surveys Results"
    / "Teaching Evaluation Fall 2020"
    / "20201.xlsx"
)


# ---------------------------------------------------------------
# REUSABLE INSTRUCTIONS
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

        # The Sequence number sits in column 2
        sequence = clean(sheet.iloc[row_number, 2])

        # Skip rows where Sequence is not a number
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


# ---------------------------------------------------------------
# LOAD THE UKPSF LOOKUP MADE IN PHASE 5
# ---------------------------------------------------------------

# An empty box to hold the mapping
ukpsf = {}

# Read the lookup file one row at a time
with open(LOOKUP_DIR / "ukpsf_questions.csv", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        ukpsf[int(row["QuestionNumber"])] = row

print("UKPSF lookup loaded:", len(ukpsf), "questions")


# ---------------------------------------------------------------
# OPEN THE FALL 2020 FILE
# ---------------------------------------------------------------

# Open it
#   header=None  -> do not treat the first row as column names
#   dtype=str    -> read every cell as text, so leading zeros survive
sheet = pd.read_excel(FALL_2020, header=None, dtype=str)

print("File    :", FALL_2020.name)
print("Rows    :", sheet.shape[0])
print("Columns :", sheet.shape[1])


# ---------------------------------------------------------------
# FIND WHERE EACH BLOCK BEGINS
# ---------------------------------------------------------------

# A list to hold the row number where each block begins
block_starts = []

# Look at every row in the file
for row_number in range(len(sheet)):

    # A block begins wherever column 1 says "Course Code"
    if clean(sheet.iloc[row_number, 1]) == "Course Code":
        block_starts.append(row_number)

print("Blocks found:", len(block_starts))


# ---------------------------------------------------------------
# READ EVERY BLOCK
# ---------------------------------------------------------------

# A list to hold every score from the whole file
all_rows = []

# Go through each block in turn
for i in range(len(block_starts)):

    # Where this block starts
    start = block_starts[i]

    # Where the next block starts, or the end of the file
    if i + 1 < len(block_starts):
        end = block_starts[i + 1]
    else:
        end = len(sheet)

    # Read this block's header details
    header = read_header(sheet, start)

    # Read this block's 20 scores
    for score in read_scores(sheet, start, end):

        # Look up the UKPSF category for this question number
        mapping = ukpsf.get(score["QuestionNumber"], {})

        # Combine the header details with this one score
        all_rows.append({
            "SemesterCode": "20201",
            "SemesterName": "Fall 2020",
            "AcademicYear": "2020/2021",
            "SemesterOrder": 1,
            "CourseCode": header.get("Course Code", ""),
            "CourseName": header.get("Course Name", ""),
            "Degree": header.get("Degree", ""),
            "Section": header.get("Section", ""),
            "CourseEdition": header.get("Edition", ""),
            "FacultyID": header.get("Instructor ID", ""),
            "FacultyNameRaw": header.get("Instructor Name", ""),
            "EvaluatedStudents": header.get("Eval Students", ""),
            "QuestionNumber": score["QuestionNumber"],
            "UKPSFCategory": mapping.get("UKPSFCategory", ""),
            "UKPSFCode": mapping.get("UKPSFCode", ""),
            "ScorePercentage": score["Score"],
            "DataQualityStatus": check(score["Score"]),
            "SourceFile": FALL_2020.name,
            "SourceRow": score["SourceRow"],
        })

print("Rows produced:", len(all_rows))


# ---------------------------------------------------------------
# SPLIT INTO USABLE AND EXCLUDED, THEN SAVE
# ---------------------------------------------------------------

# Scores we can calculate with
valid = [r for r in all_rows if r["DataQualityStatus"] == "VALID"]

# Scores we cannot use, kept so nothing disappears silently
excluded = [r for r in all_rows if r["DataQualityStatus"] != "VALID"]

# Make sure the output folders exist
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
QUALITY_DIR.mkdir(parents=True, exist_ok=True)

# Save the clean data
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


# ---------------------------------------------------------------
# SHOW THE SUMMARY
# ---------------------------------------------------------------

print()
print("Total rows read :", len(all_rows))
print("Valid           :", len(valid))
print("Excluded        :", len(excluded))
print()
print("Saved: data/processed/evaluations_clean.csv")
print("Saved: data/quality/excluded_records.csv")
