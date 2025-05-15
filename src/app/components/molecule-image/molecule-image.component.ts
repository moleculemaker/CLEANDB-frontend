import { Component, Input, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { SafePipe } from '../../pipes/safe.pipe';

@Component({
    selector: 'app-molecule-image',
    templateUrl: './molecule-image.component.html',
    styleUrls: ['./molecule-image.component.scss'],
    standalone: true,
    imports: [NgIf, SafePipe]
})
export class MoleculeImageComponent implements OnInit {
  @Input() molecule: string;
  @Input() width: number = 300;
  @Input() height: number = 150;

  image = ''
  placeholderClassName = ''

  ngOnInit(): void {
    const element = document.createElement('div');
    element.innerHTML = this.molecule ?? '';
    element.querySelector('svg')?.setAttribute('width', `${this.width}px`);
    element.querySelector('svg')?.setAttribute('height', `${this.height}px`);
    element.querySelector('svg rect')?.setAttribute('style', 'opacity:1.0;fill:#FFFFFF00;stroke:none');

    this.image = element.innerHTML;
    this.placeholderClassName = `w-[${this.width}px] h-[${this.height}px]`
  }
}
