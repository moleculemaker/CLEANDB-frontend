import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-score-chip',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './score-chip.component.html',
  styleUrl: './score-chip.component.scss'
})
export class ScoreChipComponent implements OnChanges {
  @Input() score: number;

  score$ = new BehaviorSubject<number>(0);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['score']) {
      this.score$.next(changes['score'].currentValue);
    }
  }
}
