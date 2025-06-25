import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, combineLatestAll, combineLatestWith, filter, Subscription, tap } from 'rxjs';
import { CleanDbService, EffectPredictionResult } from '~/app/services/clean-db.service';

export type HeatmapCellValue = any;
export type HeatmapCellLocation = [number, number]
export type HeatmapCellLocations = HeatmapCellLocation[]
export type HeatmapInput = EffectPredictionResult;
export enum HeatmapState {
  DEFAULT,
  SELECTING,
}

enum InteractableState {
  DEFAULT,
  SELECTED,
  PENDING_SELECTED,
  PENDING_DEFAULT,
  MUTED,
}

type InteractableParams = {
  column: number;
  row: number;
  value: string | HeatmapCellValue;
  color: string;
  state: InteractableState;
  prev: Interactable | null;
  next: Interactable | null;
  above: Interactable | null;
  below: Interactable | null;
}

export class Interactable {
  id: string;
  column: number;
  row: number;
  value: string | HeatmapCellValue;
  color: string;
  state: InteractableState;
  prev: Interactable | null;
  next: Interactable | null;
  above: Interactable | null;
  below: Interactable | null;

  constructor(params: InteractableParams) {
    this.id = Math.random().toString(16).slice(2, 15);
    this.value = params.value;
    this.row = params.row;
    this.column = params.column;
    this.color = params.color;
    this.state = params.state ?? InteractableState.DEFAULT;
    this.prev = params.prev ?? null;
    this.next = params.next ?? null;
    this.above = params.above ?? null;
    this.below = params.below ?? null;
  }
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
export class HeatmapComponent implements OnChanges, OnDestroy {
  @Input() data: HeatmapInput;
  @Input() mutedCells: HeatmapCellLocations;
  @Input() selectedCells: HeatmapCellLocations;
  @Output() selectedCellsChange: EventEmitter<HeatmapCellLocations> = new EventEmitter();

  @ViewChild('heatmapTable') heatmapTable: ElementRef<HTMLTableElement>;

  columnKeys: Interactable[];
  heatmapState: HeatmapState = HeatmapState.DEFAULT;
  rowKeys: Interactable[];
  subscriptions: Subscription[] = [];
  values: Interactable[][];

  data$ = new BehaviorSubject<HeatmapInput | null>(null);
  mutedCells$ = new BehaviorSubject<HeatmapCellLocations | null>(null);
  selectedCells$ = new BehaviorSubject<HeatmapCellLocations | null>(null);

  public InteractableState = InteractableState;

  public scrollToCol(col: number) {
    const cell = this.heatmapTable.nativeElement.querySelector(`td[data-col-index="${col}"][data-row-index="1"]`);
    if (cell) {
      // Find the scrollable parent container
      const scrollContainer = cell.closest('.overflow-x-scroll')!;

      // Calculate scroll position to align element to left edge
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = cell.getBoundingClientRect();
      const scrollLeft = elementRect.left - containerRect.left + scrollContainer.scrollLeft - 32;

      scrollContainer.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      });
    }
  }

  constructor(
    private service: CleanDbService
  ) {
    this.subscriptions.push(
      this.data$.pipe(
        filter(d => !!d),
        tap((data) => {
          const { rowKeys, columnKeys, values } = this.parseInput(data!);
          this.rowKeys = rowKeys;
          this.columnKeys = columnKeys;
          this.values = values;
        }),
        combineLatestWith(
          this.mutedCells$,
          this.selectedCells$
        )
      ).subscribe(([data, mutedCells, selectedCells]) => {

        if (!Object.is(mutedCells, null)) {
          this.validateCellLocations(this.values, mutedCells!);
          this.updateCells(this.values, mutedCells!, InteractableState.MUTED);
        }

        if (!Object.is(selectedCells, null)) {
          // console.log('selected cells updated: ', selectedCells);
          this.validateCellLocations(this.values, selectedCells!);
          this.updateCells(this.values, selectedCells!, InteractableState.SELECTED);
        }
      })
    )
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.data$.next(changes['data'].currentValue);
    }

    if (changes['mutedCells'] && changes['mutedCells'].currentValue) {
      this.mutedCells$.next(changes['mutedCells'].currentValue);
    }

    if (changes['selectedCells'] && changes['selectedCells'].currentValue) {
      this.selectedCells$.next(changes['selectedCells'].currentValue);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  parseInput(data: HeatmapInput) {
    // validate data, data shape must be 2d rectangle
    // throw error if shape is invalid
    this.validateInput(data);

    const dataMin = Math.min(...data.values.flat());
    const dataMax = Math.max(...data.values.flat());

    // parse input data to x axis, y axis, and values
    const rowKeys 
      = data.rowKeys.map((key, i) => new Interactable({
        value: key,
        row: i,
        column: -1,
        color: 'white',
        state: InteractableState.DEFAULT,
        prev: null,
        next: null,
        above: null,
        below: null,
      }));

    // add an empty cell for correct table format
    const columnKeys
      = ['', ...data.colKeys].map((key, i) => new Interactable({
        value: key,
        row: -1,
        column: i,
        color: 'white',
        state: InteractableState.DEFAULT,
        prev: null,
        next: null,
        above: null,
        below: null,
      }));

    let prevRow: Interactable[] | null = null;
    const values
      = data.values.map((row, rowIdx) => {
          const currentRow = row.map((data, colIdx) =>
            new Interactable({
              value: data,
              row: rowIdx,
              column: colIdx,
              color: this.service.getColorFor(data, dataMin, dataMax),
              state: InteractableState.DEFAULT,
              prev: null,
              next: null,
              above: null,
              below: null,
            })
          );

          // set prev and next
          currentRow.forEach((interactable, colIdx) => {
            if (prevRow !== null) {
              const above = prevRow![colIdx];
              interactable.above = above;
              above.below = interactable;
            }

            if (colIdx !== 0) {
              const prev = currentRow[colIdx - 1];
              interactable.prev = prev;
              prev.next = interactable;
            }
          });

          prevRow = currentRow;
          return currentRow;
        });

    return {
      rowKeys,
      columnKeys,
      values
    }
  }

  updateCells(cellMatrix: Interactable[][], locations: HeatmapCellLocations, state: InteractableState): void {
    cellMatrix.forEach((row) => {
      row.forEach((cell) => {
        cell.state = InteractableState.DEFAULT;
      })
    });

    locations.forEach(([row, col]) => {
      cellMatrix[row][col].state = state;
    })
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

  validateCellLocations(cellMatrix: Interactable[][], locations: HeatmapCellLocations): void {
    if (!cellMatrix) {
      throw new Error('no matrix to validate');
    }

    const isInvalidIdx = ([row, col]: [number, number]) => 
        (row < 0 || row >= cellMatrix.length)
      || (col < 0 || col >= cellMatrix[0].length);
    const invalidIndexes = locations.filter(isInvalidIdx);
    if (invalidIndexes.length > 0) {
      throw new Error(`positions contains invalid indexes: ${invalidIndexes}, expect max index: ${cellMatrix.length - 1}`);
    }
  }

  /* ------------------------------ Interactable Events ------------------------------ */
  onInteractableMouseDown(x: Interactable, event: MouseEvent) {
    // Disable cell interaction for first release
    // if (x.state !== InteractableState.MUTED) {
    //   this.heatmapState = HeatmapState.SELECTING;
    // }

    // switch (x.state) {
    //   case InteractableState.DEFAULT:
    //     x.state = InteractableState.PENDING_SELECTED;
    //     break;
    //   case InteractableState.SELECTED:
    //     x.state = InteractableState.PENDING_DEFAULT;
    //     break;
    //   case InteractableState.PENDING_SELECTED:
    //   case InteractableState.PENDING_DEFAULT:
    //     break;
    // }
  }

  onInteractableMouseOver(x: Interactable, event: MouseEvent) {
    switch (this.heatmapState) {
      case (HeatmapState.SELECTING):
        switch (x.state) {
          case InteractableState.DEFAULT:
            x.state = InteractableState.PENDING_SELECTED;
            break;
          case InteractableState.SELECTED:
            x.state = InteractableState.PENDING_DEFAULT;
            break;
          case InteractableState.MUTED:
          case InteractableState.PENDING_DEFAULT:
          case InteractableState.PENDING_SELECTED:
          default:
            break;
        }
        break;
      
      case (HeatmapState.DEFAULT):
      default:  
        return;
    }
  }

  onInteractableMouseUp(x: Interactable, event: MouseEvent) {
    // Disable cell interaction for first release
    // this.heatmapState = HeatmapState.DEFAULT;
    // const newCells = this.values.flat().map((cell) => {
    //   if (cell.state === InteractableState.PENDING_DEFAULT) {
    //     cell.state = InteractableState.DEFAULT;
    //   } 

    //   else if (cell.state === InteractableState.PENDING_SELECTED) {
    //     cell.state = InteractableState.SELECTED;
    //   }

    //   return cell.state === InteractableState.SELECTED ? cell : null;
    // }).filter((cell) => !!cell)
    //   .map((cell) => [cell!.row, cell!.column]) as HeatmapCellLocations;

    // if (this.shouldEmitCellChanges(newCells)) {
    //   this.selectedCellsChange.emit(newCells);
    // }
  }

  /* ---------------------------------- Utils --------------------------------- */
  shouldEmitCellChanges(cellsToUpdate: HeatmapCellLocations): boolean {
    const oldCells = new Set(this.selectedCells.map(this.getCellLocationId));
    const newCells = new Set(cellsToUpdate.map(this.getCellLocationId));

    if (oldCells.size !== newCells.size) {
      return true;
    }

    for (let cell of oldCells) {
      if (!newCells.has(cell)) {
        return true;
      }
    }

    return false;
  }

  getCellLocationId(location: HeatmapCellLocation): string {
    return location.join('-');
  }
}
