import { jsonToString } from '../jsonUtils.js'
import { safeWriteJSON } from '../jsonUtils.js'
import { getTeamSkill } from './teamMaker.js'

const matchSchedulePath = './src/electron/dataStorage/matchSchedule.json'
const teamsPath = './src/electron/dataStorage/teams.json'

//teams -> JSON.parse(jsonToString(teamsPath))
//matchSchedule -> JSON.parse(jsonToString(matchSchedulePath))

/**
 * Teams team json and returns options for the array based on input amount
 * @param optionsNum - the amount of options in the output array you want
 * @returns Returns possible options for a match in an array made of two arrays, [Matches total, Matches per team]
 */
export async function matchOptions( optionsNum : number){
    const teams = JSON.parse( await jsonToString(teamsPath));

    const optionAmount = optionsNum;
    const roundsPerTeamOptions = new Array(optionAmount).fill(1);
    const roundsTotalOptions = new Array(optionAmount);
    

    for(let i = 0; i < optionAmount + 1; i++){

        let rounds = 1;
        if(i > 0)
        rounds = roundsPerTeamOptions[i-1]+1;

        search:
        while(true){
            if((teams.length * rounds) % 6 == 0){
                roundsPerTeamOptions[i] = rounds;
                roundsTotalOptions[i] = (teams.length * rounds)/6;
                break search;
            }
            rounds++;
        }
    }

    return [roundsTotalOptions, roundsPerTeamOptions];
}

/**
 * Pulls in the respective json schedule from Chezy Arena, maps the team numbers to the teams listed in the teams.json file
 * @param matchesPerTeam 
 * @returns match schedule
 */
export async function updateMatchSchedule(matchesPerTeam : number){
    const teams = JSON.parse(await jsonToString(teamsPath));
    const matchSchedule = JSON.parse(
        await jsonToString('./schedules/' + teams.length + '_' + matchesPerTeam + '.json')
    );

    const normalizeTeam = (teamRef: number) => {
        if (teamRef >= 1 && teamRef <= teams.length) {
            return Number(teams[teamRef - 1].number);
        }

        if (teamRef >= 0 && teamRef < teams.length) {
            return Number(teams[teamRef].number);
        }

        return teamRef;
    };

    const mappedSchedule = matchSchedule.map((match: any) => ({
        number: match.number,
        redAlliance: match.redAlliance.map((teamRef: number) => normalizeTeam(teamRef)),
        blueAlliance: match.blueAlliance.map((teamRef: number) => normalizeTeam(teamRef))
    }));

    safeWriteJSON(matchSchedulePath, mappedSchedule);
    return mappedSchedule;
}


/**
 * @returns match schedule
 */
export async function getMatchSchedule(){
    return JSON.parse( await jsonToString(matchSchedulePath));
}
