
"""
data_checker.py

Looks at every file in the unzipped data package, gives each one a
fingerprint, groups matching fingerprints to find copies, then saves
the results as a CSV file.

"""

# ---------------------------------------------------------------
# TOOLS WE BORROW FROM PYTHON
# ---------------------------------------------------------------

# Handles folder locations
from pathlib import Path

# Makes fingerprints
import hashlib

# Writes CSV files
import csv


# ---------------------------------------------------------------
# SETTINGS - where things are, and what the codes mean
# ---------------------------------------------------------------

# Find the project folder (go up two levels from this script)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# The folder holding the unzipped data
RAW_DIR = PROJECT_ROOT / "data" / "raw" / "extracted"

# The folder where our reports go
QUALITY_DIR = PROJECT_ROOT / "data" / "quality"

# Which semester each folder name belongs to
SEMESTERS = {
    "fall 2020": "Fall 2020",
    "spring 2021": "Spring 2021",
    "fall 2021": "Fall 2021",
    "spring 2022": "Spring 2022",
}

# The department folder codes used in the data package
DEPARTMENTS = ["AFS", "CSMIS", "GFP", "ID"]


# ---------------------------------------------------------------
# REUSABLE INSTRUCTIONS
# ---------------------------------------------------------------

# Give one file a fingerprint
def fingerprint(file_path):

    # Start an empty fingerprint
    digest = hashlib.sha256()

    # Open the file in binary mode ("rb" = read bytes)
    with open(file_path, "rb") as f:

        # Read the file in small chunks so big files fit in memory
        while True:
            chunk = f.read(65536)

            # An empty chunk means we reached the end
            if not chunk:
                break

            # Add this chunk to the fingerprint
            digest.update(chunk)

    # Turn the fingerprint into readable text and hand it back
    return digest.hexdigest()


# Work out which semester a file belongs to, from its folder name
def find_semester(path_text):

    # Make everything lowercase so "Fall" and "fall" both match
    lowered = path_text.lower()

    # Check each semester name in turn
    for hint in SEMESTERS:
        if hint in lowered:
            return SEMESTERS[hint]

    # None of them matched
    return "UNKNOWN"


# Work out which department folder a file sits in
def find_department(path):

    # Split the path into its folder names, in capitals
    parts = [p.upper() for p in path.parts]

    # Check each department code in turn
    for code in DEPARTMENTS:
        if code in parts:
            return code

    # The file sits above the department folders
    return "INSTITUTION"


# ---------------------------------------------------------------
# GO THROUGH EVERY FILE AND FINGERPRINT IT
# ---------------------------------------------------------------

# Show which folder we are checking
print("Looking in:", RAW_DIR)
print()

# An empty filing cabinet. Each fingerprint gets its own drawer.
groups = {}

# A list to hold one record for every file
records = []

# Go through everything inside that folder, including sub-folders
for path in RAW_DIR.rglob("*"):

    # Skip folders - we only want files
    if path.is_file():

        # Work out this file's fingerprint
        file_hash = fingerprint(path)

        # The path without the long RAW_DIR part at the front
        short_path = path.relative_to(RAW_DIR)

        # If this fingerprint has no drawer yet, make an empty one
        if file_hash not in groups:
            groups[file_hash] = []

        # Put this file in the drawer for its fingerprint
        groups[file_hash].append(short_path)

        # Save one record describing this file
        records.append({
            "FileName": path.name,
            "Path": str(short_path),
            "Semester": find_semester(str(short_path)),
            "Department": find_department(short_path),
            "SizeBytes": path.stat().st_size,
            "Fingerprint": file_hash,
            "Status": "",
        })


# ---------------------------------------------------------------
# DECIDE WHICH COPY TO KEEP
# ---------------------------------------------------------------

# Look at each drawer in turn
for file_hash in groups:

    # Sort so the least buried file comes first
    file_list = sorted(groups[file_hash], key=lambda p: len(p.parts))
    groups[file_hash] = file_list

    # Mark each record: the first one is KEEP, the rest are SKIP
    for record in records:
        if record["Fingerprint"] == file_hash:
            if record["Path"] == str(file_list[0]):
                record["Status"] = "KEEP"
            else:
                record["Status"] = "SKIP"


# ---------------------------------------------------------------
# SHOW THE RESULTS ON SCREEN
# ---------------------------------------------------------------

# Count the redundant copies
copies = 0
for file_list in groups.values():
    copies = copies + len(file_list) - 1

# Show the three headline numbers
print("Files found        :", len(records))
print("Unique by content  :", len(groups))
print("Redundant copies   :", copies)
print()

# Show every drawer that has more than one file in it
print("Files that appear more than once:")
print()

for file_hash in groups:

    file_list = groups[file_hash]

    # Only interested in drawers with 2 or more files
    if len(file_list) > 1:

        print(len(file_list), "copies of", file_list[0].name)

        # The first one is the one we keep
        print("     KEEP", file_list[0])

        # The rest get skipped
        for path in file_list[1:]:
            print("     skip", path)

        print()


# ---------------------------------------------------------------
# SAVE THE RESULTS AS A CSV FILE
# ---------------------------------------------------------------

# Make sure the reports folder exists
QUALITY_DIR.mkdir(parents=True, exist_ok=True)

# Where the CSV will be saved
output_file = QUALITY_DIR / "file_inventory.csv"

# Write one row per file
with open(output_file, "w", newline="", encoding="utf-8-sig") as f:

    # Use the keys of the first record as the column headings
    writer = csv.DictWriter(f, fieldnames=records[0].keys())

    # Write the heading row
    writer.writeheader()

    # Write all the file rows
    writer.writerows(records)

print("Saved:", output_file)