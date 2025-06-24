import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CleanDbService, EffectPredictionResult } from '~/app/services/clean-db.service';

export type HeatmapCellValue = any;

export type HeatmapInput = EffectPredictionResult;

export type Interactable = {
  id: string;
  column: number;
  row: number;
  value: string | HeatmapCellValue;
  color: string;
}

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.scss'
})
export class HeatmapComponent implements OnChanges {
  @Input() data: HeatmapInput;

  columnKeys: Interactable[];
  rowKeys: Interactable[];
  values: Interactable[][];

  constructor(
    private service: CleanDbService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && changes['data'].currentValue) {
      this.parseInput(changes['data'].currentValue);
    }
  }

  parseInput(data: HeatmapInput) {
    // validate data, data shape must be 2d rectangle
    // throw error if shape is invalid
    this.validateInput(data);

    const dataMin = Math.min(...data.values.flat());
    const dataMax = Math.max(...data.values.flat());

    // parse input data to x axis, y axis, and values
    this.rowKeys 
      = data.rowKeys.map((key, i) => this.createInteractable(key, i, -1, dataMin, dataMax));

    // add an empty cell for correct table format
    this.columnKeys
      = ['', ...data.colKeys].map((key, i) => this.createInteractable(key, -1, i, dataMin, dataMax));

    this.values
      = data.values.map((row, rowIdx) => 
          row.map((data, colIdx) => 
            this.createInteractable(data, rowIdx, colIdx, dataMin, dataMax)
          )
        );
  }

  validateInput(data: HeatmapInput): void {
    const { colKeys, rowKeys, values } = data;

    // values should contain rowKeys.length arrays
    if (values.length !== rowKeys.length) {
      throw new Error(`expect ${rowKeys.length} rows, get ${values.length} row`);
    }

    // each row should contain x columns
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      if (row.length !== colKeys.length) {
        throw new Error(`expect ${colKeys.length} columns, get ${values.length} columns at row idx ${i}`);
      }
    }
  }

  /* ------------------------------ Interactable ------------------------------ */
  createInteractable(
    value: HeatmapCellValue | string,
    row: number,
    column: number,
    min: number,
    max: number,
  ): Interactable {
    return {
      id: Math.random().toString(16).slice(2, 15),
      column,
      row,
      value,
      color: this.service.getColorFor(value, min, max)
    }
  }

  onMouseDownInteractable(x: Interactable, event: MouseEvent) {

  }

  onMouseEnterInteractable(x: Interactable, event: MouseEvent) {

  }

  onMouseLeaveInteractable(x: Interactable, event: MouseEvent) {

  }

  onMouseUpInteractable(x: Interactable, event: MouseEvent) {

  }
}
