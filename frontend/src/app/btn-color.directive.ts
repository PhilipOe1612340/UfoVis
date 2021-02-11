import { Directive, HostBinding, Input, SimpleChanges } from '@angular/core';

@Directive({
  selector: '[btnColor]',
})
export class BtnColorDirective {
  @Input() btnColor!: string;


  @HostBinding('style.background-color')
  backgroundColor: string = this.format(this.btnColor);

  ngOnChanges(changes: SimpleChanges) {
    if (changes.btnColor) {
      this.backgroundColor = this.format(this.btnColor);
    }
  }

  private format(col: string = ""){
    return col.includes('rgb') ? col : `rgb(${col})`
  }
}