import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import * as L from "leaflet";
import { DataService, Report, Airport } from '../data.service';
import "leaflet.markercluster";
import { ConfigService } from '../config/config.service';
import * as d3 from "d3";
import { Geometry, Feature, Point } from 'geojson';


export type GeoObj = Feature<Point | Geometry, Report>
export type ReportMarker = L.Marker<Report>;

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

  public layersControl: any;
  private airport_data: Airport[] = [];
  private icon_size_variable: number = 25;

  public markerClusterOptions: L.MarkerClusterGroupOptions = {
    iconCreateFunction: this.defineClusterIcon,
    // disableClusteringAtZoom: 9
  }
  public markerClusterGroup!: L.MarkerClusterGroup;
  public markerClusterData: L.Marker[] = [];

  public range = { min: 0, max: 100 };
  public gradientImg: string = "";

  private data: GeoObj[] = [];
  private legendCanvas = document.createElement('canvas');

  rmax = 30; //Maximum radius for cluster pies

  constructor(private service: DataService, public config: ConfigService) {
  }


  defineClusterIcon(cluster: L.MarkerCluster) {
    const children = cluster.getAllChildMarkers()
    const n = children.length //Get number of markers in cluster
    const strokeWidth = 1 //Set clusterpie stroke width
    const r = this.rmax - 2 * strokeWidth - (n < 10 ? 12 : n < 100 ? 8 : n < 1000 ? 4 : 0) //Calculate clusterpie radius...
    const iconDim = (r + strokeWidth) * 2 //...and divIcon dimensions (leaflet really want to know the size)


    const data: { [key: string]: any[] } = {};
    children.forEach((c: ReportMarker) => {
      const shape = c.feature!.properties.shape ?? {};
      if (!data[shape]) {
        data[shape] = []
      }
      data[shape].push(c)
    });


    //bake some svg markup
    const html = this.bakeThePie(data);
    debugger
    //Create a new divIcon and assign the svg markup to the html property
    return new L.DivIcon({
      html: `<span>This is a test marker</span>`,
      className: 'marker-cluster',
      iconSize: new L.Point(iconDim, iconDim)
    });
  }

  /*function that generates a svg markup for the pie chart*/
  bakeThePie(data: { [key: string]: any[] }) {
    const r = 28 //Default outer radius = 28px
    const strokeWidth = 1 //Default stroke is 1
    const origo = (r + strokeWidth) //Center coordinate

    //Create an svg element
    var svg = document.createElementNS("http://www.w3.org/1999/xhtml", 'svg');

    //Create the pie chart
    const mappedData = Object.keys(data).map((key) => ({ valueOf: () => data[key].length }));
    var pie = d3.pie().value(d => d.valueOf())
    var data_ready = pie(mappedData);

    // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
    d3.select(svg)
      .selectAll('path')
      .data(data_ready)
      .enter()
      .append('path')
      .attr('d', d3.arc().innerRadius(18).outerRadius(28) as any)
      .attr('fill', function (d) { return '' })
      .attr("stroke", "black")
      .style("stroke-width", "2px")

    //Return the svg-markup rather than the actual element
    return this.serializeXmlNode(svg);
  }


  serializeXmlNode(xmlNode: any) {
    if (typeof window.XMLSerializer != "undefined") {
      return (new window.XMLSerializer()).serializeToString(xmlNode);
    } else if (typeof xmlNode.xml != "undefined") {
      return xmlNode.xml;
    }
    return "";
  }




  ngAfterViewInit(): void {
    this.legendCanvas.width = 100;
    this.legendCanvas.height = 10;
  }

  markerClusterReady(group: L.MarkerClusterGroup) {
    this.markerClusterGroup = group;
  }

  async ngOnInit(): Promise<void> {
    this.airport_data = await this.service.getAirports();


    this.airport_overlay();
    this.layersControl = {
      overlays: {
        'airports': this.markerClusterGroup
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
    this.showHeatmap();
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
    // heatmapLayer.setData({ max: this.data.reduce((max, curr) => max > curr.duration ? curr.duration : max, 0), data: this.data });
    this.updateLegend(heatmapConfig.gradient);
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
    const markerOptions = {
      icon: L.icon({
        iconSize: [25, 41],
        iconAnchor: [13, 41],
        iconUrl: 'assets/marker-icon.png',
        shadowUrl: 'assets/marker-shadow.png'
      })
    };
    const layer = L.geoJSON({
      type: "FeatureCollection",
      features: this.data
    } as any, {
      pointToLayer: (geo: GeoObj, latlng) => {
        return L.marker(latlng, markerOptions).bindPopup(`${geo.properties.duration} Seconds – ${geo.properties.description} – ${geo.properties.date}`)
      }
    });

    this.markerClusterGroup.addLayer(layer);
    debugger
  }
}














