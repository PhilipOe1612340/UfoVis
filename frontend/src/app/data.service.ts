import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { interpolateSpectral, quantize, scaleOrdinal, ScaleOrdinal } from 'd3';
import { environment } from 'src/environments/environment';
import { AirportType, GeoObj, GeoObjAirport } from './ufo-map/ufo-map.component';

export interface Report {
  latitude: number,
  longitude: number,
  duration: string,
  description: string,
  date: Date,
  shape: string,
  id: number
}

export interface Airport {
  latitude: number,
  longitude: number,
  iata_code: string,
  name: string,
  elevation: number,
  country_code: string,
  type_size: AirportType,
}


@Injectable({
  providedIn: 'root'
})
export class DataService {
  private data: GeoObj[] = [];
  private shapes: string[] = [];
  private airport_data: GeoObjAirport[] = [];
  public colorScale!: ScaleOrdinal<string, string, never>;

  constructor(private http: HttpClient) { }

  async getShapes(options: { forceFetch?: boolean } = {}): Promise<string[]> {
    if (this.shapes.length > 0 && !options.forceFetch) {
      return this.shapes;
    }
    const shapes = await this.http.get<string[]>(environment.server + "shapes").toPromise();
    const shapeBlacklist = ["Unknown", "Other"];
    this.shapes = shapes.filter(s => !!s && !shapeBlacklist.includes(s));

    this.colorScale = scaleOrdinal()
      .domain(shapes)
      .range(quantize(t => interpolateSpectral(t), shapes.length).reverse()) as ScaleOrdinal<string, string, never>

    return this.shapes;
  }


  async getData(options: { params?: { [key: string]: string | number | undefined }, forceFetch?: boolean } = {}): Promise<GeoObj[]> {
    if (this.data.length > 0 && !options.forceFetch) {
      return this.data;
    }

    let params = new HttpParams();
    if (options.params) {
      params = Object.keys(options.params)
        .filter(key => options.params![key])
        .reduce((p, key) => p.append(key, options.params![key] as any), params);
    }

    const data = await this.http.get<GeoObj[]>(environment.server + 'reports', { params }).toPromise();
    return this.data = data;
  }

  async getAirports(options: { params?: { [key: string]: string | number | undefined }} = {}): Promise<GeoObjAirport[]> {
    let params = new HttpParams();
    if (options.params) {
      params = Object.keys(options.params)
        .filter(key => options.params![key])
        .reduce((p, key) => p.append(key, options.params![key] as any), params);
    }

    this.airport_data = await this.http.get<GeoObjAirport[]>(environment.server + 'airports', { params }).toPromise();
    return this.airport_data;
  }
}
