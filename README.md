# Teaching Evaluation Dashboards

Two web dashboards built from four semesters of student teaching-evaluation
data at University College of Bahrain, with every scored question mapped to
the UK Professional Standards Framework (UKPSF 2020).

**Live:**
- Institutional overview — `/overview`
- Individual faculty report — `/faculty`

---

## What it does

Students rated their teaching on 20 questions. Those ratings arrived as 71
Excel and PDF files in several different layouts. This project turns them
into two dashboards a head of department can read in thirty seconds.

| Figure | Value |
|---|---|
| Institutional average | 79.14% |
| Survey answers used | 16,998 |
| Classes evaluated | 852 |
| Faculty | 74 |
| Courses | 184 |
| Departments | 8 |
| Programmes | 18 |
| Faculty below 65% | 9 |
| Courses below 65% | 18 |
| Class sections below 65% | 128 |
| Students represented | 15,511 of 16,478 enrolled (94.1%) |

A score below **65%** is classified as *Improvement Required*.

---

## The eight requirements

The client asked for eight things. Here is where each one is, and how it
was built.

### 1. Individual faculty teaching evaluation report using UKPSF

**Where:** `/faculty` — choose a faculty member

Overall score benchmarked against the institution, AA / CK / PV category
scores, all 20 survey questions with their UKPSF codes, every class taught,
and performance across semesters. The PDF export adds the twelve detailed
UKPSF standards (A1–A4, K1–K4, V1–V4).

**Built from:** the question-to-UKPSF mapping in
`data/lookups/ukpsf_questions.csv`, verified against the Spring 2022
workbooks. All 20 mappings matched the mapping supplied in the brief.

---

### 2. Programme average teaching evaluation results

**Where:** `/overview` — "Programme comparison"

18 programmes, a comparison chart, a table of those below 65%, and a
breakdown of the gap between degree levels inside each department.

**Built from:** degree level (from the evaluation files) combined with
department (from the timetable PDFs). The source data contains no field
named "Programme"; a programme here is a degree level within a department,
which is how a degree of study is normally described. This is stated on the
page itself.

**What it reveals:** Diploma in Banking and Financial Sciences scores
64.73% while the Bachelor in the same department scores 81.44% — a 16.7
point gap that is invisible at department level, where Banking reads a
healthy 75.58%.

Programmes resting on fewer than 100 answers are flagged. Master in
Accounting draws on 20 answers from a single class and is marked
accordingly.

---

### 3. Department average teaching evaluation results

**Where:** `/overview` — "Department comparison"

Eight departments with a comparison chart, a table showing courses, faculty,
answers and the difference from the institutional average, and a selector
giving one department's trend across semesters with its own UKPSF scores.

**Built from:** the timetable PDFs. The evaluation spreadsheets contain no
department field, and folder names cannot substitute — the identical file
`Evaluation20211.xlsx` was supplied inside both the CSMIS and ID folders.
The timetables carry a `Dept :` heading on every page and list the courses
underneath it.

All 184 evaluated courses were matched. The three timetables agree with each
other in every case, with zero conflicts.

**What it reveals:** a 15.5 point spread, from Foundation Programme at
87.07% to Interior Design at 71.52%.

---

### 4. Improvement Required, in a separate section

**Where:** `/overview` — "Improvement required", and on every faculty report

Three tables: survey questions, courses (18), and faculty (9), each sorted
worst first with the gap to the threshold. The faculty page adds the
specific classes and questions below 65% for the selected person.

**The rule:** below 65% is *Improvement Required*; 65.00% and above is
*Acceptable*. Strictly less-than, with no rounding, so 64.99% is flagged and
65.00% is not. This is verified by an automated test in
`scripts/validate.py`.

**A note on questions:** no survey question falls below 65% across the
college — the weakest, Q11, scores 77.89%. Rather than show an empty table,
the page says so and points to the faculty reports, where individual weak
questions do appear.

---

### 5. Tracking one question for a particular degree programme across semesters

**Where:** `/overview` — "Question tracking"

Two dropdowns: degree programme (Bachelor, Diploma, Foundation, Master) and
survey question, shown with its full wording. Choosing both draws that
question's score across the semesters, with the number of answers behind
each point.

**Example:** Bachelor, Question 7 — Fall 2020 74.57%, Spring 2021 79.50%,
Fall 2021 79.76%.

80 combinations are available: 4 degree levels × 20 questions.

---

### 6. Interdepartmental average scores comparison

**Where:** `/overview` — the same section as requirement 3

The comparison chart carries two reference lines: the 65% threshold in red,
and the institutional average in grey. Departments above or below the
college as a whole can be read at a glance. The table gives the exact
difference from the institutional average for each one, in green or red.

---

### 7. Institutional average across semesters and academic years

**Where:** `/overview` — "Performance over time"

A line chart for the three semesters and a bar chart for the two academic
years, side by side, both marked with the 65% threshold. Below them, cards
showing each semester's score and the change from the previous one.

**The trend:** Fall 2020 75.84% → Spring 2021 80.99% (up 5.15) → Fall 2021
80.31% (down 0.68).

Spring 2022 is not shown, and the page says why: it was supplied as
department summaries only, with no question-level data.

---

### 8. Other metrics demonstrating creativity in data visualisation

- **Strongest and weakest five questions**, with score bars
- **Gap to threshold** on every result, in percentage points
- **Semester change** stated in words — "up 5.1 points" — rather than
  leaving the reader to subtract
- **Degree-level gaps within departments**, which surface problems that
  department averages hide
- **Reliability flags** wherever a score rests on few answers, so a figure
  drawn from one small class is not read as confidently as one drawn from
  hundreds
- **PDF export** of any faculty report, formatted for printing
- **Sortable score columns** on the question and class tables
- **Institutional benchmark line** on the department chart

Colour is never the only signal. Every below-threshold result carries the
words *Improvement required* as well as a red background.

---

## The two dashboards

### `/overview` — institutional

- Institutional average with the gap to the 65% threshold
- Performance by semester and by academic year
- Department comparison, with per-department trends and UKPSF breakdowns
- Programme comparison, and the gap between degree levels within a department
- Strongest and weakest survey questions
- Improvement Required: questions, courses and faculty below 65%
- Question tracking: follow one survey question for one degree programme
  across the semesters

### `/faculty` — individual

Select a faculty member to see:

- Overall score, benchmarked against the institutional average
- UKPSF category scores (AA, CK, PV)
- Performance across semesters
- Every class taught, with student counts and scores
- All 20 survey questions, sortable by score
- Improvement Required: the specific classes and questions below 65%
- Compared against their main department as well as the institution
- Download as a formal PDF report: cover page with response figures, benchmark
  chart, results by course, and all 20 questions ranked

---

## How it is built

```
Excel + PDF files
      │  scripts/data_checker.py         catalogue and de-duplicate
      │  scripts/extract_departments.py  read departments from timetable PDFs
      │  scripts/extract_scores.py       parse three spreadsheet formats
      │  scripts/validate.py             14 automated checks
      │  scripts/calculate.py            every metric
      │  scripts/export_for_web.py       split for the browser
      ▼
public/data/*.json
      │
      ▼
Next.js (static)  →  Vercel
```

**No database and no backend.** The data is historical and does not change,
so Python runs once at build time and emits static JSON. Next.js pre-renders
every page, so nothing can fail at request time.

| Tool | Role |
|---|---|
| Python + pandas | Read and clean the Excel files |
| pdfplumber | Read the department from the timetable PDFs |
| Next.js 16 (App Router) | Pages and routing |
| TypeScript | Type safety on percentage data |
| Tailwind CSS | Layout and styling |
| shadcn/ui (Radix) | Accessible components, copied into the project |
| Recharts | Charts |
| Vercel | Hosting |

---

## Running it

### Requirements

Node.js 18+, Python 3.10+, Git.

### 1. Get the data in place

The raw evaluation data is **not** in this repository. It contains faculty
names attached to performance scores, which is personal information.

Place the supplied ZIP in `data/raw/` and extract it into
`data/raw/extracted/`.

To confirm you have the same package this project was built from:

```
File   : OneDrive_2026-09-02.zip
Size   : 12,968,305 bytes
SHA256 : 259D344344F213CA0E99A03494671E90226BFBB4B20484E241EC96C537236940
```

### 2. Run the pipeline

```bash
pip install pandas openpyxl pdfplumber

python scripts/data_checker.py         # catalogue and de-duplicate
python scripts/extract_departments.py  # course-to-department lookup
python scripts/extract_scores.py       # parse all four semesters
python scripts/validate.py             # 14 automated checks
python scripts/calculate.py            # all metrics
python scripts/export_for_web.py       # split for the browser
```

The scripts must run in this order; each consumes the previous one's output.

### 3. Run the web application

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

---

## Project structure

```
data/
  raw/            the supplied ZIP, never modified
  processed/      clean data produced by the scripts
  quality/        excluded records and the validation report
  lookups/        UKPSF map, semesters, course departments
scripts/          the Python pipeline
app/              Next.js pages: /, /overview, /faculty
components/
  ui/             shadcn/ui components
  dashboard/      the dashboard components
types/            TypeScript definitions
public/data/      the JSON the dashboards read
docs/             coding document and data dictionary
```

---

## Data quality

The supplied data had real problems. All are documented in
`docs/Technical_Coding_Document.md`. The main ones:

| Problem | Handling |
|---|---|
| 71 files, only 44 unique | Duplicates found by SHA256 fingerprint; one authoritative file per semester |
| Same data, different bytes | Files compared cell by cell where fingerprints differed |
| 462 scores above 100% | Excluded and recorded, **not** capped — capping would invent values |
| 61 blank scores | Recorded as *no data*, never as zero |
| Three spreadsheet layouts | Three separate parsers |
| One block with shifted columns | 20 scores were being dropped silently; found by reconciling row counts |
| No department field in the evaluation files | Read from the timetable PDFs, which state it for every course |
| Spring 2022 has no question-level data | Held as a separate summary table, never merged |

`scripts/validate.py` runs 14 checks. Twelve pass. Two fail deliberately: one
flags five classes with incomplete question sets after invalid scores were
removed, the other flags a faculty ID appearing under two spellings in the
source. Both are findings, not defects — the raw values are retained so the
source can be audited.

---

## Known limitations

1. **Spring 2022** is summary level only. No question detail, no student
   counts, no weighted averages.
2. **462 scores excluded** as above 100%. The cause is unexplained by the
   source data.
3. **The supplied staff summaries do not reconcile** with the raw evaluation
   files. Neither simple nor student-weighted averaging reproduces them.
   Dashboard figures come from the raw data, which is traceable to source
   rows. See section 10 of the coding document.
4. **Programme** is constructed as a degree level within a department. The
   source contains no field of that name.
5. **Master in Accounting** rests on 20 answers from a single class. It is
   flagged on the dashboard rather than presented as settled.

---

## Privacy

Faculty names are personal information, and the evaluation data links named
individuals to performance scores.

- The raw and processed data are excluded from public distribution
- The repository is private
- Anonymisation can be enabled in `scripts/export_for_web.py` if the client
  requires it

---

## Questions for the client

1. What causes the Fall 2021 scores of approximately 400%?
2. How were the staff summary workbooks produced? They do not agree with the
   raw evaluation files.
3. Is a Spring 2022 raw evaluation file available?
4. May faculty names be published, or should the dashboards be anonymised?

---

## Documentation

| File | Contents |
|---|---|
| `docs/Technical_Coding_Document.md` | Full technical write-up, 20 sections |
| `docs/Data_Dictionary.md` | Every field in the cleaned data |
| `data/quality/validation_report.txt` | The 14 automated checks |
| `data/quality/file_inventory.csv` | All 71 source files, fingerprinted |
