import { app, Tray, Menu } from "electron";
import path from "path";
import { getAssetPath } from "./pathResolver.js";

let tray = null;

export function newTray(mainWindow) {
    const trayIconPath = path.join(getAssetPath(), "sfsp-admin.png");
    tray = new Tray(trayIconPath);

    tray.setContextMenu(
        Menu.buildFromTemplate([
            {
                label: "Show",
                click: () => {
                    mainWindow.show();
                    if(app.dock){
                        app.dock.show();
                    }
                }
            },
            {
                label: "Quit",
                click: () => app.quit()
            }
        ]));

    tray.setToolTip("SFSP Admin");

}