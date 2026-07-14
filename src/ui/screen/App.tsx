import './App.css'
import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import type MatchResults from '../main/matchResults/matchResults';
import { storageBox } from '../globalStorage';

type matchDisplay = {
    redName: string,
    redTeams: number[],
    redTeamNames: string[]
    blueName: string,
    blueTeamNames: string[]
    blueTeams: number[],
}

type MatchFinal = {
    number: number,
    redAllianceNum: number[],
    redAlliance: string[],
    blueAllianceNum: number[],
    blueAlliance: string[]
}

type alliancePerformance = {
    alliance: number[],
    points: number,
    fuelScored: number,
    endClimbsL1: number,
    endClimbsL2: number,
    endPark: number,
    autoClimbs: number,
    autoFuelScored: number,
    fouls: number,
    tFouls: number,
    endPoints: number,
    rp: number
}

type matchInfo = {
    matchNum: number,
    matchTime: number,
    matchType: 'qualifications' | 'playoffs' | 'finals',
    autoWin: 'red' | 'blue' | 'none',
    period: number,
    red: alliancePerformance,
    blue: alliancePerformance
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
    record: string,
    epa: number,
    matchesPlayed: number,
    yCards: number
}

function App() {
    const [info, setInfo] = useState<matchDisplay>();
    const [matchInfo, setMatchInfo] = useState<matchInfo>();
    const [frozenMatchInfo, setFrozenMatchInfo] = useState<matchInfo>();
    const [camId, setCamId] = useState<string>("");
    const [mirror, setMirror] = useState<boolean>(false);
    const [colorMirror, setColorMirror] = useState<boolean>(false);
    const [fallbackId, setFallbackId] = useState<string>("");
    const [totalMatches, setTotalMatches] = useState<number>();
    const [teamNames, setTeamNames] = useState<MatchFinal[]>([]);
    const [dis, setDis] = useState(0);
    const [rankings, setRankings] = useState<TeamRank[]>([]);
    const [historicalResults, setHistoricalResults] = useState<matchResultFile[]>([]);
    const [videoPlaying, setVideoPlaying] = useState<boolean>(false);

    const webcamRef = useRef<Webcam | null>(null);
    const disRef = useRef(dis);

    const redWinVideoSrc = '../../../images/red-win.mp4';
    const blueWinVideoSrc = '../../../images/blue-win.mp4';
    const tieVideoSrc = '../../../images/tie.mp4';

    const sounds = {
  MatchResult: new Audio('../../../../../images/results-video.mp3'),
};

const playSound = (sound: HTMLAudioElement) => {
  sound.currentTime = 0;
  sound.play().catch(err => {
    console.log("Sound blocked:", err);
  });
};

    useEffect(() => {
        disRef.current = dis;
    }, [dis]);

    useEffect(() => {

        const unsubscribe = window.myAPI.onDisplayScreenChanged((screenIndex: number) => {
            setDis(screenIndex); 
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (dis === 1) {
            setVideoPlaying(true);
            if(!(storageBox.get('result-sound') ?? false)){
                playSound(sounds.MatchResult);
                storageBox.set('result-sound', true);
            }
        }

        if(dis != 1){
            storageBox.set('result-sound', false);
            
        }

    }, [dis]);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(() => navigator.mediaDevices.enumerateDevices())
            .then((mediaDevices) => {
                const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput');
                if (videoDevices.length > 0) {
                    setFallbackId(videoDevices[0].deviceId);
                }
            })
            .catch(err => console.error("Camera permission denied:", err));
    }, []);

    const getTeamName = async (team: number) => {
        return await window.myAPI.getTeamName(team);
    }

    const getSchedule = async () => {
        const tempMatches = await window.myAPI.getMatchSchedule();
        if (!tempMatches) return;

        const tempTeamMatches: MatchFinal[] = [];

        for (let i = 0; i < tempMatches.length; i++) {
            const tempTeamName: MatchFinal = ({
                number: tempMatches[i].number,
                redAllianceNum: [tempMatches[i].redAlliance[0], tempMatches[i].redAlliance[1], tempMatches[i].redAlliance[2]],
                redAlliance: [await getTeamName(tempMatches[i].redAlliance[0]), await getTeamName(tempMatches[i].redAlliance[1]), await getTeamName(tempMatches[i].redAlliance[2])],
                blueAllianceNum: [tempMatches[i].blueAlliance[0], tempMatches[i].blueAlliance[1], tempMatches[i].blueAlliance[2]],
                blueAlliance: [await getTeamName(tempMatches[i].blueAlliance[0]), await getTeamName(tempMatches[i].blueAlliance[1]), await getTeamName(tempMatches[i].blueAlliance[2])],
            });
            tempTeamMatches.push(tempTeamName);
        }

        setTeamNames(tempTeamMatches);
        setTotalMatches(tempTeamMatches.length);
    }

    useEffect(() => {
        const mI = window.myAPI.onMatchInfo((data: matchInfo) => {
            

             setMatchInfo(data);

             if (disRef.current !== 1) {
                 setFrozenMatchInfo(data);
             }

            const matchNum = data.matchNum;

            const scheduleEntry = teamNames[matchNum - 1];
            if (scheduleEntry) {
                setInfo({
                    redName: 'Red Alliance',
                    redTeams: scheduleEntry.redAllianceNum,
                    redTeamNames: scheduleEntry.redAlliance,
                    blueName: 'Blue Alliance',
                    blueTeamNames: scheduleEntry.blueAlliance,
                    blueTeams: scheduleEntry.blueAllianceNum,
                });
            } else {
                setInfo({
                    redName: 'Red Alliance',
                    redTeams: data.red.alliance,
                    redTeamNames: [],
                    blueName: 'Blue Alliance',
                    blueTeamNames: [],
                    blueTeams: data.blue.alliance,
                });
            }
            
        });
        return () => mI();
    }, [teamNames]);

    useEffect(() => {
        const getS = async () => {
            await getSchedule();
        }
        getS();
    }, [])

    useEffect(() => {
        const Cam = window.myAPI.onCameraUpdate((incomingId: string) => { setCamId(incomingId); });
        const Mirror = window.myAPI.onMirrorToggle((mirrorState: boolean) => { setMirror(mirrorState); });
        const Color = window.myAPI.onColorMirrorToggle((colorState: boolean) => { setColorMirror(colorState); });
        return () => { Cam(); Mirror(); Color(); };
    }, []);

    useEffect(() => {
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

        if (dis === 2) {
            loadRankingsData();
        }

        if (dis !== 2) return;

        loadRankingsData();

        const unsub = window.myAPI.onMatchInfo(async () => {
            await loadRankingsData();
        });

        return () => unsub();
    }, [dis]);

    const activeDeviceId = camId || fallbackId;

    const videoConstraints = {
        deviceId: activeDeviceId ? { exact: activeDeviceId } : undefined,
        width: 1280,
        height: 720
    };

    const cnvtTime = (num: number) => {
        return Math.floor(num / 60) + ':' + (num % 60 < 10 ? '0' : '') + (num % 60);
    }

    const cnvtPeriodTime = (num: number) => {
        if (num >= 130) return num - 130;
        if (num >= 105) return num - 105;
        if (num >= 80) return num - 80;
        if (num >= 55) return num - 55;
        if (num >= 30) return num - 30;
        return num;
    }

    const periodRed = (num: number) => {
        if (num === 1 || num === 6) return true;
        if ((matchInfo?.autoWin ?? 'red') === 'red') {
            return num === 3 || num === 5;
        } else if ((matchInfo?.autoWin ?? 'red') === 'blue') {
            return num === 2 || num === 4;
        }
        return false;
    }

    const periodBlue = (num: number) => {
        if (num === 1 || num === 6) return true;
        if ((matchInfo?.autoWin ?? 'red') === 'red') {
            return num === 2 || num === 4;
        } else if ((matchInfo?.autoWin ?? 'red') === 'blue') {
            return num === 3 || num === 5;
        }
        return false;
    }

    const cnvtTimePeriod = (num: number) => {
        if (num >= 130) return 1;
        if (num >= 105) return 2;
        if (num >= 80) return 3;
        if (num >= 55) return 4;
        if (num >= 30) return 5;
        return 6
    }

    const teamLabel = (names: string[] | undefined, idx: number) => names?.[idx] && names[idx] !== 'undefined' ? names[idx] : '';

    if (dis === 0) {

        const showPeriodInfo = (matchInfo?.matchTime ?? 0) < 140;

        if (colorMirror)
            return (
                <div>
                    <div className='top-bar'>
                        <div className='fuel-container'>
                            <h1 className='blue-fuel'><img className='blue-balls' src='../../../images/blue-balls.png'></img>{matchInfo?.blue?.fuelScored ?? -1} / {(matchInfo?.blue?.fuelScored ?? -1) < 50 ? 50 : 100}</h1>
                            <img style={{ transform: 'scaleX(-1)', opacity: ((periodBlue(cnvtTimePeriod(matchInfo?.matchTime ?? -1))) ? 1 : 0) }} className='blue-active' src={'../../../images/period-arrow.png'} alt="Active Arrow" />
                        </div>

                        <div className='center-dis'>
                            <h1 className='logo'>Rebuilt</h1>
                            <h1 className='match-des'>
                                {matchInfo?.matchType ?? 'qualifications'} {matchInfo?.matchNum ?? -1}
                                {(matchInfo?.matchType ?? 'qualifications') === 'qualifications' ? ' of ' + (totalMatches ?? -1) : ''}
                            </h1>

                            <div className='scoreboard-row'>
                                <div className='blue-info'>
                                    <div className='blue-score-box'>
                                        <h1 className='blue-score'>{((matchInfo?.blue?.points ?? -1) - (matchInfo?.blue?.endPoints ?? -1))}</h1>
                                    </div>
                                    <div className='blue'>
                                        {((matchInfo?.matchType ?? 'playoffs') !== 'qualifications') && (
                                            <h1 className='blue-name'>{info?.blueName ?? "None"}</h1>
                                        )}
                                        <div className='blue-teams-box'>
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className='blue-teams'>
                                                    <h1 style={{ margin: 0 }}>{matchInfo?.blue?.alliance[i] ?? -1}</h1>
                                                    {teamLabel(info?.blueTeamNames, i) && (
                                                        <div className='team-name-tag'>{teamLabel(info?.blueTeamNames, i)}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className='center-info'>
                                    <h1 className='time'>{cnvtTime(matchInfo?.matchTime ?? -1)}</h1>
                                        <div className={'period-info-' + (showPeriodInfo ? 'show' : 'close')}>
                                            <h1 className={'period-' + (showPeriodInfo ? 'show' : 'close')}>{cnvtTimePeriod(matchInfo?.matchTime ?? -1) ?? -1}/6</h1>
                                            <h1 className={'period-time-' + (showPeriodInfo ? 'show' : 'close')}>:{cnvtPeriodTime(matchInfo?.matchTime ?? -1)}</h1>
                                        </div>
                                </div>
                                <div className='red-info'>
                                    <div className='red-score-box'>
                                        <h1 className='red-score'>{((matchInfo?.red?.points ?? -1) - (matchInfo?.red?.endPoints ?? -1))}</h1>
                                    </div>
                                    <div className='red'>
                                        {((matchInfo?.matchType ?? 'playoffs') !== 'qualifications') && (
                                            <h1 className='red-name'>{info?.redName ?? "None"}</h1>
                                        )}
                                        <div className='red-teams-box'>
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className='red-teams'>
                                                    <h1 style={{ margin: 0 }}>{matchInfo?.red?.alliance[i] ?? -1}</h1>
                                                    {teamLabel(info?.redTeamNames, i) && (
                                                        <div className='team-name-tag'>{teamLabel(info?.redTeamNames, i)}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='fuel-container'>
                            <img style={{ opacity: ((periodRed(cnvtTimePeriod(matchInfo?.matchTime ?? -1))) ? 1 : 0) }} className='red-active' src={'../../../images/period-arrow.png'} alt="Active Arrow" />
                            <h1 className='red-fuel'><img className='red-balls' src='../../../images/red-balls.png'></img>{matchInfo?.red?.fuelScored ?? -1} / {(matchInfo?.red.fuelScored ?? -1) < 50 ? 50 : 100}</h1>
                        </div>
                    </div>

                    {activeDeviceId && (
                        <Webcam
                            className='vid'
                            key={activeDeviceId}
                            audio={false}
                            mirrored={mirror}
                            ref={webcamRef}
                            videoConstraints={videoConstraints}
                            forceScreenshotSourceSize={true}
                        />
                    )}
                </div>
            );
        else
            return (
                <div>
                    <div className='top-bar'>
                        <div className='fuel-container'>
                            <h1 className='red-fuel'><img className='red-balls' src='../../../images/red-balls.png'></img>{((matchInfo?.red?.points ?? -1) - (matchInfo?.red?.endPoints ?? -1))} / {(matchInfo?.red?.fuelScored ?? -1) < 50 ? 50 : 100}</h1>
                            <img style={{ transform: 'scaleX(-1)', opacity: ((periodRed(cnvtTimePeriod(matchInfo?.matchTime ?? -1))) ? 1 : 0) }} className='red-active' src={'../../../images/period-arrow.png'} alt="Active Arrow" />
                        </div>

                        <div className='center-dis'>
                            <h1 className='logo'>Rebuilt</h1>
                            <h1 className='match-des'>
                                {matchInfo?.matchType ?? 'qualifications'} {matchInfo?.matchNum ?? -1}
                                {(matchInfo?.matchType ?? 'qualifications') === 'qualifications' ? ' of ' + (totalMatches ?? -1) : ''}
                            </h1>

                            <div className='scoreboard-row'>
                                <div className='red-info'>
                                    <div className='red'>
                                        {((matchInfo?.matchType ?? 'playoffs') !== 'qualifications') && (
                                            <h1 className='red-name'>{info?.redName ?? "None"}</h1>
                                        )}
                                        <div className='red-teams-box'>
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className='red-teams'>
                                                    <h1 style={{ margin: 0 }}>{matchInfo?.red?.alliance[i] ?? -1}</h1>
                                                    {teamLabel(info?.redTeamNames, i) && (
                                                        <div className='team-name-tag'>{teamLabel(info?.redTeamNames, i)}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className='red-score-box'>
                                        <h1 className='red-score'>{((matchInfo?.red?.points ?? -1) - (matchInfo?.red?.endPoints ?? -1))}</h1>
                                    </div>
                                </div>

                                <div className='center-info'>
                                    <h1 className='time'>{cnvtTime(matchInfo?.matchTime ?? -1)}</h1>
                                    
                                        <div className={'period-info-' + (showPeriodInfo ? 'show' : 'close')}>
                                            <h1 className={'period-' + (showPeriodInfo ? 'show' : 'close')}>{cnvtTimePeriod(matchInfo?.matchTime ?? -1) ?? -1}/6</h1>
                                            <h1 className={'period-time-' + (showPeriodInfo ? 'show' : 'close')}>:{cnvtPeriodTime(matchInfo?.matchTime ?? -1)}</h1>
                                        </div>
                               
                                </div>
                                <div className='blue-info'>
                                    <div className='blue'>
                                        {((matchInfo?.matchType ?? 'playoffs') !== 'qualifications') && (
                                            <h1 className='blue-name'>{info?.blueName ?? "None"}</h1>
                                        )}
                                        <div className='blue-teams-box'>
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className='blue-teams'>
                                                    <h1 style={{ margin: 0 }}>{matchInfo?.blue?.alliance[i] ?? -1}</h1>
                                                    {teamLabel(info?.blueTeamNames, i) && (
                                                        <div className='team-name-tag'>{teamLabel(info?.blueTeamNames, i)}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className='blue-score-box'>
                                        <h1 className='blue-score'>{((matchInfo?.blue?.points ?? -1) - (matchInfo?.blue?.endPoints ?? -1))}</h1>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='fuel-container'>
                            <img style={{ opacity: ((periodBlue(cnvtTimePeriod(matchInfo?.matchTime ?? -1))) ? 1 : 0) }} className='blue-active' src={'../../../images/period-arrow.png'} alt="Active Arrow" />
                            <h1 className='blue-fuel'><img className='blue-balls' src='../../../images/blue-balls.png'></img>{matchInfo?.blue.fuelScored ?? -1} / {(matchInfo?.blue.fuelScored ?? -1) < 50 ? 50 : 100}</h1>
                        </div>
                    </div>

                    {activeDeviceId && (
                        <Webcam
                            className='vid'
                            key={activeDeviceId}
                            audio={false}
                            mirrored={mirror}
                            ref={webcamRef}
                            videoConstraints={videoConstraints}
                            forceScreenshotSourceSize={true}
                        />
                    )}
                </div>
            );
    }

    else if (dis === 1) {

        if (videoPlaying) {
            const winnerForVideo: 'red' | 'blue' | 'tie' = (frozenMatchInfo?.blue?.points ?? 0) == (frozenMatchInfo?.red?.points ?? 0) ? 'tie' : ((frozenMatchInfo?.blue?.points ?? 0) > (frozenMatchInfo?.red?.points ?? 0) ? 'blue' : 'red');
            const resultVideoSrc = winnerForVideo === 'tie' ? tieVideoSrc : (winnerForVideo === 'red' ? redWinVideoSrc : blueWinVideoSrc);

            return (
                <video
                    src={resultVideoSrc}
                    autoPlay
                    onEnded={() => setVideoPlaying(false)}
                    style={{ width: '100vw', height: '100vh', objectFit: 'cover', background: '#000' }}
                />
            );
        }

        const redTotal = frozenMatchInfo?.red?.points ?? 0;
        const blueTotal = frozenMatchInfo?.blue?.points ?? 0;

        let winner: 'red' | 'blue' | 'tie' = 'tie';
        if (redTotal > blueTotal) winner = 'red';
        else if (blueTotal > redTotal) winner = 'blue';

        const redRP = frozenMatchInfo?.red?.rp ?? 0;
        const blueRP = frozenMatchInfo?.blue?.rp ?? 0;

        return (
            <div style={{ width: '100vw', height: '100vh', background: 'radial-gradient(circle at center, #1a1a1a 0%, #000 100%)', display: 'flex', flexDirection: 'column', padding: '0', boxSizing: 'border-box', overflow: 'hidden' }}>
                <div style={{ width: '100vw', background: '#222', borderBottom: '6px solid #ffde00', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px 0 10px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                    <h1 style={{ margin: '0', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '6px', fontWeight: '900', color: '#ffde00', textShadow: '2px 2px 0px #000' }}>MINI FRC - REBUILT</h1>
                    <h1 style={{ margin: '5px 0 0 0', fontSize: '28px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '900', color: '#fff' }}>
                        {frozenMatchInfo?.matchType ?? 'qualifications'} {frozenMatchInfo?.matchNum ?? -1} - RESULTS
                    </h1>
                </div>

                <div style={{ display: 'flex', width: '100vw', flex: '1', alignItems: 'stretch', justifyContent: 'center', padding: '20px 40px', gap: '20px', boxSizing: 'border-box' }}>
                    <div style={{ flex: '1', background: '#c22', border: winner === 'red' ? '8px solid #ffde00' : '4px solid #722', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '30px', boxShadow: winner === 'red' ? '0 0 40px rgba(255,222,0,0.4)' : '0 10px 20px rgba(0,0,0,0.5)', transform: winner === 'red' ? 'scale(1.02)' : 'scale(1)', transition: 'transform 0.3s' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', background: '#722', padding: '15px', borderRadius: '16px', border: '4px solid #000' }}>
                                {[0, 1, 2].map(i => (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '900', color: '#fff', textShadow: '3px 3px 0px #000' }}>{frozenMatchInfo?.red?.alliance[i] ?? -1}</div>
                                        {teamLabel(info?.redTeamNames, i) && (
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#ffb3b3', textTransform: 'uppercase' }}>{teamLabel(info?.redTeamNames, i)}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 'auto 0' }}>
                            <div style={{ fontSize: '14vw', fontWeight: '950', color: '#fff', lineHeight: '1', textShadow: '8px 8px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000' }}>{redTotal}</div>
                        </div>
                        <div style={{ background: '#ffde00', border: '5px solid #000', borderRadius: '16px', padding: '15px', textAlign: 'center', boxShadow: '0 6px 0px #000' }}>
                            <span style={{ fontSize: '28px', fontWeight: '900', color: '#000', textTransform: 'uppercase' }}>+{redRP} RANKING POINTS</span>
                        </div>
                    </div>

                    <div style={{ width: '38vw', background: '#222', border: '5px solid #444', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', background: '#000', borderBottom: '4px solid #444', fontSize: '16px', fontWeight: '900', letterSpacing: '2px' }}>
                            <span style={{ color: '#ff453a' }}>RED</span>
                            <span style={{ color: '#ffde00' }}>MATCH BREAKDOWN</span>
                            <span style={{ color: '#0a84ff' }}>BLUE</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', flex: '1', justifyContent: 'center' }}>
                            {[
                                { label: 'Auto Fuel Scored', r: frozenMatchInfo?.red?.autoFuelScored, b: frozenMatchInfo?.blue?.autoFuelScored },
                                { label: 'Teleop Fuel Scored', r: frozenMatchInfo?.red?.fuelScored, b: frozenMatchInfo?.blue?.fuelScored },
                                { label: 'Auto Climbs', r: frozenMatchInfo?.red?.autoClimbs, b: frozenMatchInfo?.blue?.autoClimbs },
                                { label: 'Endgame Climbs', r: `L1: ${frozenMatchInfo?.red?.endClimbsL1 ?? 0} / L2: ${frozenMatchInfo?.red?.endClimbsL2 ?? 0}`, b: `L1: ${frozenMatchInfo?.blue?.endClimbsL1 ?? 0} / L2: ${frozenMatchInfo?.blue?.endClimbsL2 ?? 0}` },
                                { label: 'Endgame Parks', r: frozenMatchInfo?.red?.endPark, b: frozenMatchInfo?.blue?.endPark },
                                { label: 'Climb Points', r: `${(frozenMatchInfo?.red?.endClimbsL1 ?? 0) * 10 + (frozenMatchInfo?.red?.endClimbsL2 ?? 0) * 30 + (frozenMatchInfo?.red?.autoClimbs ?? 0) * 15 + (frozenMatchInfo?.red?.endPark ?? 0) * 5}`, b: `${(frozenMatchInfo?.blue?.endClimbsL1 ?? 0) * 10 + (frozenMatchInfo?.blue?.endClimbsL2 ?? 0) * 30 + (frozenMatchInfo?.blue?.autoClimbs ?? 0) * 15 + (frozenMatchInfo?.blue?.endPark ?? 0) * 5}`},
                                { label: 'Foul Points', r: `${(frozenMatchInfo?.blue?.fouls ?? 0) * 5 + (frozenMatchInfo?.blue?.tFouls ?? 0) * 15}`, b: `${(frozenMatchInfo?.red?.fouls ?? 0) * 5 + (frozenMatchInfo?.red?.tFouls ?? 0) * 15}` }
                            ].map((row, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 25px', flex: '1', borderBottom: i === 5 ? 'none' : '2px solid #333', background: i % 2 === 0 ? '#1a1a1a' : '#222' }}>
                                    <span style={{ width: '25%', textAlign: 'left', fontWeight: '900', fontSize: '20px', color: '#ff453a', textShadow: '1px 1px 0px #000' }}>{row.r}</span>
                                    <span style={{ width: '50%', textAlign: 'center', color: '#fff', fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>{row.label}</span>
                                    <span style={{ width: '25%', textAlign: 'right', fontWeight: '900', fontSize: '20px', color: '#0a84ff', textShadow: '1px 1px 0px #000' }}>{row.b}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ flex: '1', background: '#22c', border: winner === 'blue' ? '8px solid #ffde00' : '4px solid #227', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '30px', boxShadow: winner === 'blue' ? '0 0 40px rgba(255,222,0,0.4)' : '0 10px 20px rgba(0,0,0,0.5)', transform: winner === 'blue' ? 'scale(1.02)' : 'scale(1)', transition: 'transform 0.3s' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', background: '#227', padding: '15px', borderRadius: '16px', border: '4px solid #000' }}>
                                {[0, 1, 2].map(i => (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ fontSize: '32px', fontWeight: '900', color: '#fff', textShadow: '3px 3px 0px #000' }}>{frozenMatchInfo?.blue?.alliance[i] ?? -1}</div>
                                        {teamLabel(info?.blueTeamNames, i) && (
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#b3d4ff', textTransform: 'uppercase' }}>{teamLabel(info?.blueTeamNames, i)}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: 'auto 0' }}>
                            <div style={{ fontSize: '14vw', fontWeight: '950', color: '#fff', lineHeight: '1', textShadow: '8px 8px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000' }}>{blueTotal}</div>
                        </div>
                        <div style={{ background: '#ffde00', border: '5px solid #000', borderRadius: '16px', padding: '15px', textAlign: 'center', boxShadow: '0 6px 0px #000' }}>
                            <span style={{ fontSize: '28px', fontWeight: '900', color: '#000', textTransform: 'uppercase' }}>+{blueRP} RANKING POINTS</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    else if (dis === 2) {

    const duplicatedRankings = [...rankings, ...rankings];

    return (
        <div style={{ width: '100vw', height: '100vh', background: 'radial-gradient(circle at center, #222 0%, #050505 100%)', display: 'flex', flexDirection: 'column', padding: '0', boxSizing: 'border-box', overflow: 'hidden' }}>
            <div style={{ width: '100vw', background: '#111', borderBottom: '6px solid #ffde00', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px 10px 40px', boxShadow: '0 8px 24px rgba(0,0,0,0.7)', boxSizing: 'border-box' }}>
                <div style={{ width: '150px' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h1 style={{ margin: '0', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '6px', fontWeight: '900', color: '#ffde00', textShadow: '2px 2px 0px #000' }}>MINI FRC - REBUILT</h1>
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
                        <span style={{ width: '20%', textAlign: 'right' }}>RECORD (W-L-M)</span>
                    </div>

                    <div className="no-scrollbar" style={{ flex: '1', overflow: 'hidden', position: 'relative' }}>
                        {rankings.length === 0 ? (
                            <p style={{ color: '#888', textAlign: 'center', marginTop: '20px' }}>No ranking data yet — approve a match to populate standings.</p>
                        ) : (
                            
                            <div 
                                className="marquee-vertical" 
                                style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '6px',
                                    animationDuration: `${rankings.length * 2.5}s`
                                }}
                            >
                                {duplicatedRankings.map((team, idx) => {
                                    const isCurrentMatchTeam = matchInfo && (
                                        matchInfo.red.alliance.includes(team.teamNumber) ||
                                        matchInfo.blue.alliance.includes(team.teamNumber)
                                    );

                                    return (
                                        <div
                                            key={`${team.teamNumber}-${idx}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                background: isCurrentMatchTeam ? '#443c00' : idx % 2 === 0 ? '#1e1e1e' : '#151515',
                                                border: isCurrentMatchTeam ? '3px solid #ffde00' : '3px solid #333',
                                                borderRadius: '10px',
                                                padding: '10px 20px',
                                                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                                                height: '50px',
                                                boxSizing: 'border-box'
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
                                                {team.record.split('-')[0] + '-' + team.record.split('-')[1] + '-' + team.record.split('-').map(Number).reduce((sum, val) => sum + val, 0)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ flex: '1', background: '#111', border: '4px solid #444', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '15px' }}>
                    <h2 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '950', color: '#ffde00', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center', borderBottom: '3px solid #ffde00', paddingBottom: '5px' }}>
                        MATCH LOG (FILE DATA)
                    </h2>
                    <div className="no-scrollbar" style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
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

    return null;
}

export default App;