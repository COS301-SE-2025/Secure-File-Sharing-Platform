import path from 'path';
import { fileURLToPath } from 'url';
import { app } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getPreloadPath() {
  return path.join(__dirname, 'preload.cjs');
}

export function getUIPath() {
  return path.join(app.getAppPath() + "/dist-react/index.html");
}

export function getAssetPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "src", "assets");
  } else {
    return path.join(__dirname, "..", "assets");
  }
}