const electron = require("electron");

electron.contextBridge.exposeInMainWorld("electron", {
  subscribeStatistics: (callback) => callback({}),
  getStaticData: () => console.log("static"),
});
