import { jsonToString } from '../../jsonUtils.js';
import { safeWriteJSON } from '../../jsonUtils.js';

const matchSchedulePath = './src/electron/dataStorage/matchSchedule.json';
const matchResultsPath = './src/electron/dataStorage/matchResults.json';

export type matchResultFile = {
    matchNumber: number,
    matchType: string,
    time: [{day:number},{month:number},{year:number},{hour:number},{minute:number}],
    alliance:[
        {
            color: "red",
            teams: number[],
            points: number,
            fuelScored: number,
            autoClimbs: number,
            endClimbsL1: number,
            endClimbsL2: number,
            endPark: number,
            fouls: number,
            TechFouls: number,
            energizedRP: boolean,
            superchargedRP: boolean,
            traversalRP: boolean,
            win: boolean
        },
        {
            color: "blue",
            teams: number[],
            points: number,
            fuelScored: number,
            autoClimbs: number,
            endClimbsL1: number,
            endClimbsL2: number,
            endPark: number,
            fouls: number,
            TechFouls: number,
            energizedRP: boolean,
            superchargedRP: boolean,
            traversalRP: boolean,
            win: boolean
        }
    ]
}

const CLIMB_POINTS = { auto: 15, l1: 10, l2: 30, park: 5 };
const RP_THRESHOLDS = { energized: 50, supercharged: 100, traversal: 30 };

function climbPoints(autoClimbs: number, l1: number, l2: number, park: number) {
    return autoClimbs * CLIMB_POINTS.auto + l1 * CLIMB_POINTS.l1 + l2 * CLIMB_POINTS.l2 + park * CLIMB_POINTS.park;
}

/**
 * Makes a match result based on the 2026 Rebuilt game, and puts into the matchResults.json
 * @returns true if the result was recorded, false if the match wasn't found in the schedule or already had a result
 */
export async function addRebuiltMatchResult(matchNum : number, matchType : string, redAlliance : number[], blueAlliance : number[],
    redPoints : number,  redFuelScored : number, redEndClimbsL1 : number, redEndClimbsL2 : number, redEndPark : number, redAutoClimbs : number, redFouls: number, redTFouls: number,
    bluePoints : number,  blueFuelScored : number, blueEndClimbsL1 : number, blueEndClimbsL2 : number, blueEndPark : number, blueAutoClimbs : number, blueFouls : number, blueTFouls : number
): Promise<boolean> {

    let matchResults: matchResultFile[] = [];

    const rawResults = await jsonToString(matchResultsPath);

    if (rawResults && rawResults.trim().length > 0) {
        matchResults = JSON.parse(rawResults);
    }

    const matchIndex = await findScheduleIndex(matchNum);
    if (matchIndex == -1) return false;

    if (matchResults.some(m => m.matchNumber === matchNum && m.matchType === matchType)) return false;

    const time = new Date();
    time.setMinutes(time.getMinutes() - 2, time.getSeconds() - 40);

    const day = time.getDate();
    const month = time.getMonth() + 1;
    const year = time.getFullYear();
    const hour = time.getHours();
    const minute = time.getMinutes();

    const redClimbPoints = climbPoints(redAutoClimbs, redEndClimbsL1, redEndClimbsL2, redEndPark);
    const blueClimbPoints = climbPoints(blueAutoClimbs, blueEndClimbsL1, blueEndClimbsL2, blueEndPark);

    const redEnergizedRP = redFuelScored >= RP_THRESHOLDS.energized;
    const redSuperChargedRP = redFuelScored >= RP_THRESHOLDS.supercharged;
    const redTraversalRP = redClimbPoints >= RP_THRESHOLDS.traversal;

    const blueEnergizedRP = blueFuelScored >= RP_THRESHOLDS.energized;
    const blueSuperChargedRP = blueFuelScored >= RP_THRESHOLDS.supercharged;
    const blueTraversalRP = blueClimbPoints >= RP_THRESHOLDS.traversal;

    let redWin = false;
    let blueWin = false;

    if (redPoints == bluePoints) {
        redWin = true;
        blueWin = true;
    } else if (bluePoints > redPoints) {
        blueWin = true;
    } else {
        redWin = true;
    }

    const matchResult: matchResultFile = {
        matchNumber: matchNum,
        matchType: matchType,
        time: [{day:day},{month:month},{year:year},{hour:hour},{minute:minute}],
        alliance:[
            {
                color: "red",
                teams: redAlliance,
                points: redPoints,
                fuelScored: redFuelScored,
                autoClimbs: redAutoClimbs,
                endClimbsL1: redEndClimbsL1,
                endClimbsL2: redEndClimbsL2,
                endPark: redEndPark,
                fouls: redFouls,
                TechFouls: redTFouls,
                energizedRP: redEnergizedRP,
                superchargedRP: redSuperChargedRP,
                traversalRP: redTraversalRP,
                win: redWin
            },
            {
                color: "blue",
                teams: blueAlliance,
                points: bluePoints,
                fuelScored: blueFuelScored,
                autoClimbs: blueAutoClimbs,
                endClimbsL1: blueEndClimbsL1,
                endClimbsL2: blueEndClimbsL2,
                endPark: blueEndPark,
                fouls: blueFouls,
                TechFouls: blueTFouls,
                energizedRP: blueEnergizedRP,
                superchargedRP: blueSuperChargedRP,
                traversalRP: blueTraversalRP,
                win: blueWin
            }
        ]
    }

    matchResults.push(matchResult);
    safeWriteJSON(matchResultsPath, matchResults);
    return true;
}

/**
 * Deletes a recorded match result so it can be re-played (undo/approve workflow).
 * @returns true if a result was found and removed, false otherwise
 */
export async function removeMatchResult(matchNum: number, matchType: string): Promise<boolean> {
    const raw = await jsonToString(matchResultsPath);
    if (!raw || raw.trim().length === 0) return false;

    const matchResults: matchResultFile[] = JSON.parse(raw);
    const nextResults = matchResults.filter(m => !(m.matchNumber === matchNum && m.matchType === matchType));

    if (nextResults.length === matchResults.length) return false;

    safeWriteJSON(matchResultsPath, nextResults);
    return true;
}

/**
 * Returns which color alliance won a given (already-played) match
 */
export async function getWinningColor(matchNum : number, matchType : string) {
    const match = await findMatchResult(matchNum, matchType);
    if (!match) return null;

    if (match.alliance[0].win && match.alliance[1].win) return "tie";
    if (match.alliance[0].win) return "red";
    if (match.alliance[1].win) return "blue";
    return "tie";
}

/**
 * Returns the teams on the given alliance for a played match
 */
export async function getAlliance(matchNum : number, matchType: string, allianceColor : string) {
    const match = await findMatchResult(matchNum, matchType);
    if (!match) return null;

    if (allianceColor === "blue") return match.alliance[1].teams;
    if (allianceColor === "red") return match.alliance[0].teams;
    return null;
}

/**
 * Updates the time the match was played
 */
export async function updateTime(matchNum : number, matchType: string, day : number, month : number, year : number, hour :number, minute : number) {
    const matchResults = await loadResults();
    const idx = matchResults.findIndex(m => m.matchNumber === matchNum && m.matchType === matchType);
    if (idx === -1) return false;

    matchResults[idx].time = [{day}, {month}, {year}, {hour}, {minute}];
    safeWriteJSON(matchResultsPath, matchResults);
    return true;
}

/**
 * Updates the amount of fuel scored for a match after the fact
 */
export async function updateFuelScored(color : string, matchNum : number, matchType: string, newFuelScored : number) {
    const matchResults = await loadResults();
    const idx = matchResults.findIndex(m => m.matchNumber === matchNum && m.matchType === matchType);
    if (idx === -1) return false;

    const colorIndex = color === "blue" ? 1 : 0;
    matchResults[idx].alliance[colorIndex].fuelScored = newFuelScored;
    safeWriteJSON(matchResultsPath, matchResults);
    return true;
}

/**
 * Updates the amount of climbs recorded for a level/match after the fact
 */
export async function updateClimbs(color : string, level : 1 | 2, matchNum : number, matchType: string, newClimbsScored : number) {
    const matchResults = await loadResults();
    const idx = matchResults.findIndex(m => m.matchNumber === matchNum && m.matchType === matchType);
    if (idx === -1) return false;

    const colorIndex = color === "blue" ? 1 : 0;
    if (level === 1) {
        matchResults[idx].alliance[colorIndex].endClimbsL1 = newClimbsScored;
    } else {
        matchResults[idx].alliance[colorIndex].endClimbsL2 = newClimbsScored;
    }

    safeWriteJSON(matchResultsPath, matchResults);
    return true;
}

/**
 * The match number that was last recorded in matchResults.json (0 if none)
 */
export async function getLastMatchNumber() {
    const matchResults = await loadResults();
    if (matchResults.length === 0) return 0;
    return matchResults[matchResults.length - 1].matchNumber;
}

/**
 * The match type that was last recorded in matchResults.json (null if none)
 */
export async function getLastMatchType() {
    const matchResults = await loadResults();
    if (matchResults.length === 0) return null;
    return matchResults[matchResults.length - 1].matchType;
}

async function loadResults(): Promise<matchResultFile[]> {
    const raw = await jsonToString(matchResultsPath);
    if (!raw || raw.trim().length === 0) return [];
    return JSON.parse(raw);
}

async function findMatchResult(matchNum: number, matchType: string): Promise<matchResultFile | undefined> {
    const matchResults = await loadResults();
    return matchResults.find(m => m.matchNumber === matchNum && m.matchType === matchType);
}

async function findScheduleIndex(matchNum : number) {
    const raw = await jsonToString(matchSchedulePath);
    if (!raw || raw.trim().length === 0) return -1;

    const matchSchedule = JSON.parse(raw);
    for (let i = 0; i < matchSchedule.length; i++) {
        if (matchSchedule[i].number == matchNum) return i;
    }
    return -1;
}

export async function getMatchResult(matchNum : number, type : string) {
    return await findMatchResult(matchNum, type);
}

export async function getMatchResultFile() {
    return await loadResults();
}
