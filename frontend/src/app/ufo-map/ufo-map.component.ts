import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import * as L from "leaflet";
import { DataService, Report, Airport } from '../data.service';
import "leaflet.markercluster";
import { ConfigService } from '../config/config.service';
import * as d3 from "d3";
import { Geometry, Feature, Point } from 'geojson';
import { ScaleLinear, ScaleOrdinal } from 'd3';


export type GeoObj = Feature<Point | Geometry, Report>
export type ReportMarker = L.Marker<Report>;

export type GeoObjAirport = Feature<Point | Geometry, Airport>

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
export class UfoMapComponent implements OnInit {

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
  private airport_data: GeoObjAirport[] = [];
  private icon_size_variable: number = 25;

  public markerClusterOptions: L.MarkerClusterGroupOptions = {
    iconCreateFunction: (c) => this.defineClusterIcon(c),
    // disableClusteringAtZoom: 9
  }
  public markerClusterGroup!: L.MarkerClusterGroup;
  public markerClusterData: L.Marker[] = [];

  public range = { min: 0, max: 100 };
  public gradientImg: string = "";

  private data: GeoObj[] = [];
  private legendCanvas = document.createElement('canvas');
  private sizeRange!: ScaleLinear<number, number, never>;
  maxClusterRadius = 30;

  private boolean_test_changer = true;

  constructor(private service: DataService, public config: ConfigService) {
  }

  async ngOnInit(): Promise<void> {
    this.airport_data = await this.service.getAirports();
    this.data = await this.service.getData();

    const map = this.filterShapes(this.data)
    const shapes = Array.from(map.keys());

    const max = Math.max(...Array.from(map.values()).map(val => val.length));
    this.sizeRange = d3.scaleLinear().domain([0, max]).range([22, 40]).clamp(true);

    this.registerPieOverlay();

    this.config.registerListener("showMarkers", () => this.repaint(), false);
    this.config.registerListener("startYear", () => this.repaint(true), false);
    this.config.registerListener("stopYear", () => this.repaint(true), false);
    this.config.registerListener("displayShape", () => this.repaint(true), false);
    this.repaint();

    this.legendCanvas.width = 100;
    this.legendCanvas.height = 10;
  }

  defineClusterIcon(cluster: L.MarkerCluster) {
    const children = cluster.getAllChildMarkers()
    const strokeWidth = 1.5;
    const radius = this.sizeRange(children.length);
    const iconDim = (radius + strokeWidth) * 2

    const airport_types = this.filterAirports(children.map((c: any) => ({ properties: c.feature!.geometry.properties } as GeoObjAirport)));

    const shapes = this.filterShapes(children.map((c: any) => ({ properties: c.feature!.geometry.properties } as GeoObj)))
    const html = this.createPieChartMarkup(shapes, airport_types, radius, strokeWidth);

    return new L.DivIcon({
      html,
      className: 'marker-cluster',
      iconSize: new L.Point(iconDim, iconDim)
    });
  }

  createPieChartMarkup(data: Map<string, any[]>, airport_map: Map<string, any[]>, radius: number, strokeWidth: number) {
    const mappedData = Array.from(data.entries()).map(([key, value]) => ({ value: value.length, key }))
    const mappedDataAir = Array.from(airport_map.entries()).map(([key, value]) => ({ value: value.length, key }))

    const svg = document.createElementNS("http://www.w3.org/1999/xhtml", 'svg');
    const origin = radius + strokeWidth;
    const pie = d3.pie<any, { value: number, key: string }>().value((d: any) => d.value)//.sort((a, b) => a.key.localeCompare(b.key))
    const arc = d3.arc()
      // .innerRadius(0)
      .innerRadius(radius / 2)
      .outerRadius(radius)

    const g = d3.select(svg)
      .selectAll('path')
      .data(pie(mappedData))
      .enter()
      .append('g');

    g.append('path')
      .attr('d', arc as any)
      .attr('fill', d => this.service.colorScale(d.data.key))
      .attr("stroke", "black")
      .style("stroke-width", strokeWidth + "px")
      .attr('transform', 'translate(' + origin + ',' + origin + ')');

    if (mappedDataAir.length !== 0) {
        //remove if-else and choose whether to show circle or piechart, remove variable boolean_test_changer
        //number of airports
        if (this.boolean_test_changer) {
          let number = 0;
          mappedDataAir.forEach((ele) => {
            number += ele.value;
          });

          g.append('circle')
            .attr('cx', origin)
            .attr('cy', origin)
            .attr('r', (radius - strokeWidth) / 2)
            .style('fill', '#d9cafe');

          g.append('text')
            .attr('x', origin)
            .attr('y', origin - 5) // text 10 pixel, align in middle: / 2 => 10 / 2 = 5
            .attr('text-anchor', 'middle')
            .attr('dy', '10px')
            .text(number);
          this.boolean_test_changer = false;
        } else {
          //piechart
          const arc2 = d3.arc()
            .innerRadius(0)
            .outerRadius(radius / 2)

          const g_inner = g.append('g')
            .selectAll('path')
            .data(pie(mappedDataAir))
            .enter();
          g_inner.append('path')
            .attr('d', arc2 as any)
            .attr('fill', d => this.airport_pie_color(d.data.key))
            .attr("stroke", "black")
            .style("stroke-width", strokeWidth + "px")
            .attr('transform', 'translate(' + origin + ',' + origin + ')');
          this.boolean_test_changer = true;
        }
    }

    //Return the svg-markup rather than the actual element
    return this.serializeXmlNode(svg);
  }

  /**
   * Transform native HTML Element to a HTML string
   * @param xmlNode 
   */
  serializeXmlNode(xmlNode: any) {
    if (typeof window.XMLSerializer != "undefined") {
      return (new window.XMLSerializer()).serializeToString(xmlNode);
    } else if (typeof xmlNode.xml != "undefined") {
      return xmlNode.xml;
    }
    return "";
  }


  markerClusterReady(group: L.MarkerClusterGroup) {
    this.markerClusterGroup = group;
  }

  private filterShapes(data: GeoObj[]) {
    const map = new Map<string, any[]>();
    data.forEach((c) => {
      if(c.properties.shape !== undefined){
        const shape = c.properties.shape ?? 'Unknown';
        map.set(shape, (map.get(shape) ?? []).concat([c]));
      }
    });
    return map;
  }

  private filterAirports(data: GeoObjAirport[]) {
    const map = new Map<string, any[]>();
    data.forEach((c) => {
      if(c.properties.type_size !== undefined) {
        const type = c.properties.type_size ?? 'Unknown';
        map.set(type, (map.get(type) ?? []).concat([c]));
      }
    });
    return map;
  }

  private async repaint(changed = false) {
    const show = this.config.getSetting('showMarkers');
    const shape = this.config.getSetting("displayShape");

    this.data = await this.service.getData({
      params: {
        fromYear: this.config.getSetting("startYear"),
        toYear: this.config.getSetting("stopYear"),
        shape: shape === "*" ? undefined : shape,
        limit: show ? '1000' : '10000',
      }, forceFetch: changed
    });

    this.registerPieOverlay();
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
    return !this.config.getSetting('showMarkers');
  }

  private registerPieOverlay() {
    const markerOptions = {
      icon: L.icon({
        iconSize: [25, 41],
        iconAnchor: [13, 41],
        iconUrl: 'assets/marker-icon.png',
        shadowUrl: 'assets/marker-shadow.png'
      })
    };
    const layer = L.geoJSON(
      this.data as any, {
      pointToLayer: (geo: GeoObj, latlng) => {
        return L.marker(latlng, markerOptions).bindPopup(`${geo.properties.duration} Seconds – ${geo.properties.description} – ${geo.properties.date}`)
      }
    });

    const airport_layer = L.geoJSON(
      this.airport_data as any, {
      pointToLayer: (geo: GeoObjAirport, latlng) => {
        return L.marker(latlng, markerOptions).bindPopup(`${geo.properties.country_code} – ${geo.properties.name}`)
      }
    });


    this.markerClusterGroup.clearLayers();
    this.markerClusterGroup.addLayer(layer);
    this.markerClusterGroup.addLayer(airport_layer);

    this.layersControl = {
      overlays: {
        'reports': this.markerClusterGroup
      }
    };
  }

  private airport_pie_color(type: String) {
    switch (type) {
      case 'small_airport':
        return '#377eb8';
        break;
      case 'medium_airport':
        return '#4daf4a';
        break;
      case 'heliport':
        return '#ff7f00'
        break;
      case 'baloonport':
        return '#a65628';
        break;
      default:
        return '#984ea3';
        break;
    }
  }
}
