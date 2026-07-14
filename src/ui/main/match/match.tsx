import { useState, useEffect, useCallback, useRef } from "react";
import './match.css';
import { storageBox } from "../../globalStorage";

type DoubleElim = {
  match1 : ElimMatch, match2 : ElimMatch, match3 : ElimMatch, match4 : ElimMatch,
  match5 : ElimMatch, match6 : ElimMatch, match7 : ElimMatch, match8 : ElimMatch,
  match9 : ElimMatch, match10 : ElimMatch, match11 : ElimMatch, match12 : ElimMatch,
  match13 : ElimMatch, finalTeams : ElimMatch,
}

type ElimMatch = {
  red: number,
  blue: number,
  win: 'red' | 'blue' | 'none'
}

type OpenedScreen = {
  id: number;
  name: string;
};

type matchDisplay = {
  redName: string;
  redTeams: number[];
  redTeamNames: string[];
  blueName: string;
  blueTeamNames: string[];
  blueTeams: number[];
};

type MatchFinal = {
  number: number;
  redAllianceNum: number[];
  redAlliance: string[];
  blueAllianceNum: number[];
  blueAlliance: string[];
};

type alliancePerformance = {
  alliance: number[];
  points: number;
  fuelScored: number;
  endClimbsL1: number;
  endClimbsL2: number;
  endPark: number;
  autoClimbs: number;
  autoFuelScored: number;
  fouls: number;
  tFouls: number;
  endPoints: number;
  rp: number;
};

type MatchInfoType = {
  matchNum: number;
  matchType: 'qualifications' | 'playoffs' | 'finals';
  matchTime: number;
  autoWin: 'red' | 'blue' | 'none';
  period: number;
  red: alliancePerformance;
  blue: alliancePerformance;
};

interface WebSerialPort {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  getInfo: () => { usbVendorId?: number; usbProductId?: number; portName?: string; friendlyName?: string; path?: string };
  readable: {
    getReader: () => ReadableStreamDefaultReader<Uint8Array>;
  };
  writable: {
    getWriter: () => {
      write: (data: Uint8Array) => Promise<void>;
      releaseLock: () => void;
    };
  };
}

type NavigatorWithSerial = Navigator & {
  serial: {
    getPorts: () => Promise<WebSerialPort[]>;
  };
};

type alliance = {
  teams: number[];
};

type ScoreMetric = {
    label: string;
    getValue: (a: alliancePerformance) => number;
    update: (amount: number, alliance: 'red' | 'blue') => void;
};

const SCORE_METRICS: ScoreMetric[] = [
    {
        label: "Auto Climbs",
        getValue: a => a.autoClimbs,
        update: (amt, side) => window.myAPI.autoClimbs(amt, side)
    },
    {
        label: "L1 Climbs",
        getValue: a => a.endClimbsL1,
        update: (amt, side) => window.myAPI.l1Climbs(amt, side)
    },
    {
        label: "L2 Climbs",
        getValue: a => a.endClimbsL2,
        update: (amt, side) => window.myAPI.l2Climbs(amt, side)
    },
    {
        label: "Parks",
        getValue: a => a.endPark,
        update: (amt, side) => window.myAPI.parks(amt, side)
    },
    {
        label: "Fouls",
        getValue: a => a.fouls,
        update: (amt, side) => window.myAPI.fouls(amt, side)
    },
    {
        label: "Tech Fouls",
        getValue: a => a.tFouls,
        update: (amt, side) => window.myAPI.tFouls(amt, side)
    }
];

class PlayoffsRunner {
  public brac : DoubleElim = {
    match1 : { red: 1, blue: 8, win: 'none' },
    match2 : { red: 4, blue: 5, win: 'none' },
    match3 : { red: 2, blue: 7, win: 'none' },
    match4 : { red: 3, blue: 6, win: 'none' },
    match5 : { red: -1, blue: -1, win: 'none' },
    match6 : { red: -1, blue: -1, win: 'none' },
    match7 : { red: -1, blue: -1, win: 'none' },
    match8 : { red: -1, blue: -1, win: 'none' },
    match9 : { red: -1, blue: -1, win: 'none' },
    match10 : { red: -1, blue: -1, win: 'none' },
    match11 : { red: -1, blue: -1, win: 'none' },
    match12 : { red: -1, blue: -1, win: 'none' },
    match13 : { red: -1, blue: -1, win: 'none' },
    finalTeams : { red: -1, blue: -1, win: 'none' }
  }

  private curMatch = 1;

  getCurMatch(){
    return this.curMatch;
  }

  getMatchup(matchNum: number): ElimMatch | undefined {
    return (this.brac as unknown as Record<string, ElimMatch>)['match' + matchNum];
  }

  matchPlayed(winner : 'red' | 'blue') {
    if(this.curMatch > 13) return;

    if(this.curMatch === 1){
      this.brac.match1.win = winner;
      if(winner === 'red'){ this.brac.match7.red = this.brac.match1.red; this.brac.match5.red = this.brac.match1.blue; }
      else { this.brac.match7.red = this.brac.match1.blue; this.brac.match5.red = this.brac.match1.red; }
    } else if(this.curMatch === 2){
      this.brac.match2.win = winner;
      if(winner === 'red'){ this.brac.match7.blue = this.brac.match2.red; this.brac.match5.blue = this.brac.match2.blue; }
      else { this.brac.match7.blue = this.brac.match2.blue; this.brac.match5.blue = this.brac.match2.red; }
    } else if(this.curMatch === 3){
      this.brac.match3.win = winner;
      if(winner === 'red'){ this.brac.match8.red = this.brac.match3.red; this.brac.match6.red = this.brac.match3.blue; }
      else { this.brac.match8.red = this.brac.match3.blue; this.brac.match6.red = this.brac.match3.red; }
    } else if(this.curMatch === 4){
      this.brac.match4.win = winner;
      if(winner === 'red'){ this.brac.match8.blue = this.brac.match4.red; this.brac.match6.blue = this.brac.match4.blue; }
      else { this.brac.match8.blue = this.brac.match4.blue; this.brac.match6.blue = this.brac.match4.red; }
    } else if(this.curMatch === 5){
      this.brac.match5.win = winner;
      this.brac.match9.red = winner === 'red' ? this.brac.match5.red : this.brac.match5.blue;
    } else if(this.curMatch === 6){
      this.brac.match6.win = winner;
      this.brac.match10.red = winner === 'red' ? this.brac.match6.red : this.brac.match6.blue;
    } else if(this.curMatch === 7){
      this.brac.match7.win = winner;
      if(winner === 'red'){ this.brac.match11.red = this.brac.match7.red; this.brac.match9.blue = this.brac.match7.blue; }
      else { this.brac.match11.red = this.brac.match7.blue; this.brac.match9.blue = this.brac.match7.red; }
    } else if(this.curMatch === 8){
      this.brac.match8.win = winner;
      if(winner === 'red'){ this.brac.match11.blue = this.brac.match8.red; this.brac.match10.blue = this.brac.match8.blue; }
      else { this.brac.match11.blue = this.brac.match8.blue; this.brac.match10.blue = this.brac.match8.red; }
    } else if(this.curMatch === 9){
      this.brac.match9.win = winner;
      this.brac.match12.red = winner === 'red' ? this.brac.match9.red : this.brac.match9.blue;
    } else if(this.curMatch === 10){
      this.brac.match10.win = winner;
      this.brac.match12.blue = winner === 'red' ? this.brac.match10.red : this.brac.match10.blue;
    } else if(this.curMatch === 11){
      this.brac.match11.win = winner;
      if(winner === 'red'){ this.brac.finalTeams.red = this.brac.match11.red; this.brac.match13.blue = this.brac.match11.blue; }
      else { this.brac.finalTeams.red = this.brac.match11.blue; this.brac.match13.blue = this.brac.match11.red; }
    } else if(this.curMatch === 12){
      this.brac.match12.win = winner;
      this.brac.match13.red = winner === 'red' ? this.brac.match12.red : this.brac.match12.blue;
    } else if(this.curMatch === 13){
      this.brac.match13.win = winner;
      this.brac.finalTeams.blue = winner === 'red' ? this.brac.match13.red : this.brac.match13.blue;
    }

    this.curMatch++;
  }
}

function Match() {
  
  class GlobalStorageBox {
  private data = new Map<string, any>();
  set(name: string, value: any) { this.data.set(name, value); }
  get(name: string): any { return this.data.get(name); }
  has(name: string): boolean { return this.data.has(name); }
  remove(name: string) { this.data.delete(name); }
}

const sounds = {
  matchStart: new Audio('../../../../../images/start.wav'),
  periodChange: new Audio('../../../../../images/shift.wav'),
  teleStart: new Audio('../../../../../images/resume.wav'),
  matchEnd: new Audio('../../../../../images/end.wav'),
  warning: new Audio('../../../../../images/warning.wav'),
};

const playSound = (sound: HTMLAudioElement) => {
  sound.currentTime = 0;
  sound.play().catch(err => {
    console.log("Sound blocked:", err);
  });
};


  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [openedScreens, setOpenedScreens] = useState<OpenedScreen[]>([]);

  const [systemPorts, setSystemPorts] = useState<WebSerialPort[]>([]);
  const [chosenPortIndex, setChosenPortIndex] = useState<string>('');
  const [chosenPortIndex2, setChosenPortIndex2] = useState<string>('');
  const [isSerialConnected, setIsSerialConnected] = useState<boolean>(false);
  const [isSerialConnected2, setIsSerialConnected2] = useState<boolean>(false);

  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [teamNames, setTeamNames] = useState<MatchFinal[]>([]);

  const [selectedMatch, setSelectedMatch] = useState(1);
  const [selectedTeams, setSelectedTeams] = useState<alliance[]>([{ teams: [-1, -1, -1] }, { teams: [-1, -1, -1] }]);
  const [matchType, setMatchType] = useState<'qualifications' | 'playoffs' | 'finals'>('qualifications');

  const [matchInfo, setMatchInfo] = useState<MatchInfoType>();
  const [info, setInfo] = useState<matchDisplay>();

  const [displayOpen, setDisplayOpen] = useState(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const [approveStatus, setApproveStatus] = useState<string>('');

  const playoffsRunnerRef = useRef(new PlayoffsRunner());

  const [alliances, setAlliances] = useState<alliance[]>([
    { teams: [-1, -1, -1] }, { teams: [-1, -1, -1] },
    { teams: [-1, -1, -1] }, { teams: [-1, -1, -1] },
    { teams: [-1, -1, -1] }, { teams: [-1, -1, -1] },
    { teams: [-1, -1, -1] }, { teams: [-1, -1, -1] }
  ]);

  useEffect(() => {
    if (storageBox.has('redPort')) setIsSerialConnected(true);
    if (storageBox.has('bluePort')) setIsSerialConnected2(true);

    const autoSelectActivePorts = async () => {
      try {
        const nav = navigator as NavigatorWithSerial;
        if (nav.serial) {
          const ports = await nav.serial.getPorts();
          setSystemPorts(ports);

          const activeRedPort = storageBox.get('redPort');
          if (activeRedPort) {
            const redIndex = ports.findIndex(p => p === activeRedPort);
            if (redIndex !== -1) setChosenPortIndex(redIndex.toString());
          }

          const activeBluePort = storageBox.get('bluePort');
          if (activeBluePort) {
            const blueIndex = ports.findIndex(p => p === activeBluePort);
            if (blueIndex !== -1) setChosenPortIndex2(blueIndex.toString());
          }
        }
      } catch (err) {
        console.error("Failed to read ports or auto-select active hardware info on mount", err);
      }
    };

    autoSelectActivePorts();
  }, []);

  const lastPeriod = useRef<number>(1);
  const lastTime = useRef<number>(-1);

  const cnvtPeriodTime = (num: number) => {
        if (num >= 130) return num - 130;
        if (num >= 105) return num - 105;
        if (num >= 80) return num - 80;
        if (num >= 55) return num - 55;
        if (num >= 30) return num - 30;
        return num;
    }

    const lastRedColor = useRef<'pulse-red' | 'red' | 'off' | 'purple'>('off');
    const lastBlueColor = useRef<'pulse-blue' | 'blue' | 'off' | 'purple'>('off');

useEffect(() => {
  if (!matchInfo) return;

  if (matchInfo.matchTime === 139 && lastTime.current != matchInfo.matchTime) {
    playSound(sounds.teleStart);
    lastTime.current = 139;
  }

  if(matchInfo.matchTime === 0){
    if(lastRedColor.current != 'purple'){
        sendDataToHardware('red', 'CMD:LED:PURPLE')
        lastRedColor.current = 'purple'
      }
    if(lastBlueColor.current != 'purple'){
        sendDataToHardware('blue', 'CMD:LED:PURPLE')
        lastBlueColor.current = 'purple'
      }
  }
  else{
  if(periodRed(matchInfo?.period)){
      if(cnvtPeriodTime(matchInfo?.matchTime) <= 5){
        if(lastRedColor.current != 'pulse-red'){
        sendDataToHardware('red', 'CMD:LED:PULSE_RED')
        lastRedColor.current = 'pulse-red'
        }
      } else {
        if(lastRedColor.current != 'red'){
        sendDataToHardware('red', 'CMD:LED:RED')
        lastRedColor.current = 'red'
        }
      }
  } else {
    if(lastRedColor.current != 'off'){
    sendDataToHardware('red', 'CMD:LED:OFF')
    lastRedColor.current = 'off'
    }
  }

  if(periodBlue(matchInfo?.period)){
      if(cnvtPeriodTime(matchInfo?.matchTime) <= 5){
        if(lastBlueColor.current != 'pulse-blue'){
        sendDataToHardware('blue', 'CMD:LED:PULSE_BLUE')
        lastBlueColor.current = 'pulse-blue'
        }
      } else {
        if(lastBlueColor.current != 'blue'){
        sendDataToHardware('blue', 'CMD:LED:BLUE')
        lastBlueColor.current = 'blue'
        }
      }
  } else {
    if(lastBlueColor.current != 'off'){
    sendDataToHardware('blue', 'CMD:LED:OFF')
    lastBlueColor.current = 'off'
    }
    
  }
}

  if (matchInfo.period != lastPeriod.current) {
    if(matchInfo.matchTime <= 130)
      playSound(sounds.periodChange);
    lastPeriod.current = matchInfo.period;
  }

  if (matchInfo.matchTime === 20 && lastTime.current != matchInfo.matchTime) {
    playSound(sounds.warning);
    lastTime.current = 20;
  }

  if (matchInfo.matchTime === 0 && lastTime.current != matchInfo.matchTime) {
    playSound(sounds.matchEnd);
    lastTime.current = 0;
  }

}, [matchInfo?.period, matchInfo?.matchTime]);

  const handleChange = (allianceIndex: number, teamPosition: number, value: string) => {
    const cleanValue = value.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    const numericValue = cleanValue === '' ? -1 : Number(cleanValue);

    setAlliances(prevAlliances => {
      return prevAlliances.map((alliance, idx) => {
        if (idx !== allianceIndex) return alliance;
        const newTeams = [...alliance.teams];
        newTeams[teamPosition] = numericValue;
        return { ...alliance, teams: newTeams };
      });
    });
  };

  const handleChange2 = (allianceIndex: number, teamPosition: number, value: string) => {
    const cleanValue = value.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    const numericValue = cleanValue === '' ? -1 : Number(cleanValue);

    setSelectedTeams(prevAlliances => {
      return prevAlliances.map((alliance, idx) => {
        if (idx !== allianceIndex) return alliance;
        const newTeams = [...alliance.teams];
        newTeams[teamPosition] = numericValue;
        return { ...alliance, teams: newTeams };
      });
    });
  };

  const getSchedule = async () => {
    try {
      const tempMatches = await window.myAPI.getMatchSchedule();
      if (!tempMatches) return;

      const tempTeamMatches: MatchFinal[] = [];
      for (let i = 0; i < tempMatches.length; i++) {
        const tempTeamName: MatchFinal = {
          number: tempMatches[i].number,
          redAllianceNum: [tempMatches[i].redAlliance[0], tempMatches[i].redAlliance[1], tempMatches[i].redAlliance[2]],
          redAlliance: [await getTeamName(tempMatches[i].redAlliance[0]), await getTeamName(tempMatches[i].redAlliance[1]), await getTeamName(tempMatches[i].redAlliance[2])],
          blueAllianceNum: [tempMatches[i].blueAlliance[0], tempMatches[i].blueAlliance[1], tempMatches[i].blueAlliance[2]],
          blueAlliance: [await getTeamName(tempMatches[i].blueAlliance[0]), await getTeamName(tempMatches[i].blueAlliance[1]), await getTeamName(tempMatches[i].blueAlliance[2])],
        };
        tempTeamMatches.push(tempTeamName);
      }

      setTeamNames(tempTeamMatches);
      setTotalMatches(tempTeamMatches.length);
    } catch (err) {
      console.error("Failed to load match schedules", err);
    }
  };

  const periodRed = (num: number) => {
      if (matchInfo?.autoWin === 'none') return true;
      if (num === 1 || num === 6) return true;
      return matchInfo?.autoWin === 'red' ? (num === 3 || num === 5) : (num === 2 || num === 4);
  }

  const periodBlue = (num: number) => {
      if (matchInfo?.autoWin === 'none') return true;
      if (num === 1 || num === 6) return true;
      return matchInfo?.autoWin === 'red' ? (num === 2 || num === 4) : (num === 3 || num === 5);
  }

  const getTeamName = async (team: number) => {
    return await window.myAPI.getTeamName(team);
  };

  useEffect(() => {
    const mI = window.myAPI.onMatchInfo((data: MatchInfoType) => {
      
      setMatchInfo(data);
      const matchNum = data.matchNum;

      if (teamNames.length > 0 && teamNames[matchNum - 1]) {
        setInfo({
          redName: 'Red Alliance',
          redTeams: teamNames[matchNum - 1].redAllianceNum,
          redTeamNames: teamNames[matchNum - 1].redAlliance,
          blueName: 'Blue Alliance',
          blueTeamNames: teamNames[matchNum - 1].blueAlliance,
          blueTeams: teamNames[matchNum - 1].blueAllianceNum,
        });
      } else {
        setInfo({
          redName: 'Red Alliance', redTeams: data.red.alliance, redTeamNames: [],
          blueName: 'Blue Alliance', blueTeams: data.blue.alliance, blueTeamNames: [],
        });
      }
    });

    return () => mI();
  }, [teamNames]);

  useEffect(() => {
    getSchedule();
  }, []);

  useEffect(() => {
    if (matchType !== 'playoffs') return;
    const curNum = playoffsRunnerRef.current.getCurMatch();
    setSelectedMatch(curNum);
    fillTeamsFromBracket(curNum);

  }, [matchType]);

  const seedToTeams = (seed: number): number[] => {
    if (seed < 1) return [-1, -1, -1];
    return alliances[seed - 1]?.teams ?? [-1, -1, -1];
  };

  const fillTeamsFromBracket = (matchNum: number) => {
    const matchup = playoffsRunnerRef.current.getMatchup(matchNum);
    if (!matchup) return;
    setSelectedTeams([{ teams: seedToTeams(matchup.red) }, { teams: seedToTeams(matchup.blue) }]);
  };

  const scanHardwarePorts = async () => {
    try {
      const nav = navigator as NavigatorWithSerial;
      if (nav.serial) {
        const ports = await nav.serial.getPorts();
        setSystemPorts(ports);
      }
    } catch (err) {
      console.error("Failed to read ports", err);
    }
  };

  const handleConnectHardware = async () => {
    if (chosenPortIndex === "") return;
    try {
      const selectedPortIndexNum = parseInt(chosenPortIndex, 10);
      const targetPort = systemPorts[selectedPortIndexNum];

      storageBox.set('redPort', targetPort);
      await targetPort.open({ baudRate: 115200 });
      setIsSerialConnected(true);
      console.log(targetPort);
      console.log(storageBox.get('redPort'));
      console.log(storageBox);

      const decoder = new TextDecoder();
      const reader = targetPort.readable.getReader();
      storageBox.set('redReader', reader);

      const readLoop = async () => {
        let buffer = "";
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || "";

              lines.forEach(line => {
                if (line.trim() === 'EVT:BALL') {
                  window.myAPI.sendFuel('red');
                }
              });
            }
          }
        } catch (loopErr) {
          if (storageBox.has('redReader')) {
            console.error("Red stream encountered an unexpected read error:", loopErr);
          }
        }
      };

      storageBox.set('redLoop', readLoop());
    } catch (err) {
      console.error("Red hardware connection failure:", err);
      setIsSerialConnected(false);
    }
  };

  const handleDisconnectRed = async () => {
    const reader = storageBox.get('redReader');
    const loopPromise = storageBox.get('redLoop');
    const port = storageBox.get('redPort');

    try {
      if (reader) {
        await reader.cancel();
        if (loopPromise) await loopPromise;
        reader.releaseLock();
      }
      if (port) {
        await port.close();
        console.log("Red Hub successfully closed.");
      }
    } catch (err) {
      console.error("Error closing Red Hub port cleanly:", err);
    } finally {
      storageBox.remove('redReader');
      storageBox.remove('redLoop');
      storageBox.remove('redPort');
      setIsSerialConnected(false);
    }
  };

  const handleConnectHardware2 = async () => {
    if (chosenPortIndex2 === "") return;
    try {
      const selectedPortIndexNum = parseInt(chosenPortIndex2, 10);
      const targetPort = systemPorts[selectedPortIndexNum];

      storageBox.set('bluePort', targetPort);
      await targetPort.open({ baudRate: 115200 });
      setIsSerialConnected2(true);

      const decoder = new TextDecoder();
      const reader = targetPort.readable.getReader();
      storageBox.set('blueReader', reader);

      const readLoop = async () => {
        let buffer = "";
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || "";

              lines.forEach(line => {
                if (line.trim() === 'EVT:BALL') {
                  window.myAPI.sendFuel('blue');
                }
              });
            }
          }
        } catch (loopErr) {
          if (storageBox.has('blueReader')) {
            console.error("Blue stream encountered an unexpected read error:", loopErr);
          }
        }
      };

      storageBox.set('blueLoop', readLoop());
    } catch (err) {
      console.error("Blue hardware connection failure:", err);
      setIsSerialConnected2(false);
    }
  };

  const handleDisconnectBlue = async () => {
    const reader = storageBox.get('blueReader');
    const loopPromise = storageBox.get('blueLoop');
    const port = storageBox.get('bluePort');

    try {
      if (reader) {
        await reader.cancel();
        if (loopPromise) await loopPromise;
        reader.releaseLock();
      }
      if (port) {
        await port.close();
        console.log("Blue Hub successfully closed.");
      }
    } catch (err) {
      console.error("Error closing Blue Hub port cleanly:", err);
    } finally {
      storageBox.remove('blueReader');
      storageBox.remove('blueLoop');
      storageBox.remove('bluePort');
      setIsSerialConnected2(false);
    }
  };

  const sendDataToHardware = async (targetHub: 'red' | 'blue', message: string) => {
    const port = storageBox.get(`${targetHub}Port`);

    if (!port) {
      console.warn(`Cannot send data: ${targetHub} Hub is not connected.`);
      return;
    }

    try {
      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      const data = encoder.encode(message + '\n');

      await writer.write(data);
      writer.releaseLock();
      console.log(`Successfully sent to ${targetHub} hub: ${message}`);
    } catch (err) {
      console.error(`Failed to send data to ${targetHub} hub:`, err);
    }
  };

  const testRed = async () => {
    await sendDataToHardware('red', "CMD:LED:RED");
    await delay(500);
    await sendDataToHardware('red', "CMD:LED:OFF");
  };

  const testBlue = async () => {
    await sendDataToHardware('blue', "CMD:LED:BLUE");
    await delay(500);
    await sendDataToHardware('blue', "CMD:LED:OFF");
  };

  const delay = (ms: number): Promise<void> => new Promise(res => setTimeout(res, ms));

  const updateQualAlliance = async (matchNum: number) => {
    const sch = teamNames;
    let tempTeams: alliance[] = [{ teams: [-1, -1, -1] }, { teams: [-1, -1, -1] }];

    sch.forEach((match, index) => {
      if (index === matchNum - 1) {
        tempTeams = [{ teams: match.redAllianceNum }, { teams: match.blueAllianceNum }]
      }
    })
    setSelectedTeams(tempTeams);
  }

  const handleDevices = useCallback(
    (mediaDevices: MediaDeviceInfo[]) => {
      const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    },
    [selectedDeviceId]
  );

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => navigator.mediaDevices.enumerateDevices())
      .then(handleDevices)
      .catch(err => console.error("Error accessing media devices:", err));
  }, [handleDevices]);

  useEffect(() => {
    const close = window.myAPI.onInstanceClosed((deadId: number) => {
      setOpenedScreens(prev => prev.filter(screen => screen.id !== deadId));
    });
    return () => close();
  }, []);

  useEffect(() => {
    const syncActiveWindows = async () => {
      const liveScreens = await window.myAPI.getActiveScreens();
      setOpenedScreens(liveScreens);
    };
    syncActiveWindows();
  }, []);

  const spawnNewScreenWindow = async () => {
    const newScreenObject = await window.myAPI.loadScreenWindow();
    setOpenedScreens(prev => [...prev, newScreenObject]);
  };

  const pushCameraToWindow = (windowId: number, deviceIdStr: string) => {
    window.myAPI.updateInstanceCamera(windowId, deviceIdStr);
  };

  const sendMirrorToggle = (windowId: number) => {
    window.myAPI.toggleInstanceMirror(windowId);
  };

  const sendColorMirrorToggle = (windowId: number) => {
    window.myAPI.toggleInstanceColorMirror(windowId);
  };

  const newMatch = async (matchNum: number, type: 'qualifications' | 'playoffs' | 'finals', redAlliance: number[], blueAlliance: number[]) => {

    await window.myAPI.createMatch(matchNum, type, redAlliance, blueAlliance);
    setApproveStatus('');
  };

  const startMatch = async () => {
    await window.myAPI.startMatch();

    if(matchInfo?.matchTime === 160)
      playSound(sounds.matchStart);
  };

  const togglePauseMatch = () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    window.myAPI.pauseMatch(nextState);
  };

 const handleMetricAdjustment = (
      metric: ScoreMetric,
      alliance: 'red' | 'blue',
      amount: number
  ) => {
      metric.update(amount, alliance);
  };


  const approveAndAdvance = async () => {
    if (!matchInfo) return;

    const success = await window.myAPI.approveMatch();
    if (!success) {
      setApproveStatus('Could not approve — match may already be approved, or match number is not on the schedule.');
      return;
    }

    setApproveStatus(`Match ${matchInfo.matchNum} approved.`);

    if (matchType === 'playoffs') {
      const winner: 'red' | 'blue' = matchInfo.blue.points > matchInfo.red.points ? 'blue' : 'red';
      playoffsRunnerRef.current.matchPlayed(winner);
      const nextNum = playoffsRunnerRef.current.getCurMatch();
      setSelectedMatch(nextNum);
      fillTeamsFromBracket(nextNum);
    } else if (matchType === 'qualifications') {
      const nextNum = selectedMatch + 1;
      setSelectedMatch(nextNum);
      updateQualAlliance(nextNum);
    }

  };

  const undoApproval = async () => {
    if (!matchInfo) return;
    const success = await window.myAPI.undoMatchApproval(matchInfo.matchNum, matchInfo.matchType);
    setApproveStatus(success ? `Match ${matchInfo.matchNum} approval undone — rescoring is safe.` : 'Nothing to undo for this match.');
  };

  return (
    <div className="content">
      <h1 className="title">Match Runner Dashboard</h1>

      <button className='connect-btn' onClick={() => setDisplayOpen(!displayOpen)}>
        Display & Connection
        <img src='../../../../../images/dropdown-arrow.png' alt="arrow" className={'dropdown-' + (displayOpen ? 'open' : 'closed')} />
      </button>

      <div className={'display-' + (displayOpen ? 'open' : 'closed')}>
        <div>
          <div>
            <label className='red-hub-port' htmlFor="serial-device-picker">Select Red Hub Port: </label>
            <select
              className='red-hub-sec'
              onClick={() => scanHardwarePorts()}
              id="serial-device-picker"
              value={chosenPortIndex}
              onChange={(e) => setChosenPortIndex(e.target.value)}
              disabled={isSerialConnected}
            >
              <option value="">
                {isSerialConnected ? "Active Red Sensor Link" : "-- Choose Hardware Target --"}
              </option>
              {systemPorts.map((port, index) => {
                const info = port.getInfo();
                const displayName = info.portName || info.friendlyName || info.path || `Serial Port ${index + 1} (Vendor ID: ${info.usbVendorId || 'Unknown'})`;
                return (
                  <option key={index} value={index}>
                    {displayName}
                  </option>
                );
              })}
            </select>

            <button
              className="red-hub-btn"
              onClick={isSerialConnected ? handleDisconnectRed : handleConnectHardware}
              disabled={chosenPortIndex === "" && !isSerialConnected}
            >
              {isSerialConnected ? "Disconnect Red Hub" : "Connect Sensor"}
            </button>

            {isSerialConnected && (
              <button className="red-hub-btn" onClick={() => testRed()}>
                Test
              </button>
            )}

            <label className='blue-hub-port' htmlFor="serial-device-picker-2">Select Blue Hub Port: </label>
            <select
              className='blue-hub-sec'
              onClick={() => scanHardwarePorts()}
              id="serial-device-picker-2"
              value={chosenPortIndex2}
              onChange={(e) => setChosenPortIndex2(e.target.value)}
              disabled={isSerialConnected2}
            >
              <option value="">
                {isSerialConnected2 ? "Active Blue Sensor Link" : "-- Choose Hardware Target --"}
              </option>
              {systemPorts.map((port, index) => {
                const info = port.getInfo();
                const displayName = info.portName || info.friendlyName || info.path || `Serial Port ${index + 1} (Vendor ID: ${info.usbVendorId || 'Unknown'})`;
                return (
                  <option key={index} value={index}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            className="blue-hub-btn"
            onClick={isSerialConnected2 ? handleDisconnectBlue : handleConnectHardware2}
            disabled={chosenPortIndex2 === "" && !isSerialConnected2}
          >
            {isSerialConnected2 ? "Disconnect Blue Hub" : "Connect Sensor"}
          </button>

          {isSerialConnected2 && (
            <button className="blue-hub-btn" onClick={() => testBlue()}>
              Test
            </button>
          )}
        </div>

        <button className='spawn-btn' onClick={spawnNewScreenWindow}>
          Spawn New Screen Window
        </button>

        <h2 className="active-screens">Active Screens ({openedScreens.length})</h2>
        <div className="screens">
          {openedScreens.length === 0 ? (
            <p>No active display windows found.</p>
          ) : (
            <div>
              {openedScreens.map((screen) => (
                <div key={screen.id}>
                  <h3>{screen.name}</h3>
                  <div className="screen-opt">
                    <div>
                      <label htmlFor={`cam-select-${screen.id}`}>Assign Camera: </label>
                      <select
                        className="cam-select"
                        id={`cam-select-${screen.id}`}
                        onChange={(e) => pushCameraToWindow(screen.id, e.target.value)}
                      >
                        <option value="">-- Select Camera --</option>
                        {devices.map(device => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${device.deviceId.substring(0, 5)}...`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <button className="tog-mirror" onClick={() => sendMirrorToggle(screen.id)}>Toggle Mirror</button>
                      <button className='tog-color-mirror' onClick={() => sendColorMirrorToggle(screen.id)}>Toggle Color Filter</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="create-match-hud" style={{ marginTop: '20px' }}>
        <button onClick={() => {
          if (selectedMatch > 1) {
            setSelectedMatch(selectedMatch - 1)
            if (matchType === 'qualifications') updateQualAlliance(selectedMatch - 1);
            if (matchType === 'playoffs') fillTeamsFromBracket(selectedMatch - 1);
          }
        }}>-</button>
        <button className='match-create' onClick={() => newMatch(selectedMatch, matchType, selectedTeams[0].teams, selectedTeams[1].teams)}>
          Create Match: {selectedMatch}
        </button>
        <button onClick={() => {
          const maxLimit = teamNames.length > 0 ? teamNames[teamNames.length - 1].number : 999;
          if (selectedMatch < maxLimit) {
            setSelectedMatch(selectedMatch + 1)
            if (matchType === 'qualifications') updateQualAlliance(selectedMatch + 1);
            if (matchType === 'playoffs') fillTeamsFromBracket(selectedMatch + 1);
          }
        }}>+</button>
      </div>

      <select value={matchType} onChange={(e) => setMatchType(e.target.value as any)}>
        <option value='qualifications'>Qualifications</option>
        <option value='playoffs'>Playoffs</option>
        <option value='finals'>Finals</option>
      </select>

      <div className="control-panel">
        <button onClick={() => window.myAPI.changeDisplayScreen(0)}>Show Match Screen (0)</button>
        <button onClick={() => window.myAPI.changeDisplayScreen(1)}>Show Results Screen (1)</button>
        <button onClick={() => window.myAPI.changeDisplayScreen(2)}>Show Standings Screen (2)</button>
      </div>

      {(matchType === 'finals' || matchType === 'qualifications') && (
        <div className="screens" style={{ marginTop: '15px' }}>
          {selectedTeams.map((alliance, allianceIdx) => (
            <div key={allianceIdx} className="screen-opt">
              <h3>{allianceIdx === 0 ? 'Red' : 'Blue'} Alliance</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {alliance.teams.map((teamVal, teamDex) => (
                  <div key={teamDex} style={{ flex: 1 }}>
                    <input
                      className="cam-select"
                      type="text"
                      style={{ width: '100%', padding: '6px', color: '#fff', borderRadius: '4px' }}
                      onChange={e => handleChange2(allianceIdx, teamDex, e.target.value)}
                      value={teamVal === -1 ? "" : teamVal}
                      placeholder="Team #"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {matchType === 'playoffs' && (
        <p style={{ color: 'var(--text-label)', marginTop: '10px' }}>
          Bracket match {playoffsRunnerRef.current.getCurMatch()} of 13 — teams below are pulled from the Alliance Selection Draft Blocks.
        </p>
      )}

      <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
        <button className='match-start' onClick={() => startMatch()}>Play Match</button>
        <button className='match-start' onClick={togglePauseMatch}>
          {isPaused ? "Resume Match" : "Pause Match"}
        </button>
        <button className='match-start' onClick={approveAndAdvance} disabled={!matchInfo}>
          Approve Match & Advance
        </button>
        <button className='match-start' onClick={undoApproval} disabled={!matchInfo}>
          Undo Approval
        </button>
        <button className="match-start" onClick={() => {sendDataToHardware('red', "CMD:MOTOR:ON"); sendDataToHardware('blue', "CMD:MOTOR:ON");}}>
          Motors On
        </button>
        <button className="match-start" onClick={() => {sendDataToHardware('red', "CMD:MOTOR:OFF"); sendDataToHardware('blue', "CMD:MOTOR:OFF");}}>
          Motors Off
        </button>
      </div>

      {approveStatus && <p style={{ color: 'var(--accent-indigo)', marginTop: '8px' }}>{approveStatus}</p>}

      {matchInfo && (
        <div className="scoring-dashboard" style={{ marginTop: '25px', padding: '15px', border: '1px solid #444', borderRadius: '8px' }}>
          <h2>Live Scoreboard Match #{matchInfo.matchNum} ({matchInfo.matchType})</h2>
          <p>Time Left: {matchInfo.matchTime}s | Period: {matchInfo.period}</p>

          <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
            {(['red', 'blue'] as const).map(side => {
              const a = matchInfo[side];
              const color = side === 'red' ? '#ff4d4d' : '#4da6ff';
              const bg = side === 'red' ? 'rgba(255,0,0,0.1)' : 'rgba(0,0,255,0.1)';
              return (
                <div key={side} style={{ flex: 1, backgroundColor: bg, padding: '15px', borderRadius: '6px' }}>
                  <h3 style={{ color }}>
                    {side === 'red' ? 'Red' : 'Blue'} Alliance: {a.points} Pts &nbsp;|&nbsp; {a.rp} RP
                  </h3>
                  <p>Fuel Scored: {a.fuelScored} (Auto: {a.autoFuelScored})</p>

                  {SCORE_METRICS.map(metric => (
                    <div
                      key={metric.label}
                      className="control-group"
                      style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'center', marginBottom: '8px' }}
                    >
                      <span>{metric.label}: {metric.getValue(a)}</span>
                      
                      <button
                          onClick={() => handleMetricAdjustment(metric, side, 1)}
                      >
                          +
                      </button>

                      <button
                          onClick={() => handleMetricAdjustment(metric, side, -1)}
                      >
                          -
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {matchType === 'finals' && (
        <div className="finals-bracket-view" style={{ marginTop: '20px' }}>
          <h2>Grand Final Series</h2>
          <p>Top surviving playoff alliance nodes compete here.</p>
        </div>
      )}

      {matchType === 'playoffs' && (
        <div className="playoff-bracket-layout" style={{ marginTop: '25px' }}>
          <h2>Alliance Selection Draft Blocks</h2>
          <div className="screens">
            {alliances.map((alliance, allianceIdx) => (
              <div key={allianceIdx} className="screen-opt">
                <h3>Alliance {allianceIdx + 1}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {alliance.teams.map((teamVal, teamDex) => (
                    <div key={teamDex} style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px' }}>Pick {teamDex + 1}</label>
                      <input
                        className="cam-select"
                        type="text"
                        style={{ width: '100%', padding: '6px', color: '#fff', borderRadius: '4px' }}
                        onChange={e => handleChange(allianceIdx, teamDex, e.target.value)}
                        value={teamVal === -1 ? "" : teamVal}
                        placeholder="Team #"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Match;
