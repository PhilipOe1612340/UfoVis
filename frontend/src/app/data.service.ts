import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

export interface Report {
  latitude: number,
  longitude: number,
  duration: number,
  description: string,
  date: Date,
}


@Injectable({
  providedIn: 'root'
})
export class DataService {
  private data: Report[] = [];

  constructor(private http: HttpClient) { }

  async getData(options: { params?: { [key: string]: string }, forceFetch?: boolean } = {}) {
    if (this.data.length > 0 && !options.forceFetch) {
      return this.data;
    }

    let params = new HttpParams();
    if (options.params) {
      params = Object.keys(options.params).reduce((p, key) => p.append(key, options.params![key] as any), params);
    }

    this.data = await this.http.get<Report[]>(environment.server + 'reports', { params: params }).toPromise();
    return this.data;
  }
}
