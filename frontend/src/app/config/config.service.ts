import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

const debug = !environment.production;

export type ConfigSetting = "showMarkers" | "configIsShown" | "startYear" | "stopYear" | "displayShape";
@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly config: { [key in ConfigSetting]: any } = { showMarkers: false, configIsShown: false, startYear: 2006, stopYear: 2021, displayShape: "*" };
  private subscribers: { type: string, fn: (newVal: any) => void }[] = [];

  constructor() { }

  setSetting(key: ConfigSetting, value: any, force = false): boolean {
    debug && console.log('change', key, 'from', this.config[key], 'to', value);
    if (this.config[key] === value && !force) { return false; }
    this.config[key] = value;
    this.subscribers.filter(s => s.type === key).forEach(s => s.fn(value));
    return true;
  }

  getSetting(key: ConfigSetting) {
    return this.config[key];
  }

  registerListener(key: ConfigSetting, fn: (newVal: any) => void, runOnRegister = true) {
    this.subscribers.push({ type: key, fn });
    if (runOnRegister) {
      fn(this.getSetting(key));
    }
  }

}
