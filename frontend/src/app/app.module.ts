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
import { MatRadioModule } from '@angular/material/radio';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { MatExpansionModule } from '@angular/material/expansion';

import { LeafletMarkerClusterModule } from '@asymmetrik/ngx-leaflet-markercluster';
import { ReportComponent } from './report/report.component';
import { BtnColorDirective } from './ufo-map/btn-color.directive';

@NgModule({
  declarations: [
    AppComponent,
    UfoMapComponent,
    ConfigComponent,
    TimeSliderComponent,
    ReportComponent,
    BtnColorDirective
  ],
  imports: [
    BrowserModule,
    LeafletModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MatSlideToggleModule,
    MatRadioModule,
    MatExpansionModule,
    NgxSliderModule,
    LeafletMarkerClusterModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
