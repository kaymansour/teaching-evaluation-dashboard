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

A score below **65%** is classified as *Improvement Required*.

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
- Download as PDF, which also includes the twelve detailed UKPSF standards

---

## How it is built

```
Excel + PDF files
      │  scripts/inventory.py            catalogue and de-duplicate
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

python scripts/inventory.py            # catalogue and de-duplicate
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
