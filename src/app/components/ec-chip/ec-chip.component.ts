import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CleanDbPredictedEC } from '~/app/models/CleanDbRecord';

@Component({
  selector: 'app-ec-chip',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './ec-chip.component.html',
  styleUrl: './ec-chip.component.scss'
})
export class EcChipComponent {
  @Input() ec: CleanDbPredictedEC;
}
