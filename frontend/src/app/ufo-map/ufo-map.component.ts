import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import * as L from "leaflet";
import { DataService, Report, Airport } from '../data.service';
import "leaflet.markercluster";
import { ConfigService } from '../config/config.service';
import * as d3 from "d3";
import { Geometry, Feature, Point } from 'geojson';
import { ScalePower } from 'd3';
import { isEqual } from 'underscore';

export type GeoObj = Feature<Point | Geometry, Report>
export type ReportMarker = L.Marker<Report>;
export type GeoObjAirport = Feature<Point | Geometry, Airport>
export enum AirportType {
  SmallAirport = 'small_airport',
  MediumAirport = 'medium_airport',
  Heliport = 'heliport',
  Balloonport = 'balloonport',
  SeaplaneBase = 'seaplane_base',
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
  public legend: { key: string, reports: Report[] }[] = [];
  public airportlegend: { type: AirportType, count: number }[] = [];

  public markerClusterOptions: L.MarkerClusterGroupOptions = {
    iconCreateFunction: (c) => this.defineClusterIcon(c),
    zoomToBoundsOnClick: false
  }
  public markerClusterGroup!: L.MarkerClusterGroup;
  public markerClusterData: L.Marker[] = [];

  public range = { min: 0, max: 100 };
  public gradientImg: string = "";

  private data: GeoObj[] = [];
  private sizeRange!: ScalePower<number, number, never>;
  maxClusterRadius = 30;

  constructor(public service: DataService, public config: ConfigService, private cdr: ChangeDetectorRef) {
  }

  async ngOnInit(): Promise<void> {
    this.airport_data = await this.service.getAirports({ params: { limit: 10000 } });
    this.data = await this.service.getData({ params: { limit: 10000 } });

    this.sizeRange = d3.scaleSqrt().domain([0, this.data.length]).range([16, 60]).clamp(true);

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
    const shape = this.config.getSetting<string[]>("displayShape");
    if (shape.length === 0) {
      this.data = [];
    }
    this.data = await this.service.getData({
      params: {
        fromYear: this.config.getSetting("startYear"),
        toYear: this.config.getSetting("stopYear"),
        shape: isEqual(shape, ['*']) ? undefined : shape.join(','),
        limit: 10000,
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
    }).sort((r1, r2) => r2.reports.length - r1.reports.length);

    const airports = Array.from(this.filterAirports(features).entries());
    this.airportlegend = airports.map(([type, rep]) => {
      return { type, count: rep.length }
    });

    this.reload();
  }

  /**
   * Somehow Angular struggles to detect changes to the legend
   */
  public async reload() {
    await Promise.resolve();
    this.cdr.detectChanges();
  }

  private registerPieOverlay() {
    const markerOptions = {
      icon: L.icon({
        iconSize: [25, 41],
        iconAnchor: [13, 41],
        iconUrl: 'assets/Icon/ufo.png',
        shadowUrl: 'assets/marker-shadow.png'
      })
    };
    const layer = L.geoJSON(
      this.data as any, {
      pointToLayer: (geo: GeoObj, latlng) => {
        return L.marker(latlng, markerOptions).bindPopup(`${geo.properties.duration} Seconds – ${geo.properties.shape}: ${geo.properties.description} – ${geo.properties.date}`)
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
      case AirportType.Balloonport:
        return '#a65628';
      case AirportType.SeaplaneBase:
        return '#ffff33';
      default:
        return '#984ea3';
    }
  }

  public getAirportIconByType(airport: AirportType) {
    switch (airport) {
      case AirportType.SmallAirport:
        return 'assets/Icon/icon_small_airport.png';
      case AirportType.MediumAirport:
        return 'assets/Icon/icon_medium_airport.png';
      case AirportType.Balloonport:
        return 'assets/Icon/icon_balloonport.png';
      case AirportType.SeaplaneBase:
        return 'assets/Icon/icon_seaplane_base.png';
      case AirportType.Heliport:
        return 'assets/Icon/icon_heliport.png';
      default:
        return 'assets/Icon/icon_large_airport.png';
    }
  }

  private add_airport_symbols() {
    const airport_layer = L.geoJSON(
      this.airport_data as any, {
      pointToLayer: (geo: GeoObjAirport, latlng) => {
        const type = geo.properties.type_size
        const icon = L.icon({
          iconSize: type === AirportType.Heliport ? [25, 41] : [25, 33],
          iconAnchor: [0, 0],
          iconUrl: this.getAirportIconByType(type)
        });
        return L.marker(latlng, { icon }).bindPopup(`${geo.properties.name} - ${geo.properties.country_code}`)
      }
    });
    return airport_layer;
  }

  public trackShape(_index: number, item: { key: string, reports: Report[] }) {
    return item.reports[0].id;
  }

  public closeLegend() {
    this.legend = [];
    this.airportlegend = [];
    this.reload();
  }
}
