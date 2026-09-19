import {Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import { JobType } from '~/app/api/mmli-backend/v1';
import { LoadingComponent } from '~/app/components/loading/loading.component';
import { JobTabComponent } from "~/app/components/job-tab/job-tab.component";

import { CleanDbService, EffectPredictionResult } from '~/app/services/clean-db.service';
import { EffectPredictionComponent, MAX_STRUCTURE_RESIDUES } from '~/app/pages/effect-prediction/effect-prediction.component';
import { residueCount } from '~/app/utils/fasta';
import { timer, Subscription, switchMap, takeWhile, tap } from 'rxjs';
import { PanelModule } from 'primeng/panel';
import { Table, TableModule } from 'primeng/table';
import { SequencePositionSelectorComponent } from '~/app/components/sequence-position-selector/sequence-position-selector.component';
import { HeatmapCellLocations, HeatmapComponent } from '~/app/components/heatmap/heatmap.component';
import { ScoreChipComponent } from "../../components/score-chip/score-chip.component";
import { ProteinViewerComponent } from '~/app/components/protein-viewer/protein-viewer.component';
import { ProteinViewerStyle, ProteinColorScheme, ProteinResidueColors, ResidueNumbering, ResidueSelection } from '~/app/models/protein-viewer';
import { ProteinSelectionService } from '~/app/services/protein-selection.service';
import { AlphafoldService } from '~/app/services/alphafold.service';
import { TooltipModule } from 'primeng/tooltip';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';

/** How the structure's per-residue colours are derived from the LLR matrix. */
export type StructureColorMode = 'average' | 'max' | 'single';

@Component({
  selector: 'app-effect-prediction-result',
  templateUrl: './effect-prediction-result.component.html',
  styleUrls: ['./effect-prediction-result.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    PanelModule,
    SplitButtonModule,
    TableModule,
    TooltipModule,
    TieredMenuModule,


    EffectPredictionComponent,
    HeatmapComponent,
    JobTabComponent,
    LoadingComponent,
    ProteinViewerComponent,
    SequencePositionSelectorComponent,
    ScoreChipComponent,
    ProgressSpinnerModule,
    DropdownModule,
    FormsModule
],
  host: {
    class: 'flex flex-col h-full',
  }
})
export class EffectPredictionResultComponent implements OnDestroy {
  @ViewChild('heatmap') heatmap: HeatmapComponent;
  @ViewChild('resultTable') resultTable: Table;
  @ViewChild('mutationEffectSection') mutationEffectSection: ElementRef<HTMLElement>;

  columns = [
    { field: 'position', header: 'Position' },
    { field: 'mutationLabelExport', header: 'Mutation (Export)' },
    { field: 'score', header: 'Score' }
  ];
  currentPage = 'result';
  exportOptions: MenuItem[] = [
    { label: 'Table (CSV)', command: () => this.resultTable.exportCSV() },
    { label: 'Heatmap',
      items: [
        // { label: 'SVG', command: () => this.heatmap.exportAs('svg') },
        { label: 'PNG', command: () => this.heatmap.exportAs('png') },
        { label: 'JPEG', command: () => this.heatmap.exportAs('jpeg') },
      ]
    },
    this.proteinStructureExportItem(),
  ];
  jobId: string                             = this.route.snapshot.paramMap.get("id") || "precomputed";
  jobInfo: any                              = {};
  jobType: JobType                          = JobType.CleandbMepesm;
  mutedCells: HeatmapCellLocations          = [];
  mutedPositions: number[]                  = [];
  numColumns                                = 20;
  requestOptions: MenuItem[] = [
    {
      label: "Modify and Resubmit Request",
      icon: "pi pi-refresh",
      command: () => this.currentPage = 'input'
    },
    {
      label: "Run a New Request",
      icon: "pi pi-plus",
      url: "/effect-prediction",
      target: "_blank"
    }
  ];
  result: EffectPredictionResult;
  selectedCells: HeatmapCellLocations       = [];
  selectedPositions: number[]               = [];
  showResults                               = false;
  simplefoldJobId                           = '';
  simplefoldPdbData                         = '';
  simplefoldDataFormat                      = 'pdb';
  simplefoldLoading                         = false;
  simplefoldError                           = false;
  // Set once the spinner has been on screen long enough that the wait is worth
  // explaining. Reset only when the timer is re-armed; the template reads it
  // only under simplefoldLoading, so it goes dark with the spinner.
  structureSlow                             = false;
  readonly slowStructureDelayMs             = 5000;
  structureColorMode: StructureColorMode    = 'average';
  structureResidueColors: ProteinResidueColors | null = null;
  // Set when a per-residue mode is selected but the structure cannot carry it,
  // so the panel can say why it is showing a flat colour instead.
  structureColoringUnavailable              = false;
  structureColorOptions = [
    {
      value: 'average',
      label: 'Average LLR',
      menuLabel: 'Average LLR (Default)',
      description: 'Uses Average LLR colormap value for this position across all possible mutations. Useful for viewing enzyme regions with significant impact (e.g. conserved residues, binding sites) where any/several mutations can cause significant changes.',
    },
    {
      value: 'max',
      label: 'Max LLR',
      menuLabel: 'Max LLR',
      description: 'Uses the Maximum LLR colormap value for the mutation with highest LLR for this position. Useful for viewing enzyme positions that might be engineering target sites, where 1 specific mutation causes a significant change',
    },
    {
      value: 'single',
      label: 'Single Color',
      menuLabel: 'Single Color',
      description: 'Uses a single color (fixed) colormap across all positions. Useful for viewing the structure as a whole.',
    },
  ];
  viewerStyle: ProteinViewerStyle           = 'cartoon';
  viewerColorScheme: ProteinColorScheme     = 'default';
  highlightColor                            = '#E16ACF';
  precomputedUniprotId                      = 'Q6V4H0';
  subscriptions: Subscription[]             = [];
  tableValues: any[]                        = [];
  sequence                                  = '';
  readonly maxStructureResidues             = MAX_STRUCTURE_RESIDUES;

  statusResponse$
    = this.service.getResultStatus(this.jobType, this.jobId).pipe(
      tap((job) => {
        const jobInfo = JSON.parse(job.job_info || '{}');
        this.sequence = jobInfo.sequence;
        this.jobInfo = {
          ...jobInfo,
          email: job.email || '',
        };
        this.startSimplefoldPolling(jobInfo.simplefold_job_id);
      }),
    );

  private isPollingSimplefold = false;
  private structureResidueNumbering: ResidueNumbering | null = null;
  // Distinguishes "the viewer has not reported yet" from "the viewer reported
  // that it could not tell", which are both a null numbering.
  private structureNumberingReported = false;

  /**
   * Fixed row height the table's virtual scroller lays rows out against. Must
   * match the rendered row or rows overlap or leave gaps; measured from the
   * rendered table rather than assumed.
   */
  readonly tableRowHeight = 42;

  readonly viewerId = 'effect-prediction-viewer';

  constructor(
    private service: CleanDbService,
    private alphafoldService: AlphafoldService,
    private proteinSelectionService: ProteinSelectionService,
    private route: ActivatedRoute,
  ) {}

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  copyAndPasteURL(): void {
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = window.location.href;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
  }

  onProgressChange(value: number): void {
    if (value === 100) {
      this.subscriptions.push(
        this.service.getEffectPredictionResult(this.jobId).subscribe((result) => {
          this.result = result;

          const tableValues: any[] = [];
          result.values.forEach((row, rowIdx) => {
            row.forEach((value, colIdx) => {
              const from = this.result.colKeys[colIdx];
              const to = this.result.rowKeys[rowIdx];
              if (from === to) return;
              tableValues.push({
                position: colIdx + 1,
                mutationLabel: `${from} -> ${to}`,
                mutationLabelExport: `${from}${colIdx + 1}${to}`,
                score: value,
              });
            });
          });

          tableValues.sort((a, b) => a.position - b.position);
          this.tableValues = tableValues;
          this.showResults = true;
          this.updateStructureResidueColors();
          this.armSlowStructureNote();
        })
      );
    }
  }

  onSelectedPositionsChange(newPositions: number[]): void {
    this.selectedCells = this.generateCellsFromPositions(newPositions);
    if (newPositions.length > 0) {
      const oldPositionSet = new Set(this.selectedPositions);
      const newPositionSet = new Set(newPositions);
      //@ts-ignore
      const diff: number[] = Array.from(newPositionSet.difference(oldPositionSet));
      if (diff.length > 0) {
        const minPosition = Math.min(...diff);
        this.heatmap.scrollToCol(minPosition);
        this.scrollTableToPosition(minPosition + 1); // table uses 1-based positions
        // The sequence selector lives above the heatmap/structure section, so
        // bring that section into the page viewport so the user can see the
        // effect of the selection without scrolling manually.
        this.scrollPageToMutationEffectSection();
      }
    }
    this.selectedPositions = newPositions;
    this.syncViewerSelections();
  }

  onResidueClicked(residue: ResidueSelection): void {
    const position = residue.resi - 1; // resi is 1-based, positions are 0-based
    this.togglePosition(position);
    this.heatmap.scrollToCol(position);
    this.scrollTableToPosition(position + 1); // table uses 1-based positions
  }

  onStructureColorModeChange(): void {
    this.updateStructureResidueColors();
  }

  onStructureResidueNumbering(numbering: ResidueNumbering | null): void {
    this.structureResidueNumbering = numbering;
    this.structureNumberingReported = true;
    this.updateStructureResidueColors();
  }

  /**
   * Reduce each position's column of substitutions to a single LLR. Columns are
   * sequence positions and rows are the 20 amino acids, so a position's column
   * is its 19 real substitutions plus the synonymous cell, which is a hard 0 and
   * is excluded here exactly as the results table excludes it.
   */
  private aggregateByPosition(mode: 'average' | 'max'): (number | null)[] {
    const { rowKeys, colKeys, values } = this.result;
    return colKeys.map((wildType, colIdx) => {
      const llrs: number[] = [];
      values.forEach((row, rowIdx) => {
        if (rowKeys[rowIdx] === wildType) return;
        llrs.push(row[colIdx]);
      });
      if (!llrs.length) return null;
      return mode === 'max'
        ? Math.max(...llrs)
        : llrs.reduce((sum, value) => sum + value, 0) / llrs.length;
    });
  }

  private updateStructureResidueColors(): void {
    this.structureResidueColors = null;
    this.structureColoringUnavailable = false;

    if (this.structureColorMode === 'single') return;
    if (!this.result?.values?.length || !this.result.colKeys?.length) return;
    // Nothing to say yet while the model is still loading.
    if (!this.structureNumberingReported) return;

    // Refuse to colour rather than risk a plausible-looking misalignment. The
    // precomputed route renders an AlphaFold entry that was not folded from this
    // sequence, and nobody can eyeball that residue 200 got position 200's LLR.
    // The map below is keyed 1..positions, so a matching residue count is not
    // enough: the model has to be numbered that way too, or a chain starting at
    // 20 (or one carrying a ligand) gets coloured with a constant offset.
    const positions = this.result.colKeys.length;
    const numbering = this.structureResidueNumbering;
    if (numbering === null
        || numbering.count !== positions
        || numbering.min !== 1
        || numbering.max !== positions) {
      this.structureColoringUnavailable = true;
      console.warn(
        '[effect-prediction] structure residues ' +
        (numbering === null
          ? 'could not be read'
          : `are ${numbering.min}-${numbering.max} (${numbering.count} distinct)`) +
        ` but the prediction covers positions 1-${positions}; skipping LLR colouring.`,
      );
      return;
    }

    // Same domain the heatmap uses, so a colour means the same LLR in both.
    const flat = this.result.values.flat();
    const dataMin = Math.min(...flat);
    const dataMax = Math.max(...flat);

    const colors: ProteinResidueColors = {};
    this.aggregateByPosition(this.structureColorMode).forEach((value, colIdx) => {
      if (value === null) return;
      colors[colIdx + 1] = this.structureColorFor(value, dataMin, dataMax); // resi is 1-based
    });
    this.structureResidueColors = colors;
  }

  /**
   * The one place the LLR -> colour ramp is chosen. Currently the heatmap's own
   * scale, so a colour means the same LLR in both views. Note the ramp's stops
   * are absolute while ESM LLRs are overwhelmingly negative: on the example
   * protein 320 of 360 positions land in its single [min, -2) segment under
   * Average LLR, leaving almost all the structure's visible variation to the
   * other 40 residues. Max LLR spreads evenly across the stops. If that needs
   * rescaling, this function is the only thing to change.
   */
  private structureColorFor(value: number, dataMin: number, dataMax: number): string {
    return this.service.getColorFor(value, dataMin, dataMax);
  }

  // Single definition of the structure panel's visibility: every error path
  // clears simplefoldLoading without setting pdbData, so omitting simplefoldError
  // here unmounts the panel instead of showing its error state.
  get showStructurePanel(): boolean {
    return !!this.simplefoldPdbData || this.simplefoldLoading || this.simplefoldError;
  }

  /** Residues in the submitted sequence, counted the way the submit path counted them. */
  get sequenceResidueCount(): number {
    return residueCount(this.sequence || '');
  }

  /**
   * True when this job never asked for a structure because the sequence was too long
   * to fold. The submit path omits simplefold_job_id above MAX_STRUCTURE_RESIDUES, so
   * the panel is absent for a reason only the submitter was told. The length test is
   * what keeps this off a short job whose id has not arrived in this status response
   * yet, and off the precomputed example, which is 360 residues and loads from
   * AlphaFold rather than simplefold.
   */
  get structureOmittedForLength(): boolean {
    return !this.jobInfo.simplefold_job_id
      && this.sequenceResidueCount > this.maxStructureResidues;
  }

  /**
   * Gives a simplefold job slowStructureDelayMs of bare spinner on screen before
   * the note explaining the wait appears. Called from both places the
   * precondition can become true, in either order: when the results panel
   * mounts (showResults) and when the simplefold poller starts
   * (simplefoldLoading). Before the panel mounts the spinner is behind
   * display:none, and a timer started then would have expired long before
   * anyone saw it. The precomputed example loads from AlphaFold and never sets
   * simplefoldJobId, so it gets the spinner but never a note about a prediction
   * that is not running.
   *
   * The timer is not cancelled when the structure lands first: the note is
   * gated on simplefoldLoading in the template, so a late flag is invisible.
   * The subscription is cleaned up with the rest on destroy.
   */
  private armSlowStructureNote(): void {
    if (!this.showResults || !this.simplefoldLoading || !this.simplefoldJobId) return;
    this.structureSlow = false;
    this.subscriptions.push(
      timer(this.slowStructureDelayMs).subscribe(() => { this.structureSlow = true; })
    );
  }

  private startSimplefoldPolling(simplefoldJobId?: string): void {
    // statusResponse$ is cold: the template's `| async` subscribes once and
    // <app-loading> re-subscribes on every poll tick, so this is called
    // repeatedly for the same job. Only ever start one poller.
    if (this.isPollingSimplefold) return;

    if (this.service.shouldUsePrecomputedResult(this.jobId)) {
      // For precomputed jobs, load from AlphaFold using the known UniProt ID
      this.isPollingSimplefold = true;
      this.simplefoldLoading = true;
      this.subscriptions.push(
        this.alphafoldService.get3DProtein(this.precomputedUniprotId).subscribe({
          next: (pdbData) => {
            this.simplefoldPdbData = pdbData;
            this.simplefoldLoading = false;
          },
          error: () => {
            this.simplefoldError = true;
            this.simplefoldLoading = false;
          },
        })
      );
      return;
    }

    // Deliberately not latched: an early status response may not carry the
    // simplefold id yet, and a later one will.
    if (!simplefoldJobId) return;

    this.isPollingSimplefold = true;
    this.simplefoldJobId = simplefoldJobId;
    this.simplefoldLoading = true;
    this.armSlowStructureNote();

    this.subscriptions.push(
      timer(0, 10000).pipe(
        switchMap(() => this.service.getSimplefoldStatus(simplefoldJobId)),
        takeWhile((job) => job.phase !== 'completed' && job.phase !== 'error', true),
      ).subscribe({
        next: (job) => {
          if (job.phase === 'completed') {
            this.subscriptions.push(
              this.service.getSimplefoldResult(simplefoldJobId).subscribe({
                next: (cifData) => {
                  this.simplefoldPdbData = cifData;
                  this.simplefoldDataFormat = 'cif';
                  this.simplefoldLoading = false;
                },
                error: () => {
                  this.simplefoldError = true;
                  this.simplefoldLoading = false;
                },
              })
            );
          } else if (job.phase === 'error') {
            this.simplefoldError = true;
            this.simplefoldLoading = false;
          }
        },
        error: () => {
          this.simplefoldError = true;
          this.simplefoldLoading = false;
        },
      })
    );
  }

  /**
   * The structure export entry. It no-ops whenever there is no pdb data, which is a
   * steady state for a sequence too long to fold, not just a moment during loading or
   * after an error, so the item is disabled rather than silently doing nothing.
   *
   * `disabled` is a live getter, not a stored flag. PrimeNG re-reads the property off
   * this same object on every change detection pass, so the item tracks the data
   * without anything having to push updates into it: no write site of
   * `simplefoldPdbData` has to remember a flag, and the array keeps its identity, which
   * a recomputed `exportOptions` would not. A new array on each pass re-enters the
   * `model` setter and rebuilds the menu's internal items, disturbing the open popup
   * and the Heatmap submenu.
   *
   * Both menu components are OnPush, so the rendered state settles when the popup
   * opens rather than while it is open: a structure that finishes loading under an
   * already-open menu shows as enabled on the next open. That is the only stale case,
   * and it costs one reopen. Pushing the update in would mean every writer of
   * `simplefoldPdbData` marking the menu for check, which is the coupling this avoids.
   */
  private proteinStructureExportItem(): MenuItem {
    const component = this;
    return {
      label: 'Protein Structure',
      get disabled(): boolean {
        return !component.simplefoldPdbData;
      },
      command: () => component.exportProteinStructure(),
    };
  }

  exportProteinStructure(): void {
    if (!this.simplefoldPdbData) return;
    const ext = this.simplefoldDataFormat === 'cif' ? 'cif' : 'pdb';
    const blob = new Blob([this.simplefoldPdbData], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `protein_structure.${ext}`;
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
  }

  clearAll(): void {
    this.selectedPositions = [];
    this.selectedCells = [];
    this.mutedPositions = [];
    this.mutedCells = [];
    this.syncViewerSelections();
  }

  /* ------------------------------ Utils ------------------------------ */
  togglePosition(position: number): void {
    const idx = this.selectedPositions.indexOf(position);
    let newPositions: number[];
    if (idx >= 0) {
      newPositions = this.selectedPositions.filter((_, i) => i !== idx);
    } else {
      newPositions = [...this.selectedPositions, position];
    }
    this.selectedPositions = newPositions;
    this.selectedCells = this.generateCellsFromPositions(newPositions);
    this.syncViewerSelections();
  }

  syncViewerSelections(): void {
    const selections: ResidueSelection[] = this.selectedPositions.map(pos => ({
      resi: pos + 1, // positions are 0-based, resi is 1-based
      resn: '',
      chain: 'A',
    }));
    this.proteinSelectionService.setSelections(this.viewerId, selections);
  }

  scrollPageToMutationEffectSection(): void {
    const sectionEl = this.mutationEffectSection?.nativeElement;
    if (!sectionEl) return;
    sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  scrollTableToPosition(position: number): void {
    // Under virtual scrolling only the visible window of rows exists in the DOM,
    // so the row for a position further down the list cannot be looked up by
    // selector. Scroll by index instead -- but read the index out of the table's
    // own processed array, never out of tableValues.
    //
    // sortSingle() sorts in place and then does `this._value = [...this.value]`,
    // and `value` is a getter over `_value`. So the first sort reorders the array
    // we passed in and then repoints the table at a copy of it; every sort after
    // that reorders only the copy, while tableValues stays frozen at the first
    // sort's order. Since `[value]="tableValues"` keeps the same reference, the
    // setter never runs again to resync it. Two clicks on one header is enough to
    // make an index taken from tableValues point at an unrelated row.
    const rows = (this.resultTable.filteredValue ?? this.resultTable.value ?? []) as any[];
    const index = rows.findIndex((row) => row.position === position);
    if (index < 0) return;

    this.resultTable.scrollToVirtualIndex(index);

    // Scroller.scrollToIndex only assigns its rendered window (`first`) when it
    // believes the scroll position changed, and it decides that by comparing
    // against the position read *before* it scrolls. At rest that comparison is
    // false, so it moves the DOM scroll position and leaves the rendered rows
    // stale. Re-firing the scroll event it would have seen from a user drag
    // resynchronises the window with where it actually scrolled to.
    const scroller = (this.resultTable.el.nativeElement as HTMLElement)
      .querySelector('.p-scroller');
    // Not bubbling: the listener is bound on .p-scroller itself, and a synthetic
    // scroll reaching shared ancestors would hide any open PrimeNG overlay.
    scroller?.dispatchEvent(new Event('scroll'));
  }

  generateCellsFromPositions(positions: number[]): HeatmapCellLocations {
    const columns = Array.from({ length: this.numColumns }, (_, i) => i);
    return positions.map((position) =>
        columns.map((col) => [col, position] as [number, number])
      ).flat();
  }
}
