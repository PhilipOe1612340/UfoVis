import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly config: { [key: string]: any } = { showMarkers: false, configIsShown: false };
  private subscribers: { type: string, fn: (newVal: any) => void }[] = [];

  constructor() { }

  setSetting(key: string, value: any) {
    this.config[key] = value;
    this.subscribers.filter(s => s.type === key).forEach(s => s.fn(value));
  }

  getSetting(key: string) {
    return this.config[key];
  }

  registerListener(key: string, fn: (newVal: any) => void) {
    this.subscribers.push({ type: key, fn });
    fn(this.getSetting(key));
  }

}
