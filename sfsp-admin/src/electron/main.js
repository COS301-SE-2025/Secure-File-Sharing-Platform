//main.js

import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import { isDev, validateEventFrame } from "./util.js";
import { getStaticData, pollResources } from "./resourceManager.js";
import { getPreloadPath, getUIPath } from "./pathResolver.js";
import { newTray } from "./tray.js";
import { newMenu } from "./menu.js";


app.on("ready", () => {
    const mainWindow = new BrowserWindow({
        show: false,
        webPreferences: {
            preload: getPreloadPath(),
        },
    });

    mainWindow.maximize();
    mainWindow.show();

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
    newMenu(mainWindow);

    /* mainWindow.webContents.on("devtools-opened", () => {
        mainWindow.webContents.closeDevTools();
    });

    globalShortcut.register("CommandOrControl+Shift+I", () => {
        console.log("Blocked attempt to open DevTools");
    });
    globalShortcut.register("F12", () => {
        console.log("Blocked attempt to open DevTools");
    }); */

});

function handleClose(mainWindow) {
    let isQuitting = false;

    mainWindow.on("close", (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow.hide();
            if (app.dock) {
                app.dock.hide();
            }
        }
    });

    app.on("before-quit", () => {
        isQuitting = true;
    });
}