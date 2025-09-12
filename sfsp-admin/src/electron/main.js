//main.js

import { app, BrowserWindow, ipcMain } from "electron";
import { isDev, validateEventFrame } from "./util.js";
import { getStaticData, pollResources } from "./resourceManager.js";
import { getPreloadPath, getUIPath} from "./pathResolver.js";
import { newTray } from "./tray.js";


app.on("ready", () => {
    const mainWindow = new BrowserWindow({
        webPreferences: {
            preload: getPreloadPath(),
        },
    });
    if (isDev()) {
        mainWindow.loadURL('http://localhost:5123');
    } else {
        mainWindow.loadFile(getUIPath());
    }

    pollResources(mainWindow);

    ipcMain.handle("getStaticData", async (event) => {
        validateEventFrame(event.senderFrame);
        return getStaticData();
    });

    newTray(mainWindow);
    handleClose(mainWindow);

});

function handleClose(mainWindow) {
    let boolClose = false;

    mainWindow.on("close", (e) => {
        if(boolClose){
            return;
        }
        e.preventDefault();
        mainWindow.hide();
        if(app.dock){
            app.dock.hide();
        }
    });

    app.on("before quit", () => {
        boolClose = true;
    });

    mainWindow.on("show", () => {
        boolClose = false;
    });
}