import { jsonToString } from '../jsonUtils.js'
import { safeWriteJSON } from '../jsonUtils.js'

const matchResultsPath = './src/electron/dataStorage/matchResults.json'
const teamsPath = './src/electron/dataRepository/teams.json'
const teamRanksPath = './src/electron/dataRepository/teamRanks.json'

type TeamRank = {
    teamNum: number,
    matchesPlayed: number,
    rank: number,
    rankingPoints: number,
    epa: number,
    yCards: number
}

export async function updateRankingPoints(){
    const teamsRaw = await jsonToString(teamsPath);
    const matchResultsRaw = await jsonToString(matchResultsPath);
    const existingRanksRaw = await jsonToString(teamRanksPath).catch(() => "");

    const yellowCardMap: Record<number, number> = {};
    if (existingRanksRaw && existingRanksRaw.length > 0) {
        const existingRanks: TeamRank[] = JSON.parse(existingRanksRaw);
        existingRanks.forEach(rank => {
            yellowCardMap[rank.teamNum] = rank.yCards || 0;
        });
    }

    if (teamsRaw.length === 0 || matchResultsRaw.length === 0) return;

    const teams = JSON.parse(teamsRaw);
    const matchResults = JSON.parse(matchResultsRaw);
    const teamRanks: TeamRank[] = [];

    for (let j = 0; j < teams.length; j++) {
        const teamNum = teams[j].number;
        let rankingPoints = 0;
        let pointsScored = 0;
        let matchesAmt = 0;

        for (let i = 0; i < matchResults.length; i++) {
            const alliance0 = matchResults[i].alliance[0];
            const alliance1 = matchResults[i].alliance[1];

            if (alliance0.teams.includes(teamNum)) {
                matchesAmt++;
                pointsScored += alliance0.points;

                if (alliance0.energizedRP) rankingPoints++;
                if (alliance0.traversalRP) rankingPoints++;
                if (alliance0.superchargedRP) rankingPoints++;

                if (alliance0.win && alliance1.win) {
                    rankingPoints++;
                } else if (alliance0.win) {
                    rankingPoints += 3;
                }
            } 
            
            else if (alliance1.teams.includes(teamNum)) {
                matchesAmt++;
                pointsScored += alliance1.points;

                if (alliance1.energizedRP) rankingPoints++;
                if (alliance1.traversalRP) rankingPoints++;
                if (alliance1.superchargedRP) rankingPoints++;

                if (alliance0.win && alliance1.win) {
                    rankingPoints++;
                } else if (alliance1.win) {
                    rankingPoints += 3;
                }
            }
        }

        teamRanks.push({
            teamNum: teamNum,
            matchesPlayed: matchesAmt,
            rank: 1,
            rankingPoints: rankingPoints,
            epa: matchesAmt > 0 ? (pointsScored / matchesAmt) : 0,
            yCards: yellowCardMap[teamNum] || 0
        });
    }

    teamRanks.sort((a, b) => {
        if (b.rankingPoints !== a.rankingPoints) {
            return b.rankingPoints - a.rankingPoints;
        }
        return b.epa - a.epa;
    });

    for (let i = 0; i < teamRanks.length; i++) {
        teamRanks[i]!.rank = i + 1;
    }

    await safeWriteJSON(teamRanksPath, teamRanks);
}