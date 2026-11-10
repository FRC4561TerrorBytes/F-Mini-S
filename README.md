# MiniFRC Field Management Software 

## Build and Run

### Build the Electron app

```bash
npm run build:electron
```

### Run the app

```bash
npm run dev:editor
```

## Debugging

### Type-check the project

```bash
npx tsc --noEmit
```

## Import Teams via CSV Files
In the 'Teams' page, click 'Import CSV'. CSVs should be formatted like so, with no header row:

```
1,test1
2,test2
3,test3
```
The teams will then be imported and added to the ``teams.json`` file and team database. Existing team numbers and names are retained, so if the csv import finds a team with the same number as an existing team that team will not be imported.

## Match Schedules

This FMS uses the pre-generated match schedules created by [Chezy Arena](https://github.com/team254/cheesy-arena), which are then converted to json by the ``parseSchedules.py`` script in this project. This ensures minimum separation between teams and gives each team a fair schedule regardless of the overall competition size.