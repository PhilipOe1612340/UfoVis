import { Component, Input, OnInit } from '@angular/core';
import { Report } from '../data.service';

@Component({
  selector: 'ufo-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.scss']
})
export class ReportComponent implements OnInit {
  @Input() data!: Report;

  constructor() { }

  ngOnInit(): void {
  }
  public format(reportDate: Date) {
    const date = new Date(reportDate);
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).format(date);
  }
}
