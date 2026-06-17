import './App.css'
import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";

type matchDisplay = {
    number: number,
    redName: string,
    redTeams: number[],
    blueName: string,
    blueTeams: number[],
    type: 'qualification' | 'playoff' | 'finals',
    display: 'match' | 'ranks' | 'results',
    match: {
        time: number,
        phase: 'auto' | 'tele',
        period: number,
        autoWin: 'red' | 'blue',
        red: { score: number, fuel: number },
        blue: { score: number, fuel: number }
    }
}

function App() {
    const [info, setInfo] = useState<matchDisplay>();
    const [camId, setCamId] = useState<string>("");
    const [mirror, setMirror] = useState<boolean>(false);
    const [colorMirror, setColorMirror] = useState<boolean>(false);
    const [fallbackId, setFallbackId] = useState<string>("");
    const [totalMatches, setTotalMatches] = useState<number>();

    const webcamRef = useRef<Webcam | null>(null);

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

    useEffect(() => {
        const Cam = window.myAPI.onCameraUpdate((incomingId: string) => { setCamId(incomingId); });
        const Mirror = window.myAPI.onMirrorToggle((mirrorState: boolean) => { setMirror(mirrorState); });
        const Color = window.myAPI.onColorMirrorToggle((colorState: boolean) => { setColorMirror(colorState); });

        return () => { Cam(); Mirror(); Color(); };
    }, []);

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
        if ((info?.match?.autoWin ?? 'red') === 'red') {
            return num === 3 || num === 5;
        } else {
            return num === 2 || num === 4;
        }
    }

    const periodBlue = (num: number) => {
        if (num === 1 || num === 6) return true;
        if ((info?.match?.autoWin ?? 'red') === 'red') {
            return num === 2 || num === 4;
        } else {
            return num === 3 || num === 5;
        }
    }

    useEffect(() => {
        const getTotalMatches = async () => {
            const schedule = await window.myAPI.getMatchSchedule();
            setTotalMatches(schedule[schedule.length - 1].number);
        }
        getTotalMatches();
    }, []);

    if(colorMirror)
    return (
        <div>
            <div className='top-bar'>
                <div className='fuel-container'>
                    <h1 className='blue-fuel'><img className='blue-balls' src='../../../images/blue-balls.png'></img>{info?.match?.blue?.fuel ?? -1} / {(info?.match?.blue?.fuel ?? -1) < 50 ? 50 : 100}</h1>
                    {periodBlue(info?.match?.period ?? 1) && (
                        <img className='blue-active' src={'../../../images/period-arrow.png'} style={{ transform: 'scaleX(-1)' }} alt="Active Arrow" />
                    )}
                </div>

                <div className='center-dis'>
                    <h1 className='logo'>Rebuilt</h1>
                    <h1 className='match-des'>
                        {info?.type ?? 'qualification'} {info?.number ?? -1}
                        {(info?.type ?? 'qualification') === 'qualification' ? ' of ' + (totalMatches ?? -1) : ''}
                    </h1>

                    <div className='scoreboard-row'>
                        <div className='blue-info'>
                            <div className='blue-score-box'>
                                <h1 className='blue-score'>{info?.match?.blue?.score ?? -1}</h1>
                            </div>
                            <div className='blue'>
                            {((info?.type ?? 'playoff') !== 'qualification') && (
                                <h1 className='blue-name'>{info?.blueName ?? "None"}</h1>
                            )}
                            <div className='blue-teams-box'>
                                <h1 className='blue-teams'>{info?.blueTeams[0] ?? -1}</h1>
                                <h1 className='blue-teams'>{info?.blueTeams[1] ?? -1}</h1>
                                <h1 className='blue-teams'>{info?.blueTeams[2] ?? -1}</h1>
                            </div>
                            </div>
                        </div>

                        <div className='center-info'>
                            <h1 className='time'>{cnvtTime(info?.match?.time ?? -1)}</h1>
                            {(info?.match?.phase ?? 'tele') === 'tele' && (
                                <div className='period-info'>
                                    <h1 className='period'>{info?.match?.period ?? -1}/6</h1>
                                    <h1 className='period-time'>:{cnvtPeriodTime(info?.match?.time ?? -1)}</h1>
                                </div>
                            )}
                        </div>
                        <div className='red-info'>
                            <div className='red-score-box'>
                                <h1 className='red-score'>{info?.match?.red?.score ?? -1}</h1>
                            </div>
                            <div className='red'>
                            {((info?.type ?? 'playoff') !== 'qualification') && (
                                <h1 className='red-name'>{info?.redName ?? "None"}</h1>
                            )}
                            <div className='red-teams-box'>
                                <h1 className='red-teams'>{info?.redTeams[0] ?? -1}</h1>
                                <h1 className='red-teams'>{info?.redTeams[1] ?? -1}</h1>
                                <h1 className='red-teams'>{info?.redTeams[2] ?? -1}</h1>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='fuel-container'>
                    {periodRed(info?.match?.period ?? 1) && (
                        <img className='red-active' src={'../../../images/period-arrow.png'} alt="Active Arrow" />
                    )}
                    <h1 className='red-fuel'><img className='red-balls' src='../../../images/red-balls.png'></img>{info?.match?.red?.fuel ?? -1} / {(info?.match?.red?.fuel ?? -1) < 50 ? 50 : 100}</h1>
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
                    <h1 className='red-fuel'><img className='red-balls' src='../../../images/red-balls.png'></img>{info?.match?.red?.fuel ?? -1} / {(info?.match?.red?.fuel ?? -1) < 50 ? 50 : 100}</h1>
                    {periodRed(info?.match?.period ?? 1) && (
                        <img className='red-active' src={'../../../images/period-arrow.png'} style={{ transform: 'scaleX(-1)' }} alt="Active Arrow" />
                    )}
                </div>

                <div className='center-dis'>
                    <h1 className='logo'>Rebuilt</h1>
                    <h1 className='match-des'>
                        {info?.type ?? 'qualification'} {info?.number ?? -1}
                        {(info?.type ?? 'qualification') === 'qualification' ? ' of ' + (totalMatches ?? -1) : ''}
                    </h1>

                    <div className='scoreboard-row'>
                        <div className='red-info'>
                            <div className='red'>
                            {((info?.type ?? 'playoff') !== 'qualification') && (
                                <h1 className='red-name'>{info?.redName ?? "None"}</h1>
                            )}
                            <div className='red-teams-box'>
                                <h1 className='red-teams'>{info?.redTeams[0] ?? -1}</h1>
                                <h1 className='red-teams'>{info?.redTeams[1] ?? -1}</h1>
                                <h1 className='red-teams'>{info?.redTeams[2] ?? -1}</h1>
                            </div>
                            </div>
                            <div className='red-score-box'>
                                <h1 className='red-score'>{info?.match?.red?.score ?? -1}</h1>
                            </div>
                        </div>

                        <div className='center-info'>
                            <h1 className='time'>{cnvtTime(info?.match?.time ?? -1)}</h1>
                            {(info?.match?.phase ?? 'tele') === 'tele' && (
                                <div className='period-info'>
                                    <h1 className='period'>{info?.match?.period ?? -1}/6</h1>
                                    <h1 className='period-time'>:{cnvtPeriodTime(info?.match?.time ?? -1)}</h1>
                                </div>
                            )}
                        </div>
                        <div className='blue-info'>
                            <div className='blue'>
                            {((info?.type ?? 'playoff') !== 'qualification') && (
                                <h1 className='blue-name'>{info?.blueName ?? "None"}</h1>
                            )}
                            <div className='blue-teams-box'>
                                <h1 className='blue-teams'>{info?.blueTeams[0] ?? -1}</h1>
                                <h1 className='blue-teams'>{info?.blueTeams[1] ?? -1}</h1>
                                <h1 className='blue-teams'>{info?.blueTeams[2] ?? -1}</h1>
                            </div>
                            </div>
                            <div className='blue-score-box'>
                                <h1 className='blue-score'>{info?.match?.blue?.score ?? -1}</h1>
                            </div>
                        </div>
                    </div>
                </div>

                <div className='fuel-container'>
                    {periodBlue(info?.match?.period ?? 1) && (
                        <img className='blue-active' src={'../../../images/period-arrow.png'} alt="Active Arrow" />
                    )}
                    <h1 className='blue-fuel'><img className='blue-balls' src='../../../images/blue-balls.png'></img>{info?.match?.blue?.fuel ?? -1} / {(info?.match?.blue?.fuel ?? -1) < 50 ? 50 : 100}</h1>
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

export default App;