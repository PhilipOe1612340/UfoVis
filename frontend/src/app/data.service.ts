import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

export interface Report {
  latitude: number,
  longitude: number,
  duration: number,
  description: string,
  date: Date,
  shape: string,
}


@Injectable({
  providedIn: 'root'
})
export class DataService {
  private data: Report[] = [];
  private shapes: string[] = [];

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

  async getData(options: { params?: { [key: string]: string }, forceFetch?: boolean, aggregate?: boolean } = {}): Promise<Report[]> {
    if (this.data.length > 0 && !options.forceFetch) {
      return this.data;
    }

    let params = new HttpParams();
    if (options.params) {
      params = Object.keys(options.params)
        .filter(key => options.params![key])
        .reduce((p, key) => p.append(key, options.params![key] as any), params);
    }

    const data = await this.http.get<Report[]>(environment.server + 'reports', { params }).toPromise();

    if (options.aggregate) {
      const points: Map<string, number> = new Map();
      const hash = (d: Report) => d.longitude.toFixed(2) + d.longitude.toFixed(2);
      console.time('convert')
      data.forEach(d => {
        const h = hash(d);
        points.set(h, (points.get(h) ?? 0) + 1);
      });
      data.forEach(d => {
        const h = hash(d);
        d.duration = points.get(h) ?? 0;
        points.set(h, 0);
      })
      console.timeEnd('convert');
    }

    this.data = data.filter(d => d.duration > 0);
    return this.data;
  }
}
