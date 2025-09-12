//util.js

import { pathToFileURL } from "url";
import { getUIPath } from "./pathResolver.js";

export function isDev() {
  return process.env.NODE_ENV === 'development';
}

export function validateEventFrame(frame) {
  console.log(frame.url);
  if (isDev() && new URL(frame.url).host === 'localhost:5123') {
    return;
  }

  if (frame.url !== pathToFileURL(getUIPath()).toString()) {
    throw new Error("Malicious event");
  }
}