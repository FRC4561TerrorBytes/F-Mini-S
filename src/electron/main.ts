import {app, BrowserWindow, shell} from 'electron';
import path from 'path';
import { isDev } from './util.js';
import { ipcMain } from "electron/main"
import { getTeamName, getTeamNamesList, getTeamNumList, getTeamSkillList, writeNewTeamJson } from './dataRepoFunctions/teamMaker.js';
import { getAndUpdateMatchSchedule, getMatchSchedule, matchOptions } from './dataRepoFunctions/matchMaker.js';
import { ReadlineParser, SerialPort } from 'serialport';

const devTools = true;//dev tools #inspect element Change to false before dist.

//creates mainWindow
let mainWindow: BrowserWindow | null = null;

let ranksWindow: BrowserWindow | null = null;

const activeScreens = new Map<number, screen>();

function openLink(url: string) {
  shell.openExternal(url);
}

type matchInfo = {
    matchNum : number,
    matchType : 'qualifications' | 'playoffs' | 'finals',
    autoWin : 'red' | 'blue' | 'none',
    period: number,
    red: {
        points : number,
        fuelScored : number,
        endClimbsL1 : number,
        endClimbsL2 : number,
        endPark : number,
        autoClimbs : number,
        autoFuelScored : number,
        fouls: number,
        tFouls: number,
    },
    blue: {
        points : number,
        fuelScored : number,
        endClimbsL1 : number,
        endClimbsL2 : number,
        endPark : number,
        autoClimbs : number,
        autoFuelScored : number,
        fouls: number,
        tFouls: number,
    }
}

class match{

    private timer: NodeJS.Timeout | null = null;
    private time = 160;
    private paused = false;
    public info: matchInfo;

    constructor(matchNum : number, matchType : 'qualifications' | 'playoffs' | 'finals'){

        this.info = {
            matchNum : matchNum,
            matchType : matchType,
            autoWin : 'none',
            period : 0,
            red: {
                points : 0,
                fuelScored : 0,
                endClimbsL1 : 0,
                endClimbsL2 : 0,
                endPark : 0,
                autoClimbs : 0,
                autoFuelScored : 0,
                fouls: 0,
                tFouls: 0,
            },
            blue: {
                points : 0,
                fuelScored : 0,
                endClimbsL1 : 0,
                endClimbsL2 : 0,
                endPark : 0,
                autoClimbs : 0,
                autoFuelScored : 0,
                fouls: 0,
                tFouls: 0,
            }
        }
    }

    public periodRed(num: number){
        if(this.info.autoWin === 'none')
            return false;

        if (num === 1 || num === 6) return true;
        if (this.info.autoWin === 'red') {
            return num === 3 || num === 5;
        } else {
            return num === 2 || num === 4;
        }
    }

    public periodBlue(num: number){
        if(this.info.autoWin === 'none')
            return false;

        if (num === 1 || num === 6) return true;
        if (this.info.autoWin === 'red') {
            return num === 2 || num === 4;
        } else {
            return num === 3 || num === 5;
        }
    }

    public cnvtTimePeriod(num: number){
        if (num >= 130) return 1;
        if (num >= 105) return 2;
        if (num >= 80) return 3;
        if (num >= 55) return 4;
        if (num >= 30) return 5;
        return 6
    }

    public fuel(alliance : 'red' | 'blue') {
        if(this.time >= 140){
            this.info[alliance].fuelScored++;
            this.info[alliance].autoFuelScored++;
            this.info[alliance].points++;
        } else {
            if(alliance == 'red'){
                if(this.periodRed(this.cnvtTimePeriod(this.time))){
                    this.info[alliance].fuelScored++;
                    this.info[alliance].points++;
                }
            } else {
                if(this.periodBlue(this.cnvtTimePeriod(this.time))){
                    this.info[alliance].fuelScored++;
                    this.info[alliance].points++;
                }
            }
        }
        this.broadcast();
    }

    public autoClimbs(alliance : 'red' | 'blue', amt : number) {
        this.info[alliance].autoClimbs = amt;
        this.info[alliance].points = amt * 15;
        this.broadcast();
    }

    public l1Climbs(alliance : 'red' | 'blue', amt : number){
        this.info[alliance].endClimbsL1 = amt;
        this.broadcast();
    }

    public l2Climbs(alliance : 'red' | 'blue', amt : number){
        this.info[alliance].endClimbsL2 = amt;
        this.broadcast();
    }

    public parks(alliance : 'red' | 'blue', amt : number){
        this.info[alliance].endPark = amt;
        this.broadcast();
    }

    public start() {
        if(this.timer) return;

        this.timer = setInterval(()=>{
            if(this.time > 0 && !this.paused){
                this.time--;
            } else if(!this.paused){
                this.stop();
            }
            this.broadcast();
        }, 1000)
    }

    public stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    public pause(state : boolean){
        this.paused = state;
        this.broadcast();
    }

    public broadcast(){

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

    constructor(id : number, name : string, onDelete: (deadId: number) => void){
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

        if(isDev())
            this.window.loadURL("http://localhost:5123/screen");//port for vite website
        else
            this.window.loadFile(path.join(app.getAppPath(),'/dist-react/screen.html'/*Runs on location of main html for window(screen)*/));

        this.window.on('closed', () => {
            this.onDelete(this.id);
        })
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

app.on("ready", ()=> {

    ipcMain.on('fuel', (_, alliance) => {
        console.log("fuel scored by " + alliance);
    });

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

    ipcMain.handle("loadScreenWindow", () => {
    const uniqueId = Date.now();
    
    const screenNumber = activeScreens.size + 1;
    const friendlyName = `Display Viewport (${screenNumber})`;

    const newInstance = new screen(uniqueId, friendlyName, (deadId) => {
        activeScreens.delete(deadId);
        mainWindow?.webContents.send('window-was-closed-by-user', deadId);
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

    ipcMain.on('update-instance-camera', (_event, windowId: number, cam : string) => {

        const cameraNumber = cam || ""; 
        const targetScreen = activeScreens.get(windowId);
        if (targetScreen) {
            targetScreen.changeCam(cameraNumber);
        }
    });

    ipcMain.on('toggle-instance-mirror', (_event, windowId: number) => {
        const targetScreen = activeScreens.get(windowId);
        if (targetScreen) targetScreen.toggleMirror();
    });

    ipcMain.on('toggle-instance-color-mirror', (_event, windowId: number) => {
        const targetScreen = activeScreens.get(windowId);
        if (targetScreen) targetScreen.toggleColorMirror();
    });

    //set mainWindow actual browser
    mainWindow = new BrowserWindow({
        autoHideMenuBar: true,

        webPreferences: {
            devTools: devTools,
            preload: path.join(app.getAppPath(), 'dist-electron/preload.js'),
            contextIsolation: true
        }
    });

    mainWindow.webContents.session.setDevicePermissionHandler((details) => {
        if (details.deviceType === 'serial') {
            return true; // Universally allow the window to see system serial ports
        }
        return false;
    });

    mainWindow.webContents.session.setPermissionCheckHandler(() => true);
    mainWindow.webContents.session.setDevicePermissionHandler(() => true);

    //sets the application to whatever mode it is, "dev:editor, or dev:electron in package.json"
    if(isDev())
        mainWindow.loadURL("http://localhost:5123");//port for vite website
    else
        mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'/*Runs on location of main html for window(main)*/));

    mainWindow.on('closed', () => {

        mainWindow = null;
        app.quit();
    })
});

function loadRanksWindow(){

        ranksWindow = new BrowserWindow({
        autoHideMenuBar: true,
        webPreferences: {
            devTools: devTools,
            preload: path.join(app.getAppPath(), 'dist-electron/preload.js'),
            contextIsolation: true
        }
    });

         if(isDev())
        ranksWindow.loadURL("http://localhost:5123/ranks");//port for vite website
    else
        ranksWindow.loadFile(path.join(app.getAppPath(),'/dist-react/ranks.html'/*Runs on location of main html for window(screen)*/));
}