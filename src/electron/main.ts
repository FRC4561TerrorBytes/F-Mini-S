import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import { isDev } from './util.js';
import { getTeamName, getTeamNamesList, getTeamNumList, getTeamSkillList, writeNewTeamJson } from './dataRepoFunctions/teamMaker.js';
import { getAndUpdateMatchSchedule, getMatchSchedule, matchOptions } from './dataRepoFunctions/matchMaker.js';
import { addRebuiltMatchResult, getMatchResult, getMatchResultFile, removeMatchResult } from './games/rebuilt/matchResultMaker.js';
import { getRanks } from './dataRepoFunctions/rankingMaker.js';

const devTools = true;

let mainWindow: BrowserWindow | null = null;
let ranksWindow: BrowserWindow | null = null;
const activeScreens = new Map<number, screen>();

function openLink(url: string) {
  shell.openExternal(url).catch(err => console.error("Failed to open link:", err));
}

const SCORING = {
    autoClimb: 15,
    l1Climb: 10,
    l2Climb: 30,
    park: 5,
    foulAwardedToOpponent: 5,
    techFoulAwardedToOpponent: 15,
    rp: {
        energizedFuel: 50,
        superchargedFuel: 100,
        traversalPoints: 30,
        winRP: 3,
        tieRP: 1,
    }
};

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
    matchNum : number,
    matchTime : number,
    matchType : 'qualifications' | 'playoffs' | 'finals',
    autoWin : 'red' | 'blue' | 'none',
    period: number,
    red: alliancePerformance,
    blue: alliancePerformance
}

class Match {
    private timer: NodeJS.Timeout | null = null;
    private paused = true;
    public info: matchInfo;
    public reTime: number = 0;

    constructor() {
        this.info = this.createDefaultMatchInfo(0, 'qualifications', [0,0,0], [0,0,0]);
    }

    private createDefaultMatchInfo(matchNum: number, matchType: 'qualifications' | 'playoffs' | 'finals', redAlliance : number[], blueAlliance: number[]): matchInfo {
        const blankAlliance = (alliance: number[]): alliancePerformance => ({
            alliance, points: 0, fuelScored: 0, endClimbsL1: 0, endClimbsL2: 0, endPark: 0,
            autoClimbs: 0, autoFuelScored: 0, fouls: 0, tFouls: 0, endPoints: 0, rp: 0
        });

        return {
            matchNum, matchTime: 160, matchType, autoWin: 'none', period: 1,
            red: blankAlliance(redAlliance),
            blue: blankAlliance(blueAlliance)
        };
    }

    public periodRed(num: number) {
        if (this.info.autoWin === 'none') return false;
        if (num === 1 || num === 6) return true;
        return this.info.autoWin === 'red' ? (num === 3 || num === 5) : (num === 2 || num === 4);
    }

    public periodBlue(num: number) {
        if (this.info.autoWin === 'none') return false;
        if (num === 1 || num === 6) return true;
        return this.info.autoWin === 'red' ? (num === 2 || num === 4) : (num === 3 || num === 5);
    }

    public cnvtTimePeriod(num: number) {
        if (num >= 130) return 1;
        if (num >= 105) return 2;
        if (num >= 80) return 3;
        if (num >= 55) return 4;
        if (num >= 30) return 5;
        return 6;
    }

    public cnvtTimePeriodFuel(num: number) {
        if (num >= 130) return 1;
        if (num >= 130 -3 && num <= 130) return 1;
        if (num >= 105) return 2;
        if (num >= 105 -3 && num <= 105) return 1;
        if (num >= 80) return 3;
        if (num >= 80-3 && num <= 80) return 1;
        if (num >= 55) return 4;
        if (num >= 55-3 && num <= 55) return 1;
        if (num >= 30) return 5;
        if (num >= 30 -3 && num <= 55) return 1;
        return 6;
    }

    public cnvtPeriodTime(num : number){
        if (num >= 130) return num - 130;
        if (num >= 105) return num - 105;
        if (num >= 80) return num - 80;
        if (num >= 55) return num - 55;
        if (num >= 30) return num - 30;
        return num;
    }

    public cnvtTimeInPeriod(num : number){
        if (num >= 130) return 10;
        if (num >= 105) return 25;
        if (num >= 80) return 25;
        if (num >= 55) return 25;
        if (num >= 30) return 30;
        return num;
    }

    public fuel(alliance: 'red' | 'blue') {

        if(this.info.matchTime <= -2){
            return;
        }
        if (this.info.matchTime >= 140) {
            this.info[alliance].fuelScored++;
            this.info[alliance].autoFuelScored++;
        } else {
            const period = this.cnvtTimePeriod(this.info.matchTime);
            if ((alliance === 'red' && this.periodRed(period)) || (alliance === 'blue' && this.periodBlue(period))) {
                this.info[alliance].fuelScored++;
            }
        }
        this.recompute();
    }

    public autoClimbs(alliance: 'red' | 'blue', amt: number) {
        this.info[alliance].autoClimbs = Math.max(
            0,
            this.info[alliance].autoClimbs + amt
        );
        this.recompute();
    }

    public l1Climbs(alliance: 'red' | 'blue', amt: number) {
        this.info[alliance].endClimbsL1 = Math.max(
            0,
            this.info[alliance].endClimbsL1 + amt
        );
        this.recompute();
    }

    public l2Climbs(alliance: 'red' | 'blue', amt: number) {
        this.info[alliance].endClimbsL2 = Math.max(
            0,
            this.info[alliance].endClimbsL2 + amt
        );
        this.recompute();
    }

    public foul(alliance: 'red' | 'blue', amt: number) {
        this.info[alliance].fouls = Math.max(
            0,
            this.info[alliance].fouls + amt
        );
        this.recompute();
    }

    public tFoul(alliance: 'red' | 'blue', amt: number) {
        this.info[alliance].tFouls = Math.max(
            0,
            this.info[alliance].tFouls + amt
        );
        this.recompute();
    }

    public parks(alliance: 'red' | 'blue', amt: number) {
        this.info[alliance].endPark = Math.max(
            0,
            this.info[alliance].endPark + amt
        );
        this.recompute();
    }

    public start() {
        if (this.timer) {
            this.pause(false);
            return;
        }

        this.paused = false;
        this.timer = setInterval(() => {
            if (this.info.matchTime > -4 && !this.paused) {
                this.info.matchTime--;
                this.info.period = this.cnvtTimePeriod(this.info.matchTime);
            } else if (!this.paused) {
                this.stop();
            }
            if (this.info.matchTime === 140) {
                this.info.autoWin = this.info.blue.points < this.info.red.points ? 'red' : 'blue';
                this.pause(true);
            }
            this.broadcast();
        }, 1000);
    }

    public stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    public pause(state: boolean) {
        this.paused = state;
        this.broadcast();
    }

    public newMatch(matchNum: number, matchType: 'qualifications' | 'finals' | 'playoffs', redAlliance : number[], blueAlliance : number[]) {
        this.stop();
        this.info = this.createDefaultMatchInfo(matchNum, matchType, redAlliance, blueAlliance);
        this.pause(true);
        this.broadcast();
    }
    
    public recompute() {
        const sides: ('red' | 'blue')[] = ['red', 'blue'];
        sides.forEach(side => {
            const opponent = side === 'red' ? 'blue' : 'red';
            const a = this.info[side];
            const opp = this.info[opponent];

            let endPoints = 0;
            endPoints += a.autoClimbs * SCORING.autoClimb;
            endPoints += a.endClimbsL1 * SCORING.l1Climb;
            endPoints += a.endClimbsL2 * SCORING.l2Climb;
            endPoints += a.endPark * SCORING.park;
            endPoints += opp.fouls * SCORING.foulAwardedToOpponent;
            endPoints += opp.tFouls * SCORING.techFoulAwardedToOpponent;
            a.endPoints = endPoints;
            a.points = a.fuelScored + a.endPoints;
        });

        sides.forEach(side => {
            const opponent = side === 'red' ? 'blue' : 'red';
            const a = this.info[side];
            const opp = this.info[opponent];

            let rp = 0;
            if (a.fuelScored >= SCORING.rp.energizedFuel) rp++;
            if (a.fuelScored >= SCORING.rp.superchargedFuel) rp++;

            const climbPts = a.autoClimbs * SCORING.autoClimb + a.endClimbsL1 * SCORING.l1Climb + a.endClimbsL2 * SCORING.l2Climb + a.endPark * SCORING.park;
            if (climbPts >= SCORING.rp.traversalPoints) rp++;

            if (a.points === opp.points) rp += SCORING.rp.tieRP;
            else if (a.points > opp.points) rp += SCORING.rp.winRP;

            a.rp = rp;
        });

        this.broadcast();
    }

    public async approve(): Promise<boolean> {
        return await addRebuiltMatchResult(
            this.info.matchNum, this.info.matchType, this.info.red.alliance, this.info.blue.alliance,
            this.info.red.points, this.info.red.fuelScored, this.info.red.endClimbsL1, this.info.red.endClimbsL2, this.info.red.endPark, this.info.red.autoClimbs, this.info.red.fouls, this.info.red.tFouls,
            this.info.blue.points, this.info.blue.fuelScored, this.info.blue.endClimbsL1, this.info.blue.endClimbsL2, this.info.blue.endPark, this.info.blue.autoClimbs, this.info.blue.fouls, this.info.blue.tFouls
        );
    }

    public broadcast() {
        activeScreens.forEach((screen) => {
            if (!screen.window.isDestroyed()) {
                screen.window.webContents.send('MatchInfo', this.info);
            }
        });
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('MatchInfo', this.info);
        }
        if (ranksWindow && !ranksWindow.isDestroyed()) {
            ranksWindow.webContents.send('MatchInfo', this.info);
        }
    }
}

class screen {
    id: number;
    name: string;
    window: BrowserWindow;
    mirror: boolean;
    cam: string;
    colorMirror: boolean;
    onDelete: (deadId: number) => void;

    constructor(id: number, name: string, onDelete: (deadId: number) => void) {
        this.id = id;
        this.name = name;
        this.onDelete = onDelete;
        this.mirror = false;
        this.cam = "";
        this.colorMirror = false;

        this.window = new BrowserWindow({
            autoHideMenuBar: true,
            webPreferences: {
                devTools: devTools,
                preload: path.join(app.getAppPath(), 'dist-electron/preload.js'),
                contextIsolation: true
            }
        });

        if (isDev()) {
            this.window.loadURL("http://localhost:5123/screen").catch(err => console.error(err));
        } else {
            this.window.loadFile(path.join(app.getAppPath(), '/dist-react/screen.html')).catch(err => console.error(err));
        }

        this.window.on('closed', () => {
            this.onDelete(this.id);
        });
    }

    public changeCam(cam: string): void {
        this.cam = cam;
        this.window.webContents.send('cam-updated', cam);
    }

    public toggleMirror(): void {
        this.mirror = !this.mirror;
        this.window.webContents.send('mirror-toggled', this.mirror);
    }

    public toggleColorMirror(): void {
        this.colorMirror = !this.colorMirror;
        this.window.webContents.send('colorMirror-toggled', this.colorMirror);
    }
}

app.on("ready", () => {
    const match: Match = new Match();

    ipcMain.handle('change-display-screen', (_event, screenIndex: number) => {
        
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('display-screen-changed', screenIndex);
        });
        return { success: true };
    });

    ipcMain.on("startMatch", () => match.start());
    ipcMain.on("createMatch", (_, matchNum, matchType, redAlliance, blueAlliance) => match.newMatch(matchNum, matchType, redAlliance, blueAlliance));
    ipcMain.on("pauseMatch", (_, state) => match.pause(state));
    ipcMain.on("autoClimbs", (_, amt, alliance) => match.autoClimbs(alliance, amt));

    ipcMain.on("l1Climbs", (_, amt, alliance) => match.l1Climbs(alliance, amt));
    ipcMain.on("l2Climbs", (_, amt, alliance) => match.l2Climbs(alliance, amt));

    ipcMain.on("parks", (_, amt, alliance) => match.parks(alliance, amt));
    ipcMain.on("fouls", (_, amt, alliance) => match.foul(alliance, amt));
    ipcMain.on("tFouls", (_, amt, alliance) => match.tFoul(alliance, amt));
    ipcMain.on('fuel', (_, alliance) => match.fuel(alliance));

    ipcMain.handle('getMatchResults', (_, num, type) => getMatchResult(num, type));
    ipcMain.handle('getMatchResultFile', () => getMatchResultFile());

    ipcMain.handle('approveMatch', async () => await match.approve());
    ipcMain.handle('undoMatchApproval', async (_, matchNum: number, matchType: string) => await removeMatchResult(matchNum, matchType));

    ipcMain.handle("ping", () => "pong");
    ipcMain.handle("getTeamName", (_, teamNumber) => getTeamName(teamNumber));
    ipcMain.handle("loadRanksWindow", () => loadRanksWindow());
    ipcMain.handle("openLinkExternally", (_, url) => openLink(url));
    ipcMain.handle("getTeamNameList", () => getTeamNamesList());
    ipcMain.handle("getTeamNumberList", () => getTeamNumList());
    ipcMain.handle("getTeamSkillList", () => getTeamSkillList());
    ipcMain.handle("updateTeamsJson", (_, teams) => writeNewTeamJson(teams));
    ipcMain.handle("getMatchOptions", (_, amt) => matchOptions(amt));
    ipcMain.handle("getAndUpdateMatchSchedule", (_, matchesPerTeam, matchesTotal) => getAndUpdateMatchSchedule(matchesPerTeam, matchesTotal));
    ipcMain.handle("getMatchSchedule", () => getMatchSchedule());

    ipcMain.handle("getRanks", () => getRanks());

    ipcMain.handle("loadScreenWindow", () => {
        const uniqueId = Date.now();
        const screenNumber = activeScreens.size + 1;
        const friendlyName = `Display Viewport (${screenNumber})`;

        const newInstance = new screen(uniqueId, friendlyName, (deadId) => {
            activeScreens.delete(deadId);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('window-was-closed-by-user', deadId);
            }
        });

        activeScreens.set(uniqueId, newInstance);
        return { id: uniqueId, name: friendlyName };
    });

    ipcMain.handle("getActiveScreens", () => {
        return Array.from(activeScreens.values()).map(s => ({
            id: s.id,
            name: s.name
        }));
    });

    ipcMain.on('update-instance-camera', (_event, windowId: number, cam: string) => {
        const targetScreen = activeScreens.get(windowId);
        if (targetScreen) targetScreen.changeCam(cam || "");
    });

    ipcMain.on('toggle-instance-mirror', (_event, windowId: number) => {
        const targetScreen = activeScreens.get(windowId);
        if (targetScreen) targetScreen.toggleMirror();
    });

    ipcMain.on('toggle-instance-color-mirror', (_event, windowId: number) => {
        const targetScreen = activeScreens.get(windowId);
        if (targetScreen) targetScreen.toggleColorMirror();
    });

    mainWindow = new BrowserWindow({
        autoHideMenuBar: true,
        webPreferences: {
            devTools: devTools,
            preload: path.join(app.getAppPath(), 'dist-electron/preload.js'),
            contextIsolation: true
        }
    });

    mainWindow.webContents.session.setPermissionCheckHandler(() => true);
    mainWindow.webContents.session.setDevicePermissionHandler(() => true);

    if (isDev()) {
        mainWindow.loadURL("http://localhost:5123").catch(err => console.error(err));
    } else {
        mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html')).catch(err => console.error(err));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
        app.quit();
    });
});

function loadRanksWindow() {
    ranksWindow = new BrowserWindow({
        autoHideMenuBar: true,
        webPreferences: {
            devTools: devTools,
            preload: path.join(app.getAppPath(), 'dist-electron/preload.js'),
            contextIsolation: true
        }
    });

    if (isDev()) {
        ranksWindow.loadURL("http://localhost:5123/ranks").catch(err => console.error(err));
    } else {
        ranksWindow.loadFile(path.join(app.getAppPath(), '/dist-react/ranks.html')).catch(err => console.error(err));
    }
}