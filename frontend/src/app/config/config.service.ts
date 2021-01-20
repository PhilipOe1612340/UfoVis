import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly config: { [key: string]: any } = { showMarkers: false, configIsShown: false, startYear: 1980, stopYear: 2021 };
  private subscribers: { type: string, fn: (newVal: any) => void }[] = [];

  constructor() { }

  setSetting(key: string, value: any, force = false): boolean {
    if (this.config[key] === value && !force) { return false; }
    this.config[key] = value;
    this.subscribers.filter(s => s.type === key).forEach(s => s.fn(value));
    return true;
  }

  getSetting(key: string) {
    return this.config[key];
  }

  registerListener(key: string, fn: (newVal: any) => void, runOnRegister = true) {
    this.subscribers.push({ type: key, fn });
    if (runOnRegister) {
      fn(this.getSetting(key));
    }
  }

}
