import { Component, OnInit } from '@angular/core';
import * as L from "leaflet";
import { DataService, Report } from '../data.service';
import 'leaflet.heat/dist/leaflet-heat.js'
import { ConfigService } from '../config/config.service';

@Component({
  selector: 'ufo-map',
  templateUrl: './ufo-map.component.html',
  styleUrls: ['./ufo-map.component.scss']
})
export class UfoMapComponent implements OnInit {
  public options = {
    layers: [
      L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '...' })
    ],
    zoom: 3,
    center: L.latLng(30, 0)
  };
  public layers: L.Marker[] = [];
  private data: Report[] = [];

  constructor(private service: DataService, private config: ConfigService) { }

  async ngOnInit(): Promise<void> {
    this.data = await this.service.getData();
    
    this.config.registerListener('showMarkers', (show: boolean) => {
      if (show) {
        this.showIcons();
      } else {
        this.showHeatmap();
      }
    });
  }

  public showHeatmap() {
    // @ts-ignore
    this.layers = [L.heatLayer(this.data.map((report) => [report.latitude, report.longitude, report.duration]))];
  }

  public showIcons() {
    this.layers = [];
    const markerOptions = {
      icon: L.icon({
        iconSize: [25, 41],
        iconAnchor: [13, 41],
        iconUrl: 'assets/marker-icon.png',
        shadowUrl: 'assets/marker-shadow.png'
      })
    };
    this.layers = this.data.slice(0, 1000).map((report) => L.marker([report.latitude, report.longitude], markerOptions).bindPopup(`${report.duration} Seconds – ${report.description} – ${report.date}`));
  }

}
