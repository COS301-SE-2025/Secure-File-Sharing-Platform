//resourceManager.js
import osUtils from "os-utils";
import fs from "fs";
import os from "os";
import { BrowserWindow } from "electron";

const POLLING_INTERVAL = 500;
let intervalId = null;

export function pollResources(mainWindow) {
  if (intervalId) clearInterval(intervalId);

  intervalId = setInterval(async () => {
    if (mainWindow.isDestroyed()) {
      clearInterval(intervalId);
      intervalId = null;
      return;
    }

    try {
      const cpuUsage = await getCpuUsage();
      const ramUsage = getRamUsage();
      const storageData = getStorageData();

      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send("statistics", {
          cpuUsage,
          ramUsage,
          storageUsage: storageData.usage,
        });
      }
    } catch (err) {
      console.warn("Polling failed:", err.message);
    }
  }, POLLING_INTERVAL);
}

export function getStaticData() {
  const totalStorage = getStorageData().total;
  const cpuModel = os.cpus()[0].model;
  const totalMemoryGB = Math.floor(osUtils.totalmem() / 1024);

  return {
    totalStorage,
    cpuModel,
    totalMemoryGB,
  };
}

function getCpuUsage() {
  return new Promise(resolve => {
    osUtils.cpuUsage(resolve)
  })
}

function getRamUsage() {
  return 1 - osUtils.freememPercentage();
}

function getStorageData() {
  const stats = fs.statfsSync(process.platform === 'win32' ? 'C://' : '/');
  const total = stats.bsize * stats.blocks;
  const free = stats.bsize * stats.bfree;

  return {
    total: Math.floor(total / 1_000_000_000),
    usage: 1 - free / total,
  };
}