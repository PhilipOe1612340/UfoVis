import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import * as L from "leaflet";
import { DataService, Report, Airport } from '../data.service';
import 'leaflet.heat/dist/leaflet-heat.js';
import 'leaflet.markercluster/dist/leaflet.markercluster.js';
import { ConfigService } from '../config/config.service';

declare var HeatmapOverlay: any;

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

export interface Coordinate {
  x: number;
  y: number;
  value: number;
}

@Component({
  selector: 'ufo-map',
  templateUrl: './ufo-map.component.html',
  styleUrls: ['./ufo-map.component.scss']
})
export class UfoMapComponent implements OnInit, AfterViewInit {

  public options = {
    layers: [
      L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '...',
        detectRetina: true
      })
    ],
    zoom: 3,
    center: L.latLng(30, 0)
  };

  public layers: L.Marker[] = [];

  public map: any;
  public layersControl: any;
  private airport_layer_group = L.markerClusterGroup();
  private airport_data: Airport[] = [];
  public icon_size_variable: number = 25;

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
    this.airport_data = await this.service.getAirports();
    this.airport_overlay();
    this.layersControl = {
      overlays: {
        "airports": this.airport_layer_group
      }
    };
    this.config.registerListener("showMarkers", () => this.repaint(), false);
    this.config.registerListener("startYear", () => this.repaint(true), false);
    this.config.registerListener("stopYear", () => this.repaint(true), false);
    this.config.registerListener("displayShape", () => this.repaint(true), false);
    this.config.registerListener("aggregate", () => this.repaint(true), false);
    this.repaint();
  }

  private async repaint(changed = false) {
    const show = this.config.getSetting('showMarkers');
    const shape = this.config.getSetting("displayShape");
    const aggregate = this.config.getSetting("aggregate");

    this.data = await this.service.getData({
      params: {
        fromYear: this.config.getSetting("startYear"),
        toYear: this.config.getSetting("stopYear"),
        shape: shape === "*" ? undefined : shape,
        limit: show ? '1000' : '10000',
      }, forceFetch: changed, aggregate
    })
    if (show) {
      this.showIcons();
    } else {
      this.showHeatmap();
    }
  }

  public showHeatmap() {
    // maybe make gradient configurable
    const heatmapConfig = {
      radius: 26,
      maxOpacity: 0.8,
      minOpacity: .1,
      blur: 0.9,
      useLocalExtrema: true,
      latField: 'latitude',
      lngField: 'longitude',
      valueField: 'duration',
      gradient: incandescent,
      onExtremaChange:
        (range: { min: number, max: number, gradient: { [key: string]: string } }) => {
          this.range = range;
        },
    };

    // @ts-ignore
    const heatmapLayer = new HeatmapOverlay(heatmapConfig);
    this.layers = [heatmapLayer];
    heatmapLayer.setData({ max: this.data.reduce((max, curr) => max > curr.duration ? curr.duration : max, 0), data: this.data });
    this.updateLegend(heatmapConfig.gradient);
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

  public get showLegend() {
    return !this.config.getSetting('showMarkers') || !this.config.getSetting('aggregate');
  }

  private airport_overlay() {
    const helipad_icon_options = {
      icon: L.icon({
        iconSize: [this.icon_size_variable, this.icon_size_variable],
        iconAnchor: [0, 0],
        iconUrl: 'assets/Icon/helipad_icon.png',
        // <div>Icons made by <a href="https://www.flaticon.com/authors/dinosoftlabs" title="DinosoftLabs">DinosoftLabs</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
      })
    };
    const airport_icon_options = {
      icon: L.icon({
        iconSize: [this.icon_size_variable, this.icon_size_variable],
        iconAnchor: [0, 0],
        iconUrl: 'assets/Icon/airport_icon.png',
        // <div>Icons made by <a href="https://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
      })
    };
    const balloon_icon_options = {
      icon: L.icon({
        iconSize: [this.icon_size_variable, this.icon_size_variable],
        iconAnchor: [0, 0],
        iconUrl: 'assets/Icon/balloon_icon.png',
        // <div>Icons made by <a href="https://www.flaticon.com/authors/icongeek26" title="Icongeek26">Icongeek26</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
      })
    };
    const seaplane_icon_options = {
      icon: L.icon({
        iconSize: [this.icon_size_variable, this.icon_size_variable],
        iconAnchor: [0, 0],
        iconUrl: 'assets/Icon/seaplane_icon.png',
        // <div>Icons made by <a href="https://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
      })
    };
    
    this.airport_data.slice(0, 1000).map((airport) => {
      let type;
      switch(airport.type_size) {
        case 'seaplane_base':
          type = seaplane_icon_options;
          break;
        case 'heliport':
          type = helipad_icon_options;
          break;
        case 'ballonport':
          type = balloon_icon_options;
          break;
        default:
          type = airport_icon_options;
          break;
      }
      this.airport_layer_group.addLayer(L.marker([airport.latitude, airport.longitude], type).bindPopup(`${airport.name} – ${airport.country_code}`));
    });
  }
}














