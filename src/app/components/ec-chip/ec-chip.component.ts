import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CleanDbPredictedEC } from '~/app/models/CleanDbRecord';
import { EcArrowComponent } from '../ec-arrow/ec-arrow.component';

@Component({
  selector: 'app-ec-chip',
  standalone: true,
  imports: [
    CommonModule,
    EcArrowComponent,
  ],
  templateUrl: './ec-chip.component.html',
  styleUrl: './ec-chip.component.scss'
})
export class EcChipComponent {
  @Input() ec: CleanDbPredictedEC;
}
