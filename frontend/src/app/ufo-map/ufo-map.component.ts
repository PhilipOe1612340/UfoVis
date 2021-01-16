import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import * as L from "leaflet";
import { DataService, Report } from '../data.service';
import 'leaflet.heat/dist/leaflet-heat.js'
import { ConfigService } from '../config/config.service';

@Component({
  selector: 'ufo-map',
  templateUrl: './ufo-map.component.html',
  styleUrls: ['./ufo-map.component.scss']
})
export class UfoMapComponent implements OnInit, AfterViewInit {
  public options = {
    layers: [
      L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '...' })
    ],
    zoom: 3,
    center: L.latLng(30, 0)
  };

  public layers: L.Marker[] = [];
  public range = { min: 0, max: 100 };
  public gradientImg: string = "";

  private data: Report[] = [];
  private legendCanvas = document.createElement('canvas');

  constructor(private service: DataService, public config: ConfigService) { }
  ngAfterViewInit(): void {
    this.legendCanvas.width = 100;
    this.legendCanvas.height = 10;
  }

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

    /**
     * Gradients from https://docs.microsoft.com/en-us/bingmaps/v8-web-control/map-control-concepts/heat-map-module-examples/heat-map-color-gradients
     */

    const aqua = {
      '0': 'Black',
      '0.5': 'Aqua',
      '1': 'White'
    }
    const blue_red = {
      '0.0': 'blue',
      '1': 'red'
    }
    const deepSea = {
      '0.0': 'rgb(0, 0, 0)',
      '0.6': 'rgb(24, 53, 103)',
      '0.75': 'rgb(46, 100, 158)',
      '0.9': 'rgb(23, 173, 203)',
      '1.0': 'rgb(0, 250, 250)'
    }
    const colorSpectrum = {
      '0': 'Navy',
      '0.25': 'Blue',
      '0.5': 'Green',
      '0.75': 'Yellow',
      '1': 'Red'
    }
    const incandescent = {
      '0': 'Black',
      '0.4': 'Purple',
      '0.6': 'Red',
      '0.8': 'Yellow',
      '1': 'White'
    }
    const sunrise = {
      '0': 'Red',
      '0.66': 'Yellow',
      '1': 'White'
    }
    const visibleSpectrum = {
      '0.00': 'rgb(255,0,255)',
      '0.25': 'rgb(0,0,255)',
      '0.50': 'rgb(0,255,0)',
      '0.75': 'rgb(255,255,0)',
      '1.00': 'rgb(255,0,0)'
    }

    // maybe make gradient configurable
    const config = {
      radius: 30,
      blur: 30,
      gradient: incandescent
    };

    // @ts-ignore
    this.layers = [L.heatLayer(this.data.map((report) => [report.latitude, report.longitude, report.duration]), config)];
    this.range = {
      min: this.data.reduce((min, curr) => curr.duration && curr.duration < min ? curr.duration : min, Infinity),
      max: this.data.reduce((max, curr) => curr.duration > max ? curr.duration : max, -Infinity) / 3600
    }
    this.updateLegend(config.gradient);
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

  private updateLegend(gradient: { [key: string]: string }) {
    const legendCtx = this.legendCanvas.getContext('2d')!;

    // regenerate gradient image
    const canvasGradient = legendCtx.createLinearGradient(0, 0, 100, 1);
    for (const key in gradient) {
      canvasGradient.addColorStop(parseFloat(key), gradient[key]);
    }
    legendCtx.fillStyle = canvasGradient;
    legendCtx.fillRect(0, 0, 100, 10);
    this.gradientImg = this.legendCanvas.toDataURL();
  }
}














