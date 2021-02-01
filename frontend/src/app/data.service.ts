import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { GeoObj } from './ufo-map/ufo-map.component';

export interface Report {
  latitude: number,
  longitude: number,
  duration: number,
  description: string,
  date: Date,
  shape: string,
}

export interface Airport {
  latitude: number,
  longitude: number,
  iata_code: string,
  name: string,
  elevation: number,
  country_code: string,
  type_size: string,
}


@Injectable({
  providedIn: 'root'
})
export class DataService {
  private data: GeoObj[] = [];
  private shapes: string[] = [];
  private airports: Airport[] = [];

  constructor(private http: HttpClient) { }

  async getShapes(options: { forceFetch?: boolean } = {}): Promise<string[]> {
    if (this.shapes.length > 0 && !options.forceFetch) {
      return this.shapes;
    }
    const shapes = await this.http.get<string[]>(environment.server + "shapes").toPromise();
    const shapeBlacklist = ["Unknown", "Other"];
    this.shapes = shapes.filter(s => !!s && !shapeBlacklist.includes(s));
    return this.shapes;
  }

  async getData(options: { params?: { [key: string]: string }, forceFetch?: boolean, aggregate?: boolean } = {}): Promise<GeoObj[]> {
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
    this.data = data;
    return this.data;
  }

  async getAirports(): Promise<Airport[]> {
    this.airports = await this.http.get<Airport[]>(environment.server + 'airports', { }).toPromise();
    return this.airports;
  }
}
