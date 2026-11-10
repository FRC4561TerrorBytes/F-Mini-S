import csv
import json
from pathlib import Path

schedules_dir = Path(__file__).resolve().parent / "schedules"

# This file parses the .csv files with the ideal schedules from Chezy Arena and converts them to .json files for use in the FMS
# This is built as a standalone python script because it only had to run once to convert the files
def build_match(row_number: int, row: list[str]) -> dict:
    values = [int(cell.strip()) for cell in row if cell.strip() and int(cell.strip()) != 0]

    if len(values) >= 6:
        red_alliance = values[:3]
        blue_alliance = values[3:6]
    else:
        odd_columns = [
            int(cell.strip())
            for index, cell in enumerate(row, start=1)
            if index % 2 == 1 and cell.strip() and int(cell.strip()) != 0
        ]
        red_alliance = odd_columns[:3]
        blue_alliance = odd_columns[3:6]

    return {
        "number": row_number,
        "redAlliance": red_alliance,
        "blueAlliance": blue_alliance,
    }


for csv_path in sorted(schedules_dir.glob("*.csv")):
    matches: list[dict] = []

    with csv_path.open("r", encoding="utf-8", newline="") as file:
        reader = csv.reader(file)
        for row_number, row in enumerate(reader, start=1):
            if not row:
                continue

            if all(not cell.strip() for cell in row):
                continue

            matches.append(build_match(row_number, row))

    output_path = csv_path.with_suffix(".json")
    output_path.write_text(json.dumps(matches, indent=2), encoding="utf-8")
    print(f"Wrote {output_path.name} with {len(matches)} matches")
