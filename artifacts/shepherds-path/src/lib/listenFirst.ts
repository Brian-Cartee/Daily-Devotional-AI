const KEY = "sp_listen_first";

export function getListenFirstPreference(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setListenFirstPreference(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* noop */
  }
}
