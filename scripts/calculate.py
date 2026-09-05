"""
calculate.py

Turns the clean question-level data into the numbers the dashboards need.

Reads:
  data/processed/evaluations_clean.csv

Writes:
  data/processed/metrics.json

Every number here is calculated from the clean data. Nothing is copied
from the supplied summary workbooks.

Run from the project folder:  python scripts/calculate.py
"""

from pathlib import Path
import csv
import json

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
LOOKUP_DIR = PROJECT_ROOT / "data" / "lookups"

# The university's minimum acceptable score
TARGET = 65.0


# ---------------------------------------------------------------
# SMALL REUSABLE INSTRUCTIONS
# ---------------------------------------------------------------

# Work out the plain average of a list of numbers
def average(numbers):
    if not numbers:
        return None
    return round(sum(numbers) / len(numbers), 2)


# Decide whether a score needs improvement.
# Below 65 is flagged. Exactly 65.00 is not. No rounding.
def status(score):
    if score is None:
        return "NO_DATA"
    if score < TARGET:
        return "Improvement Required"
    return "Acceptable"


# How far a score sits from the 65% target, in percentage points
def gap(score):
    if score is None:
        return None
    return round(score - TARGET, 2)


# Build one result block from a list of rows
def summarise(rows):

    scores = [float(r["ScorePercentage"]) for r in rows]
    mean = average(scores)

    # How many separate teaching groups fed into this number
    groups = {(r["SemesterCode"], r["CourseCode"], r["Degree"],
               r["Section"], r["CourseEdition"], r["FacultyID"])
              for r in rows}

    return {
        "score": mean,
        "status": status(mean),
        "gap": gap(mean),
        "questionCount": len(scores),
        "groupCount": len(groups),
    }


# Group rows into buckets using a key function
def group_by(rows, key_function):
    buckets = {}
    for r in rows:
        key = key_function(r)
        buckets.setdefault(key, []).append(r)
    return buckets


# ---------------------------------------------------------------
# LOAD THE CLEAN DATA
# ---------------------------------------------------------------

with open(PROCESSED_DIR / "evaluations_clean.csv", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))

print("Loaded", len(rows), "question scores")

# How many students were enrolled in each class section, read from the
# timetable PDFs by scripts/extract_enrolment.py. Without it a response
# rate cannot be worked out, so its absence is reported rather than
# guessed around.
enrolment = {}
enrolment_path = LOOKUP_DIR / "section_enrolment.csv"

if enrolment_path.exists():
    with open(enrolment_path, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            key = (r["SemesterCode"], r["CourseCode"], r["Section"])
            enrolment[key] = int(r["Enrolled"])
    print("Loaded", len(enrolment), "class-section enrolments")
else:
    print("No section_enrolment.csv - run scripts/extract_enrolment.py")

print()


# Course codes carry a trailing marker in some files. Strip it so a
# section keys the same way everywhere it is counted.
def tidy_code(code):
    return code.replace("*", "").strip()


# ---------------------------------------------------------------
# WORK OUT ALL THE RESULTS
# ---------------------------------------------------------------

# The university as a whole
institution = summarise(rows)

# One result per semester
by_semester = {}
for code, sem_rows in group_by(rows, lambda r: r["SemesterCode"]).items():
    result = summarise(sem_rows)
    result["semesterName"] = sem_rows[0]["SemesterName"]
    result["semesterOrder"] = int(sem_rows[0]["SemesterOrder"])
    result["academicYear"] = sem_rows[0]["AcademicYear"]
    by_semester[code] = result

# One result per academic year
by_year = {}
for year, year_rows in group_by(rows, lambda r: r["AcademicYear"]).items():
    by_year[year] = summarise(year_rows)

# One result per UKPSF category (AA, CK, PV)
by_category = {}
for cat, cat_rows in group_by(rows, lambda r: r["UKPSFCategory"]).items():
    by_category[cat] = summarise(cat_rows)

# One result per UKPSF code (A1, A2, K1, V1 ...)
by_code = {}
for code, code_rows in group_by(rows, lambda r: r["UKPSFCode"]).items():
    by_code[code] = summarise(code_rows)

# One result per survey question
by_question = {}
for q, q_rows in group_by(rows, lambda r: int(r["QuestionNumber"])).items():
    result = summarise(q_rows)
    result["ukpsfCategory"] = q_rows[0]["UKPSFCategory"]
    result["ukpsfCode"] = q_rows[0]["UKPSFCode"]
    by_question[q] = result

# One result per faculty member
by_faculty = {}
for fid, f_rows in group_by(rows, lambda r: r["FacultyID"]).items():
    result = summarise(f_rows)
    result["name"] = f_rows[0]["FacultyNameClean"]
    result["semesters"] = sorted({r["SemesterName"] for r in f_rows})
    by_faculty[fid] = result

# One result per department
by_department = {}
for name, dept_rows in group_by(rows, lambda r: r["DepartmentName"]).items():
    if not name:
        continue
    result = summarise(dept_rows)
    result["name"] = name
    result["facultyCount"] = len({r["FacultyID"] for r in dept_rows})
    result["courseCount"] = len({r["CourseCode"] for r in dept_rows})

    # This department's score in each semester, for the trend
    semesters = {}
    for sem, sem_rows in group_by(dept_rows, lambda r: r["SemesterCode"]).items():
        entry = summarise(sem_rows)
        entry["semesterName"] = sem_rows[0]["SemesterName"]
        entry["semesterOrder"] = int(sem_rows[0]["SemesterOrder"])
        semesters[sem] = entry
    result["bySemester"] = semesters

    # This department's UKPSF scores
    categories = {}
    for cat, cat_rows in group_by(dept_rows, lambda r: r["UKPSFCategory"]).items():
        categories[cat] = summarise(cat_rows)
    result["ukpsfCategories"] = categories

    by_department[name] = result


# --- Requirement 2: programme results ---------------------------------
# The source data has no field called "Programme". A programme is
# constructed as a degree level within a department, which is how
# universities normally describe one: "Bachelor in Accounting".
by_programme = {}
for key, prog_rows in group_by(
    rows, lambda r: (r["DepartmentName"], r["Degree"])
).items():

    department, degree = key
    if not department or not degree:
        continue

    result = summarise(prog_rows)
    result["name"] = f"{degree} in {department}"
    result["department"] = department
    result["degree"] = degree
    result["facultyCount"] = len({r["FacultyID"] for r in prog_rows})
    result["courseCount"] = len({r["CourseCode"] for r in prog_rows})

    # Flag programmes built on very few answers, so a score based on
    # one class is not read as confidently as one based on hundreds
    result["reliable"] = result["questionCount"] >= 100

    # This programme's score in each semester
    semesters = {}
    for sem, sem_rows in group_by(prog_rows, lambda r: r["SemesterCode"]).items():
        entry = summarise(sem_rows)
        entry["semesterName"] = sem_rows[0]["SemesterName"]
        entry["semesterOrder"] = int(sem_rows[0]["SemesterOrder"])
        semesters[sem] = entry
    result["bySemester"] = semesters

    # This programme's UKPSF scores
    categories = {}
    for cat, cat_rows in group_by(prog_rows, lambda r: r["UKPSFCategory"]).items():
        categories[cat] = summarise(cat_rows)
    result["ukpsfCategories"] = categories

    by_programme[result["name"]] = result


# One result per course
by_course = {}
for cc, c_rows in group_by(rows, lambda r: r["CourseCode"]).items():
    result = summarise(c_rows)
    result["name"] = c_rows[0]["CourseName"]
    by_course[cc] = result



# For each faculty member, work out their own UKPSF scores,
# their score in each semester, and each class they taught.
faculty_detail = {}
for fid, f_rows in group_by(rows, lambda r: r["FacultyID"]).items():

    # This teacher's AA, CK and PV scores
    ukpsf_categories = {}
    for cat, cat_rows in group_by(f_rows, lambda r: r["UKPSFCategory"]).items():
        ukpsf_categories[cat] = summarise(cat_rows)

    # This teacher's score for each UKPSF code (A1, K2, V1 ...)
    ukpsf_codes = {}
    for code, code_rows in group_by(f_rows, lambda r: r["UKPSFCode"]).items():
        ukpsf_codes[code] = summarise(code_rows)

    # This teacher's score in each semester, so we can show a trend
    semesters = {}
    for sem, sem_rows in group_by(f_rows, lambda r: r["SemesterCode"]).items():
        entry = summarise(sem_rows)
        entry["semesterName"] = sem_rows[0]["SemesterName"]
        entry["semesterOrder"] = int(sem_rows[0]["SemesterOrder"])
        entry["academicYear"] = sem_rows[0]["AcademicYear"]
        semesters[sem] = entry

    # This teacher's score on each survey question
    questions = {}
    for q, q_rows in group_by(f_rows, lambda r: int(r["QuestionNumber"])).items():
        entry = summarise(q_rows)
        entry["ukpsfCategory"] = q_rows[0]["UKPSFCategory"]
        entry["ukpsfCode"] = q_rows[0]["UKPSFCode"]
        questions[str(q)] = entry

    # Each individual class this teacher taught
    def class_key(r):
        return (r["SemesterCode"], r["CourseCode"], r["Degree"],
                r["Section"], r["CourseEdition"])

    classes = []
    for key, class_rows in group_by(f_rows, class_key).items():
        entry = summarise(class_rows)
        first = class_rows[0]
        entry["semesterCode"] = first["SemesterCode"]
        entry["semesterName"] = first["SemesterName"]
        entry["semesterOrder"] = int(first["SemesterOrder"])
        entry["courseCode"] = first["CourseCode"]
        entry["courseName"] = first["CourseName"]
        entry["degree"] = first["Degree"]
        entry["section"] = first["Section"]
        entry["edition"] = first["CourseEdition"]
        entry["evaluatedStudents"] = first["EvaluatedStudents"]

        # Flag classes built on fewer than 20 answers
        entry["complete"] = entry["questionCount"] == 20

        classes.append(entry)

    classes.sort(key=lambda c: (c["semesterOrder"], c["courseCode"], c["section"]))

    # --- Who this teacher was asked about ---------------------------
    #
    # The same section key and the same timetable enrolment lookup the
    # institutional participation figures use. A section carrying both
    # Diploma and Bachelor students is surveyed twice, so its
    # respondents add up while its enrolment is counted once.
    f_surveys = {}
    for r in f_rows:
        section = (r["SemesterCode"], tidy_code(r["CourseCode"]), r["Section"])
        survey = (section, r["Degree"], r["CourseEdition"])
        f_surveys[survey] = int(r["EvaluatedStudents"])

    f_sections = sorted({survey[0] for survey in f_surveys})
    f_matched = [k for k in f_sections if k in enrolment]

    audience = sum(enrolment[k] for k in f_matched)
    responses = sum(f_surveys.values())

    # A section with no enrolment figure has nothing to set its
    # respondents against, so the ratio is worked out from the sections
    # carrying both. sectionsWithEnrolment against sectionsTaught says
    # how much of the teaching that covers, and responsesMatched is the
    # respondent total that actually divides into audience.
    responses_matched = sum(count for survey, count in f_surveys.items()
                            if survey[0] in enrolment)

    response = {
        "audience": audience if enrolment else None,
        "responses": responses,
        "responsesMatched": responses_matched if enrolment else None,
        "responseRatio": (round(responses_matched / audience * 100, 2)
                          if audience else None),
        "sectionsTaught": len(f_sections),
        "sectionsWithEnrolment": len(f_matched),
    }

    # --- The department this teacher mostly sits in ------------------
    #
    # Some teach across more than one, so the share of their answers
    # that came from the main department is carried beside the
    # benchmark rather than hidden behind it. Ties fall to the first
    # name alphabetically, so the pick is stable between runs.
    dept_answers = {}
    for r in f_rows:
        name = r["DepartmentName"]
        dept_answers[name] = dept_answers.get(name, 0) + 1

    main_dept = max(sorted(dept_answers), key=lambda n: dept_answers[n])

    department = {
        "name": main_dept,
        "score": by_department[main_dept]["score"],
        "share": round(dept_answers[main_dept] / len(f_rows) * 100, 1),
        "count": len(dept_answers),
    }

    faculty_detail[fid] = {
        "id": fid,
        "name": f_rows[0]["FacultyNameClean"],
        "nameRaw": f_rows[0]["FacultyNameRaw"],
        "overall": summarise(f_rows),
        "ukpsfCategories": ukpsf_categories,
        "ukpsfCodes": ukpsf_codes,
        "bySemester": semesters,
        "byQuestion": questions,
        "classes": classes,
        "courseCount": len({r["CourseCode"] for r in f_rows}),
        "classCount": len(classes),
        "response": response,
        "department": department,
    }


# --- Requirement 5: track one question for one degree level ----------
# For every combination of degree level and question, work out the
# score in each semester. The dashboard lets the user pick one of each.
question_tracking = {}
for degree, degree_rows in group_by(rows, lambda r: r["Degree"]).items():

    if not degree:
        continue

    by_q = {}
    for q, q_rows in group_by(degree_rows, lambda r: int(r["QuestionNumber"])).items():

        semester_points = []
        for sem, sem_rows in group_by(q_rows, lambda r: r["SemesterCode"]).items():
            entry = summarise(sem_rows)
            entry["semesterCode"] = sem
            entry["semesterName"] = sem_rows[0]["SemesterName"]
            entry["semesterOrder"] = int(sem_rows[0]["SemesterOrder"])
            semester_points.append(entry)

        semester_points.sort(key=lambda s: s["semesterOrder"])

        by_q[str(q)] = {
            "overall": summarise(q_rows),
            "ukpsfCategory": q_rows[0]["UKPSFCategory"],
            "ukpsfCode": q_rows[0]["UKPSFCode"],
            "bySemester": semester_points,
        }

    question_tracking[degree] = by_q


# --- Who took part, and how much teaching was covered ----------------
#
# A class section can be evaluated more than once, because a mixed
# class has its Diploma and Bachelor students surveyed separately. The
# respondents of those surveys add up; the section's enrolment is
# counted once. tidy_code is defined further up, because the faculty
# figures key their sections the same way.

responded_by_section = {}
for r in rows:
    key = (r["SemesterCode"], tidy_code(r["CourseCode"]), r["Section"])
    survey = (key, r["Degree"], r["CourseEdition"], r["FacultyID"])
    responded_by_section.setdefault(key, {})[survey] = int(r["EvaluatedStudents"])

sections_evaluated = sorted(responded_by_section)
sections_matched = [k for k in sections_evaluated if k in enrolment]

responded = sum(sum(surveys.values())
                for surveys in responded_by_section.values())
responded_matched = sum(sum(responded_by_section[k].values())
                        for k in sections_matched)
eligible = sum(enrolment[k] for k in sections_matched)

participation = {
    "eligibleStudents": eligible if enrolment else None,
    "studentsResponded": responded,
    # The respondents from the sections that also carry an enrolment
    # figure. This is the numerator of the rate below, so it is the
    # only respondent total that divides into eligibleStudents.
    "studentsRespondedMatched": responded_matched if enrolment else None,
    "responseRate": (round(responded_matched / eligible * 100, 1)
                     if eligible else None),
    # The rate is worked out from the sections that carry both figures,
    # so say how many that was
    "sectionsEvaluated": len(sections_evaluated),
    "sectionsWithEnrolment": len(sections_matched),
}

coverage = {
    "facultyEvaluated": len({r["FacultyID"] for r in rows}),
    "coursesEvaluated": len({tidy_code(r["CourseCode"]) for r in rows}),
    "classSectionsEvaluated": institution["groupCount"],
    "semesters": len(by_semester),
}


# --- Requirement 4: everything below the target, in one place --------
improvement = {}

improvement["faculty"] = sorted(
    [
        {
            "id": fid,
            "name": data["name"],
            "score": data["overall"]["score"],
            "gap": data["overall"]["gap"],
            "classCount": data["classCount"],
        }
        for fid, data in faculty_detail.items()
        if data["overall"]["status"] == "Improvement Required"
    ],
    key=lambda item: item["score"],
)

improvement["courses"] = sorted(
    [
        {
            "code": code,
            "name": data["name"],
            "score": data["score"],
            "gap": data["gap"],
            "questionCount": data["questionCount"],
            "groupCount": data["groupCount"],
        }
        for code, data in by_course.items()
        if data["status"] == "Improvement Required"
    ],
    key=lambda item: item["score"],
)

improvement["questions"] = sorted(
    [
        {
            "number": q,
            "score": data["score"],
            "gap": data["gap"],
            "ukpsfCategory": data["ukpsfCategory"],
            "ukpsfCode": data["ukpsfCode"],
        }
        for q, data in by_question.items()
        if data["status"] == "Improvement Required"
    ],
    key=lambda item: item["score"],
)

# Individual classes below the target, across all faculty
weak_classes = []
for fid, data in faculty_detail.items():
    for cls in data["classes"]:
        if cls["status"] == "Improvement Required":
            weak_classes.append({
                "facultyId": fid,
                "facultyName": data["name"],
                "courseCode": cls["courseCode"],
                "courseName": cls["courseName"],
                "semesterName": cls["semesterName"],
                "section": cls["section"],
                "degree": cls["degree"],
                "score": cls["score"],
                "gap": cls["gap"],
                "questionCount": cls["questionCount"],
            })
improvement["classes"] = sorted(weak_classes, key=lambda item: item["score"])


# ---------------------------------------------------------------
# PRINT THE RESULTS IN PLAIN LANGUAGE
# ---------------------------------------------------------------

# Draw a heading with a line under it
def heading(text):
    print()
    print(text)
    print("-" * 64)


# Turn a score into a short plain-English verdict
def verdict(score):
    if score is None:
        return "no data"
    if score < 65:
        return f"BELOW the 65% target by {round(65 - score, 1)} points"
    return f"above the 65% target by {round(score - 65, 1)} points"


# Draw a simple bar so the size is visible at a glance
def bar(score, width=30):
    if score is None:
        return ""
    filled = int(round(score / 100 * width))
    return "#" * filled + "." * (width - filled)


print()
print("=" * 64)
print("  TEACHING EVALUATION RESULTS")
print("=" * 64)
print()
print("  Every number below is worked out from the cleaned survey data.")
print("  The university's minimum acceptable score is 65%.")


heading("HOW IS THE UNIVERSITY DOING OVERALL?")
print(f"  Overall score: {institution['score']}%")
print(f"  {bar(institution['score'])}")
print(f"  This is {verdict(institution['score'])}.")
print()
print(f"  Worked out from {institution['questionCount']:,} individual survey answers,")
print(f"  covering {institution['groupCount']} teaching groups")
print("  (a teaching group is one teacher, one course, one class).")


heading("IS IT GETTING BETTER OR WORSE?")
previous = None
for code in sorted(by_semester, key=lambda c: by_semester[c]["semesterOrder"]):
    s = by_semester[code]
    if previous is None:
        change = "        "
    else:
        difference = round(s["score"] - previous, 1)
        if difference > 0:
            change = f"  up {difference}"
        elif difference < 0:
            change = f"  down {abs(difference)}"
        else:
            change = "  no change"
    print(f"  {s['semesterName']:<13} {s['score']:>6}%  {bar(s['score'], 20)}{change}")
    previous = s["score"]
print()
print("  Spring 2022 is missing here because the university did not")
print("  supply question-by-question data for that semester.")


heading("YEAR ON YEAR")
for year in sorted(by_year):
    y = by_year[year]
    print(f"  {year:<13} {y['score']:>6}%  {bar(y['score'], 20)}")


heading("WHAT ARE TEACHERS GOOD AT? (UKPSF categories)")
labels = {
    "AA": "Areas of Activity   - what the teacher DOES",
    "CK": "Core Knowledge      - what the teacher KNOWS",
    "PV": "Professional Values - how the teacher BEHAVES",
}
for cat in sorted(by_category):
    c = by_category[cat]
    print(f"  {labels.get(cat, cat)}")
    print(f"     {c['score']:>6}%  {bar(c['score'], 20)}")


heading("THE FIVE WEAKEST SURVEY QUESTIONS")
ranked = sorted(by_question.items(), key=lambda kv: kv[1]["score"])
for q, r in ranked[:5]:
    print(f"  Question {q:<3} {r['score']:>6}%  {bar(r['score'], 20)}"
          f"  ({r['ukpsfCategory']})")


heading("THE FIVE STRONGEST SURVEY QUESTIONS")
for q, r in ranked[-5:][::-1]:
    print(f"  Question {q:<3} {r['score']:>6}%  {bar(r['score'], 20)}"
          f"  ({r['ukpsfCategory']})")


heading("WHO NEEDS SUPPORT?")
below_faculty = [f for f in by_faculty.values()
                 if f["status"] == "Improvement Required"]
below_courses = [c for c in by_course.values()
                 if c["status"] == "Improvement Required"]

print(f"  Teachers  : {len(below_faculty)} of {len(by_faculty)} scored below 65%"
      f"  ({round(len(below_faculty) / len(by_faculty) * 100, 1)}%)")
print(f"  Courses   : {len(below_courses)} of {len(by_course)} scored below 65%"
      f"  ({round(len(below_courses) / len(by_course) * 100, 1)}%)")

print()
print("  The lowest scoring teachers:")
for f in sorted(below_faculty, key=lambda x: x["score"])[:5]:
    note = ""
    if f["questionCount"] < 20:
        note = f"   <- only {f['questionCount']} answers, treat with caution"
    print(f"     {f['name'][:32]:<34} {f['score']:>6}%{note}")

print()
print("  The lowest scoring courses:")
for c in sorted(below_courses, key=lambda x: x["score"])[:5]:
    print(f"     {c['name'][:32]:<34} {c['score']:>6}%")


heading("DEPARTMENTS")
print("  Taken from the timetable PDFs, which state the department")
print("  for every course. The evaluation files do not.")
print()
for name in sorted(by_department, key=lambda n: -(by_department[n]["score"] or 0)):
    d = by_department[name]
    print(f"  {name[:32]:<34} {d['score']:>6}%  {bar(d['score'], 16)}")
    print(f"     {d['courseCount']} courses, {d['facultyCount']} faculty,"
          f" {d['questionCount']} answers")


heading("PROGRAMMES")
print("  A programme is a degree level within a department.")
print("  Results based on fewer than 100 answers are marked.")
print()
for name in sorted(by_programme, key=lambda n: -(by_programme[n]["score"] or 0)):
    p = by_programme[name]
    note = "" if p["reliable"] else f"   only {p['questionCount']} answers"
    print(f"  {name[:40]:<42} {p['score']:>6}%{note}")


heading("EXAMPLE: ONE TEACHER IN DETAIL")
example_id = sorted(faculty_detail,
                    key=lambda k: -faculty_detail[k]["classCount"])[0]
example = faculty_detail[example_id]
print(f"  {example['name']}  (ID {example['id']})")
print(f"  Overall {example['overall']['score']}%"
      f"   {verdict(example['overall']['score'])}")
print(f"  Taught {example['courseCount']} courses"
      f" across {example['classCount']} classes")
print()
print("  Their UKPSF scores:")
for cat in sorted(example["ukpsfCategories"]):
    c = example["ukpsfCategories"][cat]
    print(f"     {cat}  {c['score']:>6}%  {bar(c['score'], 20)}")
print()
print("  Their score each semester:")
for code in sorted(example["bySemester"],
                   key=lambda k: example["bySemester"][k]["semesterOrder"]):
    s = example["bySemester"][code]
    print(f"     {s['semesterName']:<13} {s['score']:>6}%  {bar(s['score'], 20)}")
print()
print("  Their weakest classes:")
for c in sorted(example["classes"], key=lambda x: x["score"])[:3]:
    flag = "" if c["complete"] else "   <- incomplete data"
    print(f"     {c['courseName'][:26]:<28} sec {c['section']}"
          f"  {c['score']:>6}%{flag}")


heading("HOW RELIABLE ARE THESE NUMBERS?")
all_classes = [c for f in faculty_detail.values() for c in f["classes"]]
thin = [c for c in all_classes if not c["complete"]]
print("  Each class should have 20 survey answers - one per question.")
print(f"  {len(thin)} of {len(all_classes)} classes have fewer than 20,")
print("  because some answers were blank or outside the 0-100 range.")
if thin:
    print()
    print("  The affected classes:")
    for c in sorted(thin, key=lambda x: x["questionCount"]):
        print(f"     {c['courseName'][:26]:<28} sec {c['section']}"
              f"  only {c['questionCount']} answers")


# ---------------------------------------------------------------
# SAVE EVERYTHING FOR THE DASHBOARDS
# ---------------------------------------------------------------

metrics = {
    "target": TARGET,
    "institution": institution,
    "participation": participation,
    "coverage": coverage,
    "bySemester": by_semester,
    "byAcademicYear": by_year,
    "byUkpsfCategory": by_category,
    "byUkpsfCode": by_code,
    "byQuestion": {str(k): v for k, v in by_question.items()},
    "byFaculty": by_faculty,
    "byCourse": by_course,
    "byDepartment": by_department,
    "byProgramme": by_programme,
    "facultyDetail": faculty_detail,
    "questionTracking": question_tracking,
    "improvement": improvement,
}

with open(PROCESSED_DIR / "metrics.json", "w", encoding="utf-8") as f:
    json.dump(metrics, f, indent=2, ensure_ascii=False)

print()
print("=" * 64)
print("  Saved: data/processed/metrics.json")
print("=" * 64)
