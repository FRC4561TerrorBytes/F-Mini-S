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
 * Updates match schedule json and returns match schedule
 * @param matchesPerTeam
 * @param totalMatches
 * @returns A Match[] containing match
 */
export async function getAndUpdateMatchSchedule(matchesPerTeam : number, totalMatches : number){

    await generateMatchSchedule(matchesPerTeam, totalMatches);
  
    return JSON.parse( await jsonToString(matchSchedulePath));
}

/**
 * @returns match schedule
 */
export async function getMatchSchedule(){
    return JSON.parse( await jsonToString(matchSchedulePath));
}

/**
 * This generates the match schedule based on the matchOptions function. 
 * It automaticly updates the matchSchedule JSON once done loading.
 */
export async function generateMatchSchedule(matchesPerTeam : number, totalMatches : number) {

    let end = false;

    let attmepts = 0;

    while(!end && attmepts < totalMatches*2){
        attmepts++;
        try{
            end = true;
            await generateMatchScheduleAttempt(totalMatches, matchesPerTeam);
        }
        catch{
            end = false;
        }
    }

    new Error("Match Generation Failed");
}

/**
 * Generates the match schecdule for the matchs and updates JSON
 */
async function generateMatchScheduleAttempt(totalMatches : number, matchesPerTeam : number){

    const teams = JSON.parse(await jsonToString(teamsPath));

    type Match = {
        number: number,
        redAlliance: number[],
        blueAlliance: number[]
    };

    type MatchFile = Match[];

    const matches : MatchFile = [];

    /* Example
    matches.push({
        number: 2,
        redAlliance: [11,12,13],
        blueAlliance: [11,12,13]
    });
    */

    const teamNumArr = new Array(teams.length);
   
    for(let i = 0; i < teamNumArr.length; i++) { teamNumArr[i] = teams[i].number; }

    const teamSkillMap : Map<number,number> = new Map();

    for(let i = 0; i < teams.length; i++){

        teamSkillMap.set(teams[i].number, await getTeamSkill(teams[i].number));
    }

    const teamsLeft: number[] = [];

    for(let i = 0; i < teams.length; i++){

        for(let j = 0; j < matchesPerTeam; j++){

            teamsLeft.push(teams[i].number);
        }
    }

    for(let i = 0; i < teamsLeft.length; i++){

        const ran = Math.floor(Math.random()*teamsLeft.length);
        const temp = teamsLeft[i];
        teamsLeft[i] = teamsLeft[ran];
        teamsLeft[ran] = temp;
    }

    //first 3 red, second three blue
    let teamsLastMatch : number[] = [0,0,0,0,0,0];

        for(let matchCounter = 1; matchCounter <= totalMatches; matchCounter++){

            const alliance: number[] = [];

            let count = 0;
            while (alliance.length < 6) {

                if(count >= (teamsLeft.length*2)+5){
                    throw new Error("Generate match stuck in loop");
                }
                const team = teamsLeft[0];

                const duplicate = alliance.includes(team);
                const backToBack =
                    teams.length >= 12 &&
                    teamsLastMatch.includes(team);

                if (!duplicate && !backToBack) {
                    alliance.push(team);
                    teamsLeft.shift();
                } else {
                    teamsLeft.push(teamsLeft.shift()!);
                }

                if(alliance.length == 6){

                    const tolerance = 3 
                    const redSum = (teamSkillMap.get(alliance[0])??1) + (teamSkillMap.get(alliance[1])??1) + (teamSkillMap.get(alliance[2])??1);
                    const blueSum = (teamSkillMap.get(alliance[3])??1) + (teamSkillMap.get(alliance[4])??1) + (teamSkillMap.get(alliance[5])??1);

                    if(!(redSum + tolerance >= blueSum) && !(redSum - tolerance <= blueSum)){

                       const redTo15 = 15 - redSum;
                       const redTo3 = redSum - 3;
                       const blueTo15 = 15 - blueSum;
                       const blueTo3 = blueSum - 3;

                       const vals = [redTo15, redTo3, blueTo15, blueTo3];

                       let minDex = 0;

                       for(let i = 0; i < vals.length; i++){

                            if(vals[i] < vals[minDex])
                                minDex = i;
                       }

                       switch(minDex){

                            case 0:{
                                let maxTeam = 0;
                                for(let i = 0; i < 3; i++){
                                    if((teamSkillMap.get(alliance[i])?? 0) > (teamSkillMap.get(alliance[maxTeam])?? 0))
                                        maxTeam = i;
                                }
                                teamsLeft.push(alliance[maxTeam]);
                                alliance.splice(maxTeam,1);
                            } break;

                            case 1:{
                                let minTeam = 0;
                                for(let i = 0; i < 3; i++){
                                    if((teamSkillMap.get(alliance[i])?? 0) < (teamSkillMap.get(alliance[minTeam])?? 0))
                                        minTeam = i;
                                }
                                teamsLeft.push(alliance[minTeam]);
                                alliance.splice(minTeam,1);
                            } break;

                            case 2:{
                                let maxTeam = 3;
                                for(let i = 3; i < 6; i++){
                                    if((teamSkillMap.get(alliance[i])?? 0) > (teamSkillMap.get(alliance[maxTeam])?? 0))
                                        maxTeam = i;
                                }
                                teamsLeft.push(alliance[maxTeam]);
                                alliance.splice(maxTeam,1);
                            } break;

                            case 3:{
                                let minTeam = 3;
                                for(let i = 3; i < 6; i++){
                                    if((teamSkillMap.get(alliance[i])?? 0) < (teamSkillMap.get(alliance[minTeam])?? 0))
                                        minTeam = i;
                                }
                                teamsLeft.push(alliance[minTeam]);
                                alliance.splice(minTeam,1);
                            } break;
                       }

                    }
                    
                }
                count++;
            }

            teamsLastMatch = [alliance[0],alliance[1],alliance[2],alliance[3],alliance[4],alliance[5]];

            matches.push({
            number: matchCounter,
            redAlliance: [alliance[0],alliance[1],alliance[2],],
            blueAlliance: [alliance[3],alliance[4],alliance[5]]
            });

            
        }
    safeWriteJSON(matchSchedulePath, matches);
}