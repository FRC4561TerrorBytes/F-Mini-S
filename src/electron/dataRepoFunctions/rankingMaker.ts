import { jsonToString } from '../jsonUtils.js'
import { safeWriteJSON } from '../jsonUtils.js'

const matchResultsPath = './src/electron/dataStorage/matchResults.json'
const teamsPath = './src/electron/dataStorage/teams.json'
const teamRanksPath = './src/electron/dataStorage/teamRanks.json'

type TeamRank = {
    rank: number,
    teamNumber: number,
    teamName: string,
    rankingPoints: number,
    record: string,
    epa: number,
    matchesPlayed: number,
    yCards: number
}

export async function updateRankingPoints(){
    const teamsRaw = await jsonToString(teamsPath).catch(() => "[]");
    const matchResultsRaw = await jsonToString(matchResultsPath).catch(() => "[]");
    const existingRanksRaw = await jsonToString(teamRanksPath).catch(() => "");

    const yellowCardMap: Record<number, number> = {};
    if (existingRanksRaw && existingRanksRaw.length > 0) {
        try {
            const existingRanks: any[] = JSON.parse(existingRanksRaw);
            existingRanks.forEach(rank => {
                const tNum = rank.teamNumber || rank.teamNum;
                yellowCardMap[tNum] = rank.yCards || 0;
            });
        } catch(e) {
            console.error("Error parsing existing ranks maps:", e);
        }
    }

    if (!teamsRaw || !matchResultsRaw || teamsRaw.length === 0 || matchResultsRaw.length === 0) return;

    const teams = JSON.parse(teamsRaw);
    const matchResults = JSON.parse(matchResultsRaw);
    const teamRanks: TeamRank[] = [];

    for (let j = 0; j < teams.length; j++) {
        const teamNum = teams[j].number;
        const teamName = teams[j].name || `Team ${teamNum}`;
        
        let rankingPoints = 0;
        let pointsScored = 0;
        let matchesAmt = 0;
        let wins = 0;
        let losses = 0;
        let ties = 0;

        for (let i = 0; i < matchResults.length; i++) {
            const alliance0 = matchResults[i].alliance[0];
            const alliance1 = matchResults[i].alliance[1];

            const isAlliance0 = alliance0.teams.includes(teamNum);
            const isAlliance1 = alliance1.teams.includes(teamNum);

            if (isAlliance0 || isAlliance1) {
                matchesAmt++;
                const myAlliance = isAlliance0 ? alliance0 : alliance1;

                pointsScored += myAlliance.points;

                if (myAlliance.energizedRP) rankingPoints++;
                if (myAlliance.traversalRP) rankingPoints++;
                if (myAlliance.superchargedRP) rankingPoints++;

                if (alliance0.win && alliance1.win) {
                    rankingPoints += 1;
                    ties++;
                } else if (myAlliance.win) {
                    rankingPoints += 3;
                    wins++;
                } else {
                    losses++;
                }
            }
        }

        const recordString = `${wins}-${losses}-${ties}`;

        teamRanks.push({
            rank: 1, 
            teamNumber: teamNum,
            teamName: teamName,
            rankingPoints: rankingPoints,
            record: recordString,
            epa: matchesAmt > 0 ? (pointsScored / matchesAmt) : 0,
            matchesPlayed: matchesAmt,
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
        teamRanks[i].rank = i + 1;
    }

    await safeWriteJSON(teamRanksPath, teamRanks);
}

export async function getRanks() {

    await updateRankingPoints();

    const teamsRaw = await jsonToString(teamRanksPath).catch(() => "[]");

    if (!teamsRaw || teamsRaw.trim().length === 0) return [];

    try {
        const rawData = JSON.parse(teamsRaw);
        
        return rawData.map((r: any) => ({
            rank: r.rank,
            teamNumber: r.teamNumber || r.teamNum,
            teamName: r.teamName || `Team ${r.teamNumber || r.teamNum}`,
            rankingPoints: r.rankingPoints,
            record: r.record || "0-0-0"
        }));
    } catch (e) {
        console.error("Error formatting ranks for frontend:", e);
        return [];
    }
}