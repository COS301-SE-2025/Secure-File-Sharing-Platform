import { app, Menu } from "electron";
import { isDev } from "./util.js";

export function newMenu(mainWindow) {
  const template = [
    {
      label: process.platform === "darwin" ? app.name : "App",
      submenu: [
        {
          label: "Quit",
          accelerator: "CmdOrCtrl+Q",
          click: () => app.quit(),
        },
        {
          label: "DevTools",
          accelerator: "CmdOrCtrl+Shift+I",
          click: () => mainWindow.webContents.openDevTools(),
          visible: isDev(),
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "To be decided",
          enabled: false,
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
