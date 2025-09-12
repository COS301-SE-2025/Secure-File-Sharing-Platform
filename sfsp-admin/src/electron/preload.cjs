const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  subscribeStatistics: (callback) => {
    ipcRenderer.on("statistics", (_, stats) => {
      callback(stats); // send the stats object directly
    });
  },
  getStaticData: () => {
    console.log("static");
    return "static";
  },
});