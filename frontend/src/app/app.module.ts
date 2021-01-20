import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { UfoMapComponent } from './ufo-map/ufo-map.component';
import { HttpClientModule } from '@angular/common/http';
import { ConfigComponent } from './config/config.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TimeSliderComponent } from './time-slider/time-slider.component';

// Material Component Modules
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgxSliderModule } from '@angular-slider/ngx-slider';

@NgModule({
  declarations: [
    AppComponent,
    UfoMapComponent,
    ConfigComponent,
    TimeSliderComponent
  ],
  imports: [
    BrowserModule,
    LeafletModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatSlideToggleModule,
    NgxSliderModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
