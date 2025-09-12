//main.js

import { app, BrowserWindow, ipcMain, Tray } from "electron";
import { isDev, validateEventFrame } from "./util.js";
import { getStaticData, pollResources } from "./resourceManager.js";
import { getPreloadPath, getUIPath, getAssetPath } from "./pathResolver.js";
import path from 'path';

let tray;

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

    const trayIconPath = path.join(getAssetPath(), "sfsp-admin.png");
    tray = new Tray(trayIconPath); 
    tray.setToolTip("sfsp-admin");

});