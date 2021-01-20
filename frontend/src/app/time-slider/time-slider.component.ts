import { Options as SliderOptions } from '@angular-slider/ngx-slider';
import { Component } from '@angular/core';
import { ConfigService } from '../config/config.service';

@Component({
  selector: 'time-slider',
  templateUrl: './time-slider.component.html',
  styleUrls: ['./time-slider.component.scss']
})
export class TimeSliderComponent{
  lowValue: number = 0;
  highValue: number;

  public options: SliderOptions;

  constructor(private config: ConfigService) {
    this.options = {
      floor: config.getSetting("startYear"),
      ceil: config.getSetting("stopYear"),
      hideLimitLabels: true,
    };

    this.highValue = this.options.ceil!;
  }

  public change() {
    this.config.setSetting("startYear", this.lowValue);
    this.config.setSetting("stopYear", this.highValue);
  }

}
