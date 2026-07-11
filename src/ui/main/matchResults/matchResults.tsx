import { useState, useEffect } from "react";

type matchResultFile = {
    matchNumber: number,
    matchType: string,
    time: [{ day: number }, { month: number }, { year: number }, { hour: number }, { minute: number }],
    alliance: [
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

type TeamRank = {
    rank: number,
    teamNumber: number,
    teamName: string,
    rankingPoints: number,
    record: string
}

function escapeCsvValue(value: string | number | boolean): string {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

function downloadCSV(filename: string, headers: string[], rows: (string | number | boolean)[][]) {
    const lines = [headers.map(escapeCsvValue).join(',')];
    rows.forEach(row => {
        lines.push(row.map(escapeCsvValue).join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function MatchResults() {
    const [results, setResults] = useState<matchResultFile[]>([]);
    const [rankings, setRankings] = useState<TeamRank[]>([]);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const files = await window.myAPI.getMatchResultFiles();
            setResults(files ?? []);
        } catch (err) {
            console.error("Failed to load match results", err);
        }

        try {
            const ranks = await window.myAPI.getRanks();
            setRankings(ranks ?? []);
        } catch (err) {
            console.error("Failed to load rankings", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();

        const unsub = window.myAPI.onMatchInfo(() => {
            loadData();
        });

        return () => unsub();
    }, []);

    const exportResultsCsv = () => {
        const headers = [
            'Match Number', 'Match Type', 'Time',
            'Red Teams', 'Red Points', 'Red Fuel', 'Red Auto Climbs', 'Red L1 Climbs', 'Red L2 Climbs', 'Red Park', 'Red Fouls', 'Red Tech Fouls', 'Red Energized RP', 'Red Supercharged RP', 'Red Traversal RP', 'Red Win',
            'Blue Teams', 'Blue Points', 'Blue Fuel', 'Blue Auto Climbs', 'Blue L1 Climbs', 'Blue L2 Climbs', 'Blue Park', 'Blue Fouls', 'Blue Tech Fouls', 'Blue Energized RP', 'Blue Supercharged RP', 'Blue Traversal RP', 'Blue Win'
        ];

        const rows = results.map(r => {
            const red = r.alliance[0];
            const blue = r.alliance[1];
            const timeStr = `${r.time[2]?.year}-${r.time[1]?.month}-${r.time[0]?.day} ${r.time[3]?.hour}:${r.time[4]?.minute}`;

            return [
                r.matchNumber, r.matchType, timeStr,
                red.teams.join(' '), red.points, red.fuelScored, red.autoClimbs, red.endClimbsL1, red.endClimbsL2, red.endPark, red.fouls, red.TechFouls, red.energizedRP, red.superchargedRP, red.traversalRP, red.win,
                blue.teams.join(' '), blue.points, blue.fuelScored, blue.autoClimbs, blue.endClimbsL1, blue.endClimbsL2, blue.endPark, blue.fouls, blue.TechFouls, blue.energizedRP, blue.superchargedRP, blue.traversalRP, blue.win
            ];
        });

        downloadCSV('match_results.csv', headers, rows);
    };

    const exportRankingsCsv = () => {
        const headers = ['Rank', 'Team Number', 'Team Name', 'Ranking Points', 'Record'];
        const rows = rankings.map(r => [r.rank, r.teamNumber, r.teamName, r.rankingPoints, r.record]);
        downloadCSV('team_rankings.csv', headers, rows);
    };

    return (
        <div style={{ color: '#fff', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h1>Match Results</h1>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={loadData} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
                    <button onClick={exportResultsCsv} disabled={results.length === 0}>Export Results CSV</button>
                </div>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: '40px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ background: '#222', textAlign: 'left' }}>
                            <th style={{ padding: '8px' }}>Match</th>
                            <th style={{ padding: '8px' }}>Type</th>
                            <th style={{ padding: '8px' }}>Red Teams</th>
                            <th style={{ padding: '8px' }}>Red Pts</th>
                            <th style={{ padding: '8px' }}>Blue Teams</th>
                            <th style={{ padding: '8px' }}>Blue Pts</th>
                            <th style={{ padding: '8px' }}>Winner</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.length === 0 && (
                            <tr><td colSpan={7} style={{ padding: '12px', textAlign: 'center', color: '#888' }}>No matches recorded yet.</td></tr>
                        )}
                        {results.map(r => {
                            const red = r.alliance[0];
                            const blue = r.alliance[1];
                            const winnerLabel = red.win && blue.win ? 'Tie' : red.win ? 'Red' : 'Blue';
                            return (
                                <tr key={`${r.matchType}-${r.matchNumber}`} style={{ borderBottom: '1px solid #333' }}>
                                    <td style={{ padding: '8px' }}>{r.matchNumber}</td>
                                    <td style={{ padding: '8px' }}>{r.matchType}</td>
                                    <td style={{ padding: '8px' }}>{red.teams.join(', ')}</td>
                                    <td style={{ padding: '8px' }}>{red.points}</td>
                                    <td style={{ padding: '8px' }}>{blue.teams.join(', ')}</td>
                                    <td style={{ padding: '8px' }}>{blue.points}</td>
                                    <td style={{ padding: '8px' }}>{winnerLabel}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h1>Team Rankings</h1>
                <button onClick={exportRankingsCsv} disabled={rankings.length === 0}>Export Rankings CSV</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ background: '#222', textAlign: 'left' }}>
                            <th style={{ padding: '8px' }}>Rank</th>
                            <th style={{ padding: '8px' }}>Team</th>
                            <th style={{ padding: '8px' }}>Name</th>
                            <th style={{ padding: '8px' }}>RP</th>
                            <th style={{ padding: '8px' }}>Record</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rankings.length === 0 && (
                            <tr><td colSpan={5} style={{ padding: '12px', textAlign: 'center', color: '#888' }}>No ranking data yet.</td></tr>
                        )}
                        {rankings.map(r => (
                            <tr key={r.teamNumber} style={{ borderBottom: '1px solid #333' }}>
                                <td style={{ padding: '8px' }}>{r.rank}</td>
                                <td style={{ padding: '8px' }}>{r.teamNumber}</td>
                                <td style={{ padding: '8px' }}>{r.teamName}</td>
                                <td style={{ padding: '8px' }}>{r.rankingPoints}</td>
                                <td style={{ padding: '8px' }}>{r.record}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default MatchResults;
