import { Directive, HostBinding, Input, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[btnColor]',
})
export class BtnColorDirective {
  @Input() btnColor!: string;


  @HostBinding('style.background-color')
  backgroundColor: string = `rgb(${this.btnColor})`;

  ngOnChanges(changes: SimpleChanges) {
    if (changes.btnColor) {
      this.backgroundColor = `rgb(${this.btnColor})`;
    }
  }
}