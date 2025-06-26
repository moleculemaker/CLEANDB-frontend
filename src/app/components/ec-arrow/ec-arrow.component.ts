import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ec-arrow',
  standalone: true,
  imports: [],
  templateUrl: './ec-arrow.component.html',
  styleUrl: './ec-arrow.component.scss'
})
export class EcArrowComponent {
  @Input() score: number = 0;
}
