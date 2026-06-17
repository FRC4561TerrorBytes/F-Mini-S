import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron/renderer";

type TeamInput = {
  number: string;
  name: string;
  skill: string;
};

type Match = {
  number: number,
  redAlliance: number[],
  blueAlliance: number[]
};

export interface IElectronAPI {
    ping: () => Promise<string>;
    getTeamName: (teamNumber: number) => Promise<string>;
    loadRanksWindow: () => void;
    openLinkExternally: (url : string) => void;
    getTeamNumberList: () => Promise<number[]>;
    getTeamNameList: () => Promise<string[]>;
    getTeamSkillList: () => Promise<number[]>;
    updateTeamsJson: (teams : TeamInput[]) => void;
    getMatchOptions: (amt : number) => Promise<number[][]>;
    getAndUpdateMatchSchedule: (matchesPerTeam : number, matchesTotal : number) => Promise<Match[]>;
    getMatchSchedule: () => Promise<Match[]>;

    loadScreenWindow: () => Promise<{ id: number; name: string }>;
    updateInstanceCamera: (windowId: number, cam: string) => void;
    toggleInstanceMirror: (windowId: number) => void;
    toggleInstanceColorMirror: (windowId: number) => void;

    onCameraUpdate: (callback: (cam: string) => void) => () => void;
    onMirrorToggle: (callback: (mirrored: boolean) => void) => () => void;
    onColorMirrorToggle: (callback: (colorMirrored: boolean) => void) => () => void;
    onInstanceClosed: (callback: (deadId: number) => void) => () => void;
    getActiveScreens: () => Promise<{ id: number; name: string }[]>;
    
    sendFuel: (alliance : string) => void;
}

const api: IElectronAPI = {

    ping: () => ipcRenderer.invoke("ping"),
    getTeamName: (teamNumber: number) => ipcRenderer.invoke("getTeamName", teamNumber),
    loadRanksWindow: () => ipcRenderer.invoke("loadRanksWindow"),
    openLinkExternally: (url : string) => ipcRenderer.invoke("openLinkExternally", url),
    getTeamNameList: () => ipcRenderer.invoke("getTeamNameList"),
    getTeamNumberList: () => ipcRenderer.invoke("getTeamNumberList"),
    getTeamSkillList: () => ipcRenderer.invoke("getTeamSkillList"),
    updateTeamsJson: (teams : TeamInput[]) => ipcRenderer.invoke('updateTeamsJson', teams),
    getMatchOptions: (amt : number) => ipcRenderer.invoke('getMatchOptions', amt),
    getAndUpdateMatchSchedule: (matchesPerTeam : number, matchesTotal : number) => ipcRenderer.invoke('getAndUpdateMatchSchedule', matchesPerTeam, matchesTotal),
    getMatchSchedule: () => ipcRenderer.invoke('getMatchSchedule'),

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

    getActiveScreens: () => {
        return ipcRenderer.invoke("getActiveScreens");
    },

    sendFuel: (alliance : string) => {
        ipcRenderer.send("fuel", alliance);
    }
}

contextBridge.exposeInMainWorld('myAPI', api);