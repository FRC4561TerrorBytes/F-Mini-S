import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron/renderer";

type TeamInput = {
  number: string;
  name: string;
  skill: string;
};

type Match = {
  number: number;
  redAlliance: number[];
  blueAlliance: number[];
};

type matchResultFile = {
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

type matchInfo = {
  matchNum: number;
  matchType: 'qualifications' | 'playoffs' | 'finals';
  matchTime : number;
  autoWin: 'red' | 'blue' | 'none';
  period: number;
  red: alliancePerformance;
  blue: alliancePerformance;
};

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

export interface IElectronAPI {
    getRanks: () => Promise<TeamRank[]>;
    getMatchResultFiles: () => Promise<matchResultFile[]>;
    getMatchResults: (num : number, type : string) => Promise<matchResultFile>;
    ping: () => Promise<string>;
    getTeamName: (teamNumber: number) => Promise<string>;
    loadRanksWindow: () => void;
    openLinkExternally: (url : string) => void;
    getTeamNumberList: () => Promise<number[]>;
    getTeamNameList: () => Promise<string[]>;
    getTeamSkillList: () => Promise<number[]>;
    importTeamCSV: (csvString: string) => Promise<void>;
    updateTeamsJson: (teams : TeamInput[]) => void;
    getMatchOptions: (amt : number) => Promise<number[][]>;
    updateMatchSchedule: (matchesPerTeam : number) => Promise<Match[]>;
    getMatchSchedule: () => Promise<Match[]>;

    approveMatch: () => Promise<boolean>;
    undoMatchApproval: (matchNum: number, matchType: string) => Promise<boolean>;

    loadScreenWindow: () => Promise<{ id: number; name: string }>;
    updateInstanceCamera: (windowId: number, cam: string) => void;
    toggleInstanceMirror: (windowId: number) => void;
    toggleInstanceColorMirror: (windowId: number) => void;

    onCameraUpdate: (callback: (cam: string) => void) => () => void;
    onMirrorToggle: (callback: (mirrored: boolean) => void) => () => void;
    onColorMirrorToggle: (callback: (colorMirrored: boolean) => void) => () => void;
    onInstanceClosed: (callback: (deadId: number) => void) => () => void;
    onMatchInfo: (callback: (data: matchInfo) => void) => () => void;
    getActiveScreens: () => Promise<{ id: number; name: string }[]>;

    sendFuel: (alliance : string) => void;
    startMatch: () => void;
    createMatch: (matchNum : number, matchType : 'qualifications' | 'finals' | 'playoffs', redAlliance : number[], blueAlliance : number[]) => void;
    pauseMatch: (state : boolean) => void;
    autoClimbs: (amt : number, alliance : 'red' | 'blue') => void;
    l1Climbs: (amt : number, alliance : 'red' | 'blue') => void;
    l2Climbs: (amt : number, alliance : 'red' | 'blue') => void;
    parks: (amt : number, alliance : 'red' | 'blue') => void;
    fouls: (amt : number, alliance : 'red' | 'blue') => void;
    tFouls: (amt : number, alliance : 'red' | 'blue') => void;

    changeDisplayScreen: (screenIndex: number) => Promise<void>;
    onDisplayScreenChanged: (callback: (screenIndex: number) => void) => () => void;
}

const api: IElectronAPI = {
    getRanks: () => ipcRenderer.invoke("getRanks"),
    getMatchResultFiles: () => ipcRenderer.invoke("getMatchResultFile"),
    getMatchResults: (num : number, type : string) => ipcRenderer.invoke("getMatchResults", num, type),

    ping: () => ipcRenderer.invoke("ping"),
    getTeamName: (teamNumber: number) => ipcRenderer.invoke("getTeamName", teamNumber),
    loadRanksWindow: () => ipcRenderer.invoke("loadRanksWindow"),
    openLinkExternally: (url : string) => ipcRenderer.invoke("openLinkExternally", url),
    getTeamNameList: () => ipcRenderer.invoke("getTeamNameList"),
    getTeamNumberList: () => ipcRenderer.invoke("getTeamNumberList"),
    getTeamSkillList: () => ipcRenderer.invoke("getTeamSkillList"),
    importTeamCSV: (csvString: string) => ipcRenderer.invoke('importTeamCSV', csvString),
    updateTeamsJson: (teams : TeamInput[]) => ipcRenderer.invoke('updateTeamsJson', teams),
    getMatchOptions: (amt : number) => ipcRenderer.invoke('getMatchOptions', amt),
    updateMatchSchedule: (matchesPerTeam : number) => ipcRenderer.invoke('updateMatchSchedule', matchesPerTeam),
    getMatchSchedule: () => ipcRenderer.invoke('getMatchSchedule'),

    approveMatch: () => ipcRenderer.invoke('approveMatch'),
    undoMatchApproval: (matchNum: number, matchType: string) => ipcRenderer.invoke('undoMatchApproval', matchNum, matchType),

    loadScreenWindow: () => ipcRenderer.invoke("loadScreenWindow"),

    updateInstanceCamera: (windowId, cam) => {
        ipcRenderer.send("update-instance-camera", windowId, cam);
    },

    toggleInstanceMirror: (windowId) => {
        ipcRenderer.send("toggle-instance-mirror", windowId);
    },

    toggleInstanceColorMirror: (windowId) => {
        ipcRenderer.send("toggle-instance-color-mirror", windowId);
    },

    onCameraUpdate: (callback) => {
        const listener = (_event: IpcRendererEvent, cam: string) => callback(cam);
        ipcRenderer.on("cam-updated", listener);
        return () => { ipcRenderer.removeListener("cam-updated", listener); };
    },

    onMirrorToggle: (callback) => {
        const listener = (_event: IpcRendererEvent, mirrored: boolean) => callback(mirrored);
        ipcRenderer.on("mirror-toggled", listener);
        return () => { ipcRenderer.removeListener("mirror-toggled", listener); };
    },

    onColorMirrorToggle: (callback) => {
        const listener = (_event: IpcRendererEvent, colorMirrored: boolean) => callback(colorMirrored);
        ipcRenderer.on("colorMirror-toggled", listener);
        return () => { ipcRenderer.removeListener("colorMirror-toggled", listener); };
    },

    onInstanceClosed: (callback) => {
        const listener = (_event: IpcRendererEvent, deadId: number) => callback(deadId);
        ipcRenderer.on("window-was-closed-by-user", listener);
        return () => { ipcRenderer.removeListener("window-was-closed-by-user", listener); };
    },

    onMatchInfo: (callback) => {
        const listener = (_event: IpcRendererEvent, data: matchInfo) => callback(data);
        ipcRenderer.on('MatchInfo', listener);
        return () => { ipcRenderer.removeListener('MatchInfo', listener); };
    },

    getActiveScreens: () => ipcRenderer.invoke("getActiveScreens"),

    sendFuel: (alliance : string) => {
        ipcRenderer.send("fuel", alliance);
    },

    startMatch: () => {
        ipcRenderer.send('startMatch');
    },

    createMatch: (matchNum : number, matchType : 'qualifications' | 'finals' | 'playoffs', redAlliance : number[], blueAlliance: number[]) => {
        ipcRenderer.send('createMatch', matchNum, matchType, redAlliance, blueAlliance);
    },

    pauseMatch: (state : boolean) => {
        ipcRenderer.send('pauseMatch', state);
    },

    autoClimbs: (amt : number, alliance : 'red' | 'blue') => {
        ipcRenderer.send('autoClimbs', amt, alliance);
    },

    l1Climbs: (amt : number, alliance : 'red' | 'blue') => {
        ipcRenderer.send('l1Climbs', amt, alliance);
    },

    l2Climbs: (amt : number, alliance : 'red' | 'blue') => {
        ipcRenderer.send('l2Climbs', amt, alliance);
    },

    parks: (amt : number, alliance : 'red' | 'blue') => {
        ipcRenderer.send('parks', amt, alliance);
    },

    fouls: (amt : number, alliance : 'red' | 'blue') => {
        ipcRenderer.send('fouls', amt, alliance);
    },

    tFouls: (amt : number, alliance : 'red' | 'blue') => {
        ipcRenderer.send('tFouls', amt, alliance);
    },

    changeDisplayScreen: (screenIndex: number) => ipcRenderer.invoke("change-display-screen", screenIndex),
    
    onDisplayScreenChanged: (callback) => {
        const listener = (_event: IpcRendererEvent, index: number) => callback(index);
        ipcRenderer.on("display-screen-changed", listener);
        return () => { ipcRenderer.removeListener("display-screen-changed", listener); };
    }
};

contextBridge.exposeInMainWorld('myAPI', api);

declare global {
  interface Window {
    myAPI: IElectronAPI;
  }
}