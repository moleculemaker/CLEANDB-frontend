import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatestWith, filter, Subscription, tap } from 'rxjs';
import { CleanDbService, EffectPredictionResult } from '~/app/services/clean-db.service';

import { toPng, toJpeg, toSvg } from 'html-to-image';

export type HeatmapCellValue = any;
export type HeatmapCellLocation = [number, number]
export type HeatmapCellLocations = HeatmapCellLocation[]
export type HeatmapInput = EffectPredictionResult;
export type HeatmapCellOperation = {
  type: 'update';
  cells: HeatmapCellLocations;
  state: InteractableState;
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

type HeatmapCellTooltipContext = {
  accentClass: string;
  accentColor: string;
  arrowIcon: string;
  displayLabel: string;
  fromResidue: string;
  llr: number | null;
  llrFormatted: string;
  positionLabel: string;
  predictedEffectLabel: string;
  toResidue: string;
}

/**
 * Where the tooltip is pinned, as the CSS it will be given. Each axis names the
 * viewport edge it is measured from, so the box grows inward and cannot run off
 * screen — which is what lets us place it without measuring its size.
 */
type HeatmapTooltipStyle = {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
};

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeatmapComponent implements OnChanges, OnDestroy {
  @Input() data: HeatmapInput;
  @Input() mutedCells: HeatmapCellLocations;
  @Input() selectedCells: HeatmapCellLocations;
  @Output() selectedCellsChange: EventEmitter<HeatmapCellLocations> = new EventEmitter();
  @ViewChild('heatmapTable') heatmapTable: ElementRef<HTMLTableElement>;

  columnKeys: Interactable[];
  rowKeys: Interactable[];
  subscriptions: Subscription[] = [];
  values: Interactable[][];

  data$ = new BehaviorSubject<HeatmapInput | null>(null);
  mutedCells$ = new BehaviorSubject<HeatmapCellLocations | null>(null);
  selectedCells$ = new BehaviorSubject<HeatmapCellLocations | null>(null);

  public InteractableState = InteractableState;
  // Hover is tracked separately from InteractableState so it never participates
  // in the run-border geometry: mutating a cell's state on hover would make its
  // selected neighbours see a non-selected neighbour and split the column outline.
  hoveredCell: Interactable | null = null;
  private currentMutedCells: HeatmapCellLocations = [];
  private currentSelectedCells: HeatmapCellLocations = [];
  private scoreFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  private hideTooltipTimeoutId: ReturnType<typeof setTimeout> | null = null;

  tooltipContext: HeatmapCellTooltipContext | null = null;
  tooltipStyle: HeatmapTooltipStyle = {};

  /** Gap between the hovered cell and the tooltip, in px. */
  private static readonly TOOLTIP_GAP = 4;

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
    private service: CleanDbService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
  ) {
    // The tooltip is pinned to the viewport, so anything that moves the cell
    // under it — scrolling, resizing — has to dismiss it, as the overlay this
    // replaced did. Escape likewise. Bound outside the zone and guarded by
    // dismissTooltip's early return, so these only cost a change detection pass
    // when a tooltip is actually open. Scroll is capture phase because scroll
    // does not bubble out of the heatmap's own container.
    this.zone.runOutsideAngular(() => {
      document.addEventListener('scroll', this.onDocumentScrollCapture, true);
      window.addEventListener('resize', this.onViewportResize);
      document.addEventListener('keydown', this.onDocumentKeydown);
    });

    this.subscriptions.push(
      this.data$.pipe(
        filter(d => !!d),
        tap((data) => {
          const { rowKeys, columnKeys, values } = this.parseInput(data!);
          this.rowKeys = rowKeys;
          this.columnKeys = columnKeys;
          this.values = values;
          this.cancelHideTooltip();
          this.hoveredCell = null;
          this.tooltipContext = null;
        }),
        combineLatestWith(
          this.mutedCells$,
          this.selectedCells$
        )
      ).subscribe(([data, mutedCells, selectedCells]) => {
        this.currentMutedCells = Array.isArray(mutedCells) ? mutedCells : [];
        this.currentSelectedCells = Array.isArray(selectedCells) ? selectedCells : [];

        if (this.values) {
          if (mutedCells && mutedCells.length) {
            this.validateCellLocations(this.values, mutedCells);
          }

          if (selectedCells && selectedCells.length) {
            this.validateCellLocations(this.values, selectedCells);
          }

          this.refreshCellStates();
        }
        this.cdr.markForCheck();
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
    this.cancelHideTooltip();
    document.removeEventListener('scroll', this.onDocumentScrollCapture, true);
    window.removeEventListener('resize', this.onViewportResize);
    document.removeEventListener('keydown', this.onDocumentKeydown);
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  applyCellOperations(cellOperations: HeatmapCellOperation[]): void {
    if (!this.values || !cellOperations || !cellOperations.length) {
      return;
    }

    cellOperations.forEach((operation) => {
      operation.cells.forEach((cell) => {
        this.values[cell[0]][cell[1]].state = operation.state;
      });
    });
  }

  async exportAs(format: 'png' | 'jpeg' | 'svg'): Promise<void> {

    const heatmapTable = this.heatmapTable.nativeElement;
    let link: HTMLAnchorElement = document.createElement('a');
    let dataUrl: string 
      = format === 'svg' 
      ? await toSvg(heatmapTable) : (
        format === 'png' 
        ? await toPng(heatmapTable) 
        : await toJpeg(heatmapTable)
      );

    link.href = dataUrl;
    link.download = `heatmap.${format}`;
    link.click();
    link.remove();
    if (dataUrl) {
      URL.revokeObjectURL(dataUrl);
    }
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

  resetCellStates(): void {
    this.values.forEach((row) => {
      row.forEach((cell) => {
        cell.state = InteractableState.DEFAULT;
      })
    });
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
  onCellMouseEnter(interactable: Interactable, event: Event): void {
    const targetElement = event.currentTarget as HTMLElement | null;
    if (!targetElement) {
      return;
    }

    // Cancel any pending hide; moving to an adjacent cell should keep the tooltip
    this.cancelHideTooltip();

    const context = this.buildTooltipContext(interactable);
    this.tooltipContext = context;
    this.hoveredCell = interactable;

    if (context) {
      // Recomputed on every cell, so the box follows the cursor rather than
      // staying where it first appeared.
      this.tooltipStyle = this.computeTooltipStyle(targetElement);
    }
  }

  onCellMouseLeave(): void {
    // Debounce hide so rapid moves to adjacent cells don't trigger a hide/show flicker
    this.cancelHideTooltip();
    this.hideTooltipTimeoutId = setTimeout(() => {
      this.hideTooltipTimeoutId = null;
      this.hoveredCell = null;
      this.tooltipContext = null;
      this.cdr.markForCheck();
    }, 80);
  }

  private cancelHideTooltip(): void {
    if (this.hideTooltipTimeoutId !== null) {
      clearTimeout(this.hideTooltipTimeoutId);
      this.hideTooltipTimeoutId = null;
    }
  }

  /** Clears the tooltip and the hover outline together. */
  private dismissTooltip(): void {
    if (!this.tooltipContext) {
      return;
    }

    // Listeners run outside the zone, so only re-enter when there is something
    // to dismiss: idle scrolling must not drive change detection on this grid.
    this.zone.run(() => {
      this.cancelHideTooltip();
      this.hoveredCell = null;
      this.tooltipContext = null;
      this.cdr.markForCheck();
    });
  }

  private readonly onDocumentScrollCapture = (event: Event): void => {
    const table = this.heatmapTable?.nativeElement;
    const target = event.target as Node | null;

    // Only a scroll that can actually move the cell counts — the page, or a
    // container the grid sits inside. An unrelated scroller (the results
    // table's virtual scroller, which the page also scrolls programmatically)
    // must not clear a tooltip the pointer is still resting on.
    if (table && target && !target.contains(table)) {
      return;
    }

    this.dismissTooltip();
  };

  private readonly onViewportResize = (): void => {
    // A resize reflows the grid, so the pinned position is stale immediately.
    this.dismissTooltip();
  };

  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.dismissTooltip();
    }
  };

  private computeTooltipStyle(cell: HTMLElement): HeatmapTooltipStyle {
    const rect = cell.getBoundingClientRect();
    const gap = HeatmapComponent.TOOLTIP_GAP;
    // clientWidth/Height, not innerWidth/Height: a fixed element is placed
    // against the layout viewport, which excludes a classic scrollbar. Using
    // innerWidth put right-anchored tooltips a scrollbar's width off on
    // platforms that do not use overlay scrollbars.
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const style: HeatmapTooltipStyle = {};

    // Anchor each axis to the near viewport edge so the box opens towards the
    // middle. Cells on the right open leftwards, cells low down open upwards.
    if (rect.left + rect.width / 2 > viewportWidth / 2) {
      style.right = `${Math.round(viewportWidth - rect.right)}px`;
    } else {
      style.left = `${Math.round(rect.left)}px`;
    }

    if (rect.top + rect.height / 2 > viewportHeight / 2) {
      style.bottom = `${Math.round(viewportHeight - rect.top + gap)}px`;
    } else {
      style.top = `${Math.round(rect.bottom + gap)}px`;
    }

    return style;
  }

  /* ---------------------------------- Utils --------------------------------- */
  shouldEmitCellChanges(cellsToUpdate: HeatmapCellLocations): boolean {
    const currentCells = Array.isArray(this.selectedCells) ? this.selectedCells : [];
    const oldCells = new Set(currentCells.map(this.getCellLocationId));
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

  private buildTooltipContext(interactable: Interactable): HeatmapCellTooltipContext | null {
    if (!this.data || interactable.row === undefined || interactable.column === undefined) {
      return null;
    }

    const fromResidue = this.data.colKeys?.[interactable.column] ?? '';
    const toResidue = this.data.rowKeys?.[interactable.row] ?? '';
    const position = interactable.column + 1;
    const rawValue = typeof interactable.value === 'number'
      ? interactable.value
      : Number(interactable.value);

    const isNoData = interactable.value === 0 || Number.isNaN(rawValue);
    const llr = isNoData ? null : rawValue;
    const predictedEffect = this.getPredictedEffect(llr);

    return {
      accentClass: predictedEffect.accentClass,
      accentColor: predictedEffect.accentColor,
      arrowIcon: predictedEffect.arrowIcon,
      displayLabel: `${fromResidue}${position}${toResidue}`,
      fromResidue,
      llr,
      llrFormatted: llr !== null ? this.formatScore(llr) : 'N/A',
      positionLabel: `${position}`,
      predictedEffectLabel: predictedEffect.label,
      toResidue,
    };
  }

  private getPredictedEffect(score: number | null): { label: string; arrowIcon: string; accentClass: string; accentColor: string } {
    if (score === null) {
      return {
        accentClass: 'text-[#CED4DA]',
        accentColor: '#CED4DA',
        arrowIcon: 'pi-minus',
        label: 'No prediction available',
      };
    }

    if (score <= -2) {
      return {
        accentClass: 'text-[#F28B94]',
        accentColor: '#F28B94',
        arrowIcon: 'pi-arrow-down',
        label: 'Strongly Deleterious',
      };
    }

    if (score > -2 && score <= -1) {
      return {
        accentClass: 'text-[#FFB3B8]',
        accentColor: '#FFB3B8',
        arrowIcon: 'pi-arrow-down-right',
        label: 'Likely Deleterious',
      };
    }

    if (score > -1 && score < 1) {
      return {
        accentClass: 'text-[#E9ECEF]',
        accentColor: '#E9ECEF',
        arrowIcon: 'pi-arrow-right',
        label: 'Neutral / Uncertain',
      };
    }

    if (score >= 1 && score < 2) {
      return {
        accentClass: 'text-[#9CB3FF]',
        accentColor: '#9CB3FF',
        arrowIcon: 'pi-arrow-up-right',
        label: 'Likely Beneficial',
      };
    }

    return {
      accentClass: 'text-[#6F8BFF]',
      accentColor: '#6F8BFF',
      arrowIcon: 'pi-arrow-up',
      label: 'Strongly Beneficial',
    };
  }

  private formatScore(score: number): string {
    return this.scoreFormatter.format(score);
  }

  private refreshCellStates(): void {
    if (!this.values) {
      return;
    }

    this.resetCellStates();

    const operations: HeatmapCellOperation[] = [];

    if (this.currentMutedCells?.length) {
      operations.push({
        type: 'update',
        cells: this.currentMutedCells,
        state: InteractableState.MUTED,
      });
    }

    if (this.currentSelectedCells?.length) {
      operations.push({
        type: 'update',
        cells: this.currentSelectedCells,
        state: InteractableState.SELECTED,
      });
    }

    if (operations.length) {
      this.applyCellOperations(operations);
    }
  }
}
