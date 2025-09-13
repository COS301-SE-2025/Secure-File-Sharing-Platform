// preload.cjs
console.log("✅ Preload script loaded");

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {

  subscribeStatistics: (callback) => {
    const listener = (_, stats) => callback(stats);
    ipcRenderer.on("statistics", listener);

    return () => {
      ipcRenderer.off("statistics", listener);
    };
  },

  getStaticData: () => ipcRenderer.invoke("getStaticData"),
});

console.log(
  "✅ Preload ran, exposing electron:",
  typeof contextBridge !== "undefined"
);


// //preload.js
// console.log("✅ Preload script loaded");

// const { contextBridge, ipcRenderer } = require("electron");
// // const { getStaticData } = require("./resourceManager");

// contextBridge.exposeInMainWorld("electron", {
//   subscribeStatistics: (callback) => {
//     ipcRenderer.on("statistics", (_, stats) => {
//       callback(stats); 
//     });
//   },
//   getStaticData:()=> ipcRenderer.invoke("getStaticData"),
//   // getStaticData: () => {
//   //   console.log("static");
//   //   return "static";
//   // },
// });

// console.log("✅ Preload ran, exposing electron:", typeof contextBridge !== "undefined");
