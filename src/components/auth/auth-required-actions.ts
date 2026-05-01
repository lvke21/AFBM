"use client";

export const SAVEGAMES_LOGIN_EVENT = "afbm:open-savegames-login";

export function openSavegamesLogin() {
  window.dispatchEvent(new Event(SAVEGAMES_LOGIN_EVENT));
}
