import { Component, OnInit } from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { ConfigService } from './config.service';

interface Setting {
  key: string;
  type: string;
  val: boolean;
  readable: string;
}

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss']
})
export class ConfigComponent implements OnInit {
  public isExpanded = false;
  public keys: Setting[] = [
    { key: "showMarkers", type: "boolean", val: false, readable: "Display individual markers" }
  ];

  constructor(private config: ConfigService) { }

  ngOnInit(): void {
    this.config.registerListener('configIsShown', (shown: boolean) => this.isExpanded = shown);
  }

  public toggleExpand() {
    this.config.setSetting('configIsShown', !this.isExpanded);
  }

  public changeBoolean(setting: Setting, event: MatSlideToggleChange) {
    this.config.setSetting(setting.key, event.checked);
  }
}
