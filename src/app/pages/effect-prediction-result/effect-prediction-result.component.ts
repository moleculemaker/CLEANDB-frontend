import {Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import { JobType } from '~/app/api/mmli-backend/v1';
import { LoadingComponent } from '~/app/components/loading/loading.component';
import { JobTabComponent } from "~/app/components/job-tab/job-tab.component";

import { CleanDbService, EffectPredictionResult } from '~/app/services/clean-db.service';
import { EffectPredictionComponent } from '~/app/pages/effect-prediction/effect-prediction.component';
import { timer, Subscription, switchMap, takeWhile, tap } from 'rxjs';
import { PanelModule } from 'primeng/panel';
import { Table, TableModule } from 'primeng/table';
import { SequencePositionSelectorComponent } from '~/app/components/sequence-position-selector/sequence-position-selector.component';
import { HeatmapCellLocations, HeatmapComponent } from '~/app/components/heatmap/heatmap.component';
import { ScoreChipComponent } from "../../components/score-chip/score-chip.component";
import { ProteinViewerComponent } from '~/app/components/protein-viewer/protein-viewer.component';
import { ProteinViewerStyle, ProteinColorScheme, ProteinResidueColors, ResidueSelection } from '~/app/models/protein-viewer';
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
    { label: 'Protein Structure', command: () => this.exportProteinStructure() },
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
  structureColorMode: StructureColorMode    = 'average';
  structureResidueColors: ProteinResidueColors | null = null;
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
  private structureResidueCount: number | null = null;

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

  onStructureResidueCount(count: number | null): void {
    this.structureResidueCount = count;
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

    if (this.structureColorMode === 'single') return;
    if (!this.result?.values?.length || !this.result.colKeys?.length) return;

    // Refuse to colour rather than risk a plausible-looking misalignment. The
    // precomputed route renders an AlphaFold entry that was not folded from this
    // sequence, and nobody can eyeball that residue 200 got position 200's LLR.
    if (this.structureResidueCount === null) return;
    if (this.structureResidueCount !== this.result.colKeys.length) {
      console.warn(
        `[effect-prediction] structure has ${this.structureResidueCount} residues but the ` +
        `prediction covers ${this.result.colKeys.length} positions; skipping LLR colouring.`,
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
    // selector. Scroll by index instead: PrimeNG's sortSingle() sorts the bound
    // array in place, so tableValues is always in the table's current order.
    const index = this.tableValues.findIndex((row) => row.position === position);
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
    scroller?.dispatchEvent(new Event('scroll', { bubbles: true }));
  }

  generateCellsFromPositions(positions: number[]): HeatmapCellLocations {
    const columns = Array.from({ length: this.numColumns }, (_, i) => i);
    return positions.map((position) =>
        columns.map((col) => [col, position] as [number, number])
      ).flat();
  }
}
