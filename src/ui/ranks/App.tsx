import './App.css'
import { useState, useEffect } from "react";

type matchInfo = {
    matchNum: number,
    matchTime: number,
    matchType: 'qualifications' | 'playoffs' | 'finals',
    autoWin: 'red' | 'blue' | 'none',
    period: number,
    red: { alliance: number[] },
    blue: { alliance: number[] }
}

type matchResultFile = {
    matchNumber: number,
    matchType: string,
    time: [{ day: number }, { month: number }, { year: number }, { hour: number }, { minute: number }],
    alliance: [
        {
            color: "red",
            teams: number[],
            points: number,
            energizedRP: boolean,
            superchargedRP: boolean,
            traversalRP: boolean,
            win: boolean
        },
        {
            color: "blue",
            teams: number[],
            points: number,
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

function App() {
    const [rankings, setRankings] = useState<TeamRank[]>([]);
    const [historicalResults, setHistoricalResults] = useState<matchResultFile[]>([]);
    const [matchInfo, setMatchInfo] = useState<matchInfo>();

    const loadRankingsData = async () => {
        try {
            const data = await window.myAPI.getRanks();
            setRankings(data ?? []);
        } catch (err) {
            console.error("Failed to load rankings", err);
        }

        try {
            const files = await window.myAPI.getMatchResultFiles();
            setHistoricalResults(files ?? []);
        } catch (err) {
            console.error("Failed to load match result history", err);
        }
    };

    useEffect(() => {
        loadRankingsData();

        const unsub = window.myAPI.onMatchInfo(async (data: matchInfo) => {
            setMatchInfo(data);
            await loadRankingsData();
        });

        return () => unsub();
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', background: 'radial-gradient(circle at center, #222 0%, #050505 100%)', display: 'flex', flexDirection: 'column', padding: '0', boxSizing: 'border-box', overflow: 'hidden' }}>
            <div style={{ width: '100vw', background: '#111', borderBottom: '6px solid #ffde00', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px 10px 40px', boxShadow: '0 8px 24px rgba(0,0,0,0.7)', boxSizing: 'border-box' }}>
                <div style={{ width: '150px' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h1 style={{ margin: '0', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '6px', fontWeight: '900', color: '#ffde00', textShadow: '2px 2px 0px #000' }}>FIRST ROBOTICS COMPETITION</h1>
                    <h1 style={{ margin: '5px 0 0 0', fontSize: '28px', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: '950', color: '#fff' }}>CURRENT STANDINGS</h1>
                </div>
            </div>

            <div style={{ flex: '1', width: '100vw', padding: '20px 40px', boxSizing: 'border-box', display: 'flex', gap: '20px', overflow: 'hidden' }}>
                <div style={{ flex: '1.4', display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', background: '#000', border: '4px solid #444', borderRadius: '12px', padding: '12px 20px', fontSize: '14px', fontWeight: '900', color: '#ffde00', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        <span style={{ width: '12%' }}>RANK</span>
                        <span style={{ width: '18%' }}>TEAM</span>
                        <span style={{ flex: '1' }}>NAME</span>
                        <span style={{ width: '15%', textAlign: 'center' }}>RP</span>
                        <span style={{ width: '20%', textAlign: 'right' }}>RECORD</span>
                    </div>

                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
                        {rankings.length === 0 && (
                            <p style={{ color: '#888', textAlign: 'center', marginTop: '20px' }}>No ranking data yet — approve a match to populate standings.</p>
                        )}
                        {rankings.map((team, idx) => {
                            const isCurrentMatchTeam = matchInfo && (
                                matchInfo.red.alliance.includes(team.teamNumber) ||
                                matchInfo.blue.alliance.includes(team.teamNumber)
                            );

                            return (
                                <div
                                    key={team.teamNumber}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: isCurrentMatchTeam ? '#443c00' : idx % 2 === 0 ? '#1e1e1e' : '#151515',
                                        border: isCurrentMatchTeam ? '3px solid #ffde00' : '3px solid #333',
                                        borderRadius: '10px',
                                        padding: '10px 20px',
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                                    }}
                                >
                                    <span style={{ width: '12%', fontSize: '20px', fontWeight: '950', color: team.rank <= 3 ? '#ffde00' : '#fff', textShadow: '1px 1px 0px #000' }}>
                                        #{team.rank}
                                    </span>
                                    <span style={{ width: '18%', fontSize: '20px', fontWeight: '950', color: '#fff', textShadow: '1px 1px 0px #000' }}>
                                        {team.teamNumber}
                                    </span>
                                    <span style={{ flex: '1', fontSize: '15px', fontWeight: '800', color: '#ccc', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {team.teamName}
                                    </span>
                                    <span style={{ width: '15%', textAlign: 'center', fontSize: '20px', fontWeight: '950', color: '#ffde00', textShadow: '1px 1px 0px #000' }}>
                                        {team.rankingPoints}
                                    </span>
                                    <span style={{ width: '20%', textAlign: 'right', fontSize: '16px', fontWeight: '900', color: '#fff', fontFamily: 'monospace' }}>
                                        {team.record}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={{ flex: '1', background: '#111', border: '4px solid #444', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '15px' }}>
                    <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '950', color: '#ffde00', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', borderBottom: '3px solid #ffde00', paddingBottom: '5px' }}>
                        MATCH LOG (FILE DATA)
                    </h2>
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                        {historicalResults.length === 0 && (
                            <p style={{ color: '#888', textAlign: 'center', marginTop: '20px' }}>No matches recorded yet.</p>
                        )}
                        {historicalResults.map((file) => {
                            const redData = file.alliance.find(a => a.color === 'red');
                            const blueData = file.alliance.find(a => a.color === 'blue');
                            return (
                                <div key={file.matchNumber} style={{ background: '#222', border: '3px solid #000', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '900', color: '#888', textTransform: 'uppercase' }}>
                                        <span>{file.matchType} {file.matchNumber}</span>
                                        <span>{file.time[3]?.hour}:{file.time[4]?.minute < 10 ? '0' : ''}{file.time[4]?.minute}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <div style={{ flex: '1', background: redData?.win ? '#722' : '#411', border: redData?.win ? '2px solid #ffde00' : '2px solid #311', borderRadius: '6px', padding: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span style={{ fontSize: '16px', fontWeight: '950', color: '#fff' }}>{redData?.points}</span>
                                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#ff453a' }}>{redData?.teams.join(', ')}</span>
                                            <div style={{ display: 'flex', gap: '3px', marginTop: '4px', fontSize: '8px', fontWeight: '900', color: '#ffde00' }}>
                                                {redData?.energizedRP && <span>[ENRG]</span>}
                                                {redData?.superchargedRP && <span>[SUPR]</span>}
                                                {redData?.traversalRP && <span>[TRAV]</span>}
                                            </div>
                                        </div>
                                        <div style={{ flex: '1', background: blueData?.win ? '#227' : '#114', border: blueData?.win ? '2px solid #ffde00' : '2px solid #113', borderRadius: '6px', padding: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span style={{ fontSize: '16px', fontWeight: '950', color: '#fff' }}>{blueData?.points}</span>
                                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#0a84ff' }}>{blueData?.teams.join(', ')}</span>
                                            <div style={{ display: 'flex', gap: '3px', marginTop: '4px', fontSize: '8px', fontWeight: '900', color: '#ffde00' }}>
                                                {blueData?.energizedRP && <span>[ENRG]</span>}
                                                {blueData?.superchargedRP && <span>[SUPR]</span>}
                                                {blueData?.traversalRP && <span>[TRAV]</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
