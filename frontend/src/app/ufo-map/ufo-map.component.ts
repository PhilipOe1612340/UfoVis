import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import * as L from "leaflet";
import { DataService, Report, Airport } from '../data.service';
import "leaflet.markercluster";
import { ConfigService } from '../config/config.service';
import * as d3 from "d3";
import { Geometry, Feature, Point } from 'geojson';
import { ScaleLinear } from 'd3';


export type GeoObj = Feature<Point | Geometry, Report>
export type ReportMarker = L.Marker<Report>;
export type GeoObjAirport = Feature<Point | Geometry, Airport>
export enum AirportType {
  SmallAirport = 'small_airport',
  MediumAirport = 'medium_airport',
  Heliport = 'heliport',
  Baloonport = 'baloonport',
  SeaplaneBase = 'seaplane_base',
}

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
  public legend: {key: string, reports: Report[]}[] = [];

  public markerClusterOptions: L.MarkerClusterGroupOptions = {
    iconCreateFunction: (c) => this.defineClusterIcon(c),
    // disableClusteringAtZoom: 9
  }
  public markerClusterGroup!: L.MarkerClusterGroup;
  public markerClusterData: L.Marker[] = [];

  public range = { min: 0, max: 100 };
  public gradientImg: string = "";

  private data: GeoObj[] = [];
  private sizeRange!: ScaleLinear<number, number, never>;
  maxClusterRadius = 30;

  constructor(public service: DataService, public config: ConfigService, private cdr: ChangeDetectorRef) {
  }

  async ngOnInit(): Promise<void> {
    this.airport_data = await this.service.getAirports();
    this.data = await this.service.getData();

    const map = this.filterShapes(this.data)
    const shapes = Array.from(map.keys());
    const max = Math.max(...shapes.map(val => val.length));
    this.sizeRange = d3.scaleLinear().domain([0, max]).range([22, 30]).clamp(true);

    this.registerPieOverlay();

    this.config.registerListener("startYear", () => this.repaint(true), false);
    this.config.registerListener("stopYear", () => this.repaint(true), false);
    this.config.registerListener("displayShape", () => this.repaint(true), false);
    this.config.registerListener("showAirportData", () => this.repaint(false), false);
    this.config.registerListener("sortPieCharts", () => this.repaint(false), false);
    this.repaint();
  }

  defineClusterIcon(cluster: L.MarkerCluster) {
    const children = cluster.getAllChildMarkers()
    const strokeWidth = 1.5;
    const radius = this.sizeRange(children.length);
    const iconDim = (radius + strokeWidth) * 2;

    let airport_types: Map<AirportType, any[]> = new Map();
    if (this.config.getSetting("showAirportData")) {
      airport_types = this.filterAirports(children.map((c: any) => ({ properties: c.feature!.geometry.properties } as GeoObjAirport)));
    }

    const shapes = this.filterShapes(children.map((c: any) => ({ properties: c.feature!.geometry.properties } as GeoObj)))
    const html = this.createPieChartMarkup(shapes, airport_types, radius, strokeWidth);

    return new L.DivIcon({
      html,
      className: 'marker-cluster',
      iconSize: new L.Point(iconDim, iconDim)
    });
  }

  createPieChartMarkup(data: Map<string, any[]>, airport_map: Map<AirportType, any[]>, radius: number, strokeWidth: number) {
    const mappedData = Array.from(data.entries()).map(([key, value]) => ({ value: value.length, key }))
    const mappedDataAir = Array.from(airport_map.entries()).map(([key, value]) => ({ value: value.length, key }))

    const svg = document.createElementNS("http://www.w3.org/1999/xhtml", 'svg');

    if (mappedData.length === 0) {
      return this.serializeXmlNode(svg);
    }

    const origin = radius + strokeWidth;
    let pie = d3.pie<any, { value: number, key: string }>().value((d: any) => d.value);

    if (this.config.getSetting("sortPieCharts")) {
      pie = pie.sort((a, b) => a.key.localeCompare(b.key))
    }

    const arc = d3.arc()
      .innerRadius(radius / 2)
      .outerRadius(radius)

    d3.select(svg)
      .selectAll('path')
      .data(pie(mappedData))
      .enter()
      .append('path')
      .attr('d', arc as any)
      .attr('title', d => d.data.key)
      .attr('fill', d => this.service.colorScale(d.data.key))
      .attr("stroke", "black")
      .style("stroke-width", strokeWidth + "px")
      .attr('transform', 'translate(' + origin + ',' + origin + ')');

    if (mappedDataAir.length === 0) {
      return this.serializeXmlNode(svg);
    }

    const arc_inner = d3.arc()
      .innerRadius(0)
      .outerRadius(radius / 2);

    d3.select(svg).selectAll('path.inner')
      .data(pie(mappedDataAir))
      .enter().append('path')
      .attr("class", "inner")
      .attr('d', arc_inner as any)
      .attr('fill', d => this.airport_pie_color(d.data.key as AirportType))
      .attr("stroke", "black")
      .style("stroke-width", strokeWidth + "px")
      .attr('transform', 'translate(' + origin + ',' + origin + ')');

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
    group.on('clusterclick', (e) => this.showCluster(e));
  }

  private filterShapes(data: GeoObj[]) {
    const map = new Map<string, any[]>();
    data.forEach((c) => {
      if (c.properties.shape !== undefined) {
        const shape = c.properties.shape ?? 'Unknown';
        map.set(shape, (map.get(shape) ?? []).concat([c]));
      }
    });
    return map;
  }

  private filterAirports(data: GeoObjAirport[]) {
    const map = new Map<AirportType, any[]>();
    data.forEach((c) => {
      if (c.properties.type_size !== undefined) {
        const type = c.properties.type_size;
        map.set(type, (map.get(type) ?? []).concat([c]));
      }
    });
    return map;
  }

  private async repaint(changed = false) {
    const shape = this.config.getSetting("displayShape");

    this.data = await this.service.getData({
      params: {
        fromYear: this.config.getSetting("startYear"),
        toYear: this.config.getSetting("stopYear"),
        shape: shape === "*" ? undefined : shape,
        limit: '10000',
      }, forceFetch: changed
    });

    this.registerPieOverlay();
  }

  public showCluster(event: L.LeafletEvent) {
    const children = event.propagatedFrom.getAllChildMarkers();
    const features = children.map((c: any) => ({ properties: c.feature.geometry.properties }));
    const shapes = Array.from(this.filterShapes(features).entries());
    this.legend = shapes.map(([key, rep]) => {
      return { key, reports: rep.map((rep: any) => rep.properties) }
    });
    console.log(this.legend)
    this.cdr.detectChanges();
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

    const airport_layer = this.add_airport_symbols();

    this.markerClusterGroup.clearLayers();
    this.markerClusterGroup.addLayer(layer);
    this.markerClusterGroup.addLayer(airport_layer);

    this.layersControl = {
      overlays: {
        'reports': this.markerClusterGroup
      }
    };
  }

  private airport_pie_color(type: AirportType) {
    switch (type) {
      case AirportType.SmallAirport:
        return '#377eb8';
      case AirportType.MediumAirport:
        return '#4daf4a';
      case AirportType.Heliport:
        return '#ff7f00'
      case AirportType.Baloonport:
        return '#a65628';
      case AirportType.SeaplaneBase:
        return '#ffff33';
      default:
        return '#984ea3';
    }
  }

  private add_airport_symbols() {
    const helipad_icon_options = {
      icon: L.icon({
        iconSize: [25, 41],
        iconAnchor: [0, 0],
        iconUrl: 'assets/Icon/icon_heliport.png'
      })
    };
    const small_airport_icon_options = {
      icon: L.icon({
        iconSize: [25, 33],
        iconAnchor: [0, 0],
        iconUrl: 'assets/Icon/icon_small_airport.png'
      })
    };
    const medium_airport_icon_options = {
      icon: L.icon({
        iconSize: [25, 33],
        iconAnchor: [0, 0],
        iconUrl: 'assets/Icon/icon_medium_airport.png'
      })
    };
    const large_airport_icon_options = {
      icon: L.icon({
        iconSize: [25, 33],
        iconAnchor: [0, 0],
        iconUrl: 'assets/Icon/icon_large_airport.png'
      })
    };
    const balloon_icon_options = {
      icon: L.icon({
        iconSize: [25, 33],
        iconAnchor: [0, 0],
        iconUrl: 'assets/Icon/icon_balloonport.png'
      })
    };
    const seaplane_icon_options = {
      icon: L.icon({
        iconSize: [25, 33],
        iconAnchor: [0, 0],
        iconUrl: 'assets/Icon/icon_seaplane_base.png'
      })
    };

    const airport_layer = L.geoJSON(
      this.airport_data as any, {
      pointToLayer: (geo: GeoObjAirport, latlng) => {
        let icon;
        switch (geo.properties.type_size) {
          case AirportType.SmallAirport:
            icon = small_airport_icon_options;
            break;
          case AirportType.MediumAirport:
            icon = medium_airport_icon_options;
            break;
          case AirportType.Heliport:
            icon = helipad_icon_options;
            break;
          case AirportType.Baloonport:
            icon = balloon_icon_options;
            break;
          case AirportType.SeaplaneBase:
            icon = seaplane_icon_options;
            break;
          default:
            icon = large_airport_icon_options;
            break;
        }
        return L.marker(latlng, icon).bindPopup(`${geo.properties.name} - ${geo.properties.country_code}`)
      }
    });
    return airport_layer;
  }

  public trackShape(_index: number, item: {key: string, reports: Report[]}) {
    return item.reports[0].id;
  }
}
