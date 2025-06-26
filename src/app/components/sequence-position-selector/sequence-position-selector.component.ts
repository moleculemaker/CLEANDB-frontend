import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { BehaviorSubject, combineLatestWith, filter, Subscription, tap } from 'rxjs';

enum SelectorState {
  DEFAULT,
  SELECTING,
}
enum SequenceCellState {
  DEFAULT,
  SELECTED,
  PENDING_SELECTED,
  PENDING_DEFAULT,
  MUTED,
}
type SequenceCellValue = string;

type SequenceCellOperation = {
  type: 'update';
  positions: number[];
  state: SequenceCellState;
}

type SequenceCellParams
  = { value: SequenceCellValue }
  & Partial<{
    prev: SequenceCell | null;
    next: SequenceCell | null;
    state: SequenceCellState;
  }>;

class SequenceCell {
  id: string;
  prev: SequenceCell | null;
  next: SequenceCell | null;
  state: SequenceCellState;
  value: SequenceCellValue;

  constructor(params: SequenceCellParams) {
    this.id = Math.random().toString(16).slice(2, 15);
    this.value = params.value;
    this.state = params.state ?? SequenceCellState.DEFAULT;
    this.prev = params.prev ?? null;
    this.next = params.next ?? null;
  }
}

@Component({
  selector: 'app-sequence-position-selector',
  standalone: true,
  imports: [],
  templateUrl: './sequence-position-selector.component.html',
  styleUrl: './sequence-position-selector.component.scss'
})
export class SequencePositionSelectorComponent implements OnChanges, OnDestroy {
  @Input() mutedPositions: number[];
  @Input() selectedPositions: number[];
  @Input() sequence: string;
  @Input() showIndexPer: number = 10;

  @Output() selectedPositionsChange: EventEmitter<number[]> = new EventEmitter();

  selectorState: SelectorState = SelectorState.DEFAULT;
  sequenceCells: SequenceCell[];
  subscriptions: Subscription[] = [];

  sequence$ = new BehaviorSubject<string | null>(null);
  mutedPositions$ = new BehaviorSubject<number[] | null>(null);
  selectedPositions$ = new BehaviorSubject<number[] | null>(null);

  public SequenceCellState = SequenceCellState;

  constructor() {
    this.subscriptions.push(
      this.sequence$.pipe(
        filter(d => !!d),
        tap((data) => {
          this.sequenceCells = this.buildSequenceCells(data!);
        }),
        combineLatestWith(
          this.mutedPositions$,
          this.selectedPositions$
        )
      ).subscribe(([_, mutedPositions, selectedPositions]) => {

        const sequenceCellOperations = [];
        if (mutedPositions) {
          this.validatePositions(this.sequenceCells, mutedPositions);
          sequenceCellOperations.push({
            type: 'update',
            positions: mutedPositions,
            state: SequenceCellState.MUTED,
          } as SequenceCellOperation);
        }

        if (selectedPositions) {
          this.validatePositions(this.sequenceCells, selectedPositions);
          sequenceCellOperations.push({
            type: 'update',
            positions: selectedPositions,
            state: SequenceCellState.SELECTED,
          } as SequenceCellOperation);
        }

        this.resetCellStates();
        this.applyCellOperations(sequenceCellOperations);
      })
    )
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sequence'] && changes['sequence'].currentValue) {
      this.sequenceCells = this.buildSequenceCells(changes['sequence'].currentValue);
    }

    if (changes['mutedPositions']) {
      this.mutedPositions$.next(changes['mutedPositions'].currentValue);
    }

    if (changes['selectedPositions']) {
      this.selectedPositions$.next(changes['selectedPositions'].currentValue);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  applyCellOperations(cellOperations: SequenceCellOperation[]): void {
    cellOperations.forEach((operation) => {
      operation.positions.forEach((position) => {
        this.sequenceCells[position].state = operation.state;
      });
    });
  }

  buildSequenceCells(sequence: string): SequenceCell[] {
    const retVal: SequenceCell[] = [];
    let lastCell: SequenceCell | null = null;
    sequence.split('').forEach((cellValue, i) => {
      const cell = new SequenceCell({
        prev: lastCell,
        state: SequenceCellState.DEFAULT,
        value: cellValue,
      });
      retVal.push(cell);
      if (lastCell !== null) {
        lastCell.next = cell;
      }
      lastCell = cell;
    });
    return retVal;
  }

  resetCellStates(): void {
    this.sequenceCells.forEach((cell) => {
      cell.state = SequenceCellState.DEFAULT;
    });
  }

  updateSequenceCells(sequenceCells: SequenceCell[], positions: number[], state: SequenceCellState): void {
    positions.forEach((position) => {
      sequenceCells[position].state = state;
    });
  }

  validatePositions(sequenceCells: SequenceCell[], positions: number[]): void {
    if (!sequenceCells) {
      throw new Error('no sequence to validate!');
    }
    const isInvalidIdx = (idx: number) => idx < 0 || idx >= sequenceCells.length;
    const invalidIndexes = positions.filter(isInvalidIdx);
    if (invalidIndexes.length > 0) {
      throw new Error(`positions contains invalid indexes: ${invalidIndexes}, expect max index: ${sequenceCells.length - 1}`);
    }
  }

  /* ------------------------------- Cell Events ------------------------------ */
  onCellMouseDown(cell: SequenceCell, event: MouseEvent) {
    if (cell.state !== SequenceCellState.MUTED) {
      this.selectorState = SelectorState.SELECTING;
    }

    switch (cell.state) {
      case SequenceCellState.DEFAULT:
        cell.state = SequenceCellState.PENDING_SELECTED;
        break;
      case SequenceCellState.SELECTED:
        cell.state = SequenceCellState.PENDING_DEFAULT;
        break;
      case SequenceCellState.PENDING_SELECTED:
      case SequenceCellState.PENDING_DEFAULT:
        break;
    }
  }

  onCellMouseUp(_: SequenceCell, event: MouseEvent) {
    this.selectorState = SelectorState.DEFAULT;
    const newPositions = this.sequenceCells.map((cell) => {
      if (cell.state === SequenceCellState.PENDING_DEFAULT) {
        cell.state = SequenceCellState.DEFAULT;
      } 

      else if (cell.state === SequenceCellState.PENDING_SELECTED) {
        cell.state = SequenceCellState.SELECTED;
      }

      return cell.state === SequenceCellState.SELECTED ? cell : null;
    }).map((v, i) => [v, i] as [SequenceCell | null, number])
      .filter(([v, _]) => v) // only select the 'selected ones'
      .map(([_, i]) => i);   // get their position value;

    if (this.shouldEmitPositionChanges(newPositions)) {
      this.selectedPositionsChange.emit(newPositions);
    }
  }

  onCellMouseOver(cell: SequenceCell, event: MouseEvent) {
    switch (this.selectorState) {
      case (SelectorState.SELECTING):
        switch (cell.state) {
          case SequenceCellState.DEFAULT:
            cell.state = SequenceCellState.PENDING_SELECTED;
            break;
          case SequenceCellState.SELECTED:
            cell.state = SequenceCellState.PENDING_DEFAULT;
            break;
          case SequenceCellState.MUTED:
          case SequenceCellState.PENDING_DEFAULT:
          case SequenceCellState.PENDING_SELECTED:
          default:
            break;
        }
        break;
      
      case (SelectorState.DEFAULT):
      default:  
        return;
    }
  }

  /* ---------------------------------- Utils --------------------------------- */
  shouldEmitPositionChanges(positionsToUpdate: number[]): boolean {
    const oldPositions = new Set(this.selectedPositions);
    const newPositions = new Set(positionsToUpdate);

    if (oldPositions.size !== newPositions.size) {
      return true;
    }

    for (let position of oldPositions) {
      if (!newPositions.has(position)) {
        return true;
      }
    }

    return false;
  }


  getPositionsFromCells(cells: SequenceCell[]): number[] {
    return cells.map((_, i) => i);
  }
}
