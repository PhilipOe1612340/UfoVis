import { Component, OnInit } from '@angular/core';
import { MatRadioChange } from '@angular/material/radio';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { DataService } from '../data.service';
import { ConfigService, ConfigSetting } from './config.service';

interface Setting<T = any> {
  key: ConfigSetting;
  type: string;
  val: T;
  readable: string;
  options?: any[];
}

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss']
})
export class ConfigComponent implements OnInit {
  public isExpanded = false;
  public keys: Setting[] = [];
  public all = true;

  constructor(private config: ConfigService, private service: DataService) {
  }

  async ngOnInit() {
    const config: Setting[] = [
      { key: "showAirportData", type: "boolean", val: true, readable: "Display airport data" },
      { key: "sortPieCharts", type: "boolean", val: false, readable: "Keep pie chart order constant" },
    ];
    const shapes = await this.service.getShapes();
    const shapeConfig: Setting<string> = {
      key: "displayShape",
      type: "radio",
      val: "*",
      options: shapes.map(option => ({ option, color: this.service.colorScale(option).slice(4, -1), selected: true })),
      readable: "Display only specified shape:"
    };
    this.keys.push(...config, shapeConfig);
    this.config.registerListener('configIsShown', (shown: boolean) => this.isExpanded = shown);
  }

  public toggleExpand() {
    this.config.setSetting('configIsShown', !this.isExpanded);
    this.keys.forEach(k => {
      k.val = this.config.getSetting(k.key);
    })
  }

  public changeBoolean(setting: Setting, event: MatSlideToggleChange) {
    this.config.setSetting(setting.key, event.checked);
  }

  public changeRadio(setting: Setting<string>, button: string, event: MatSlideToggleChange) {
    const btn = this.keys[2].options?.find(b => b.option === button);
    if (btn) {
      btn.selected = event.checked;
    }

    const allShapesSelected: boolean = this.keys[2].options?.every(o => o.selected) as boolean;
    let keys;
    if (allShapesSelected) {
      keys = ['*'];
    } else {
      keys = this.keys[2].options?.filter(o => o.selected).map(o => o.option);
    }
    this.all = allShapesSelected;

    this.config.setSetting(setting.key, keys);
  }

  public toggleAll(event: MatSlideToggleChange) {
    this.config.setSetting('displayShape', event.checked ? ['*'] : []);
    this.keys[2].options?.forEach(o => o.selected = event.checked);
  }

  public getKey(_i: number, setting: Setting) {
    return setting.key;
  }
}
