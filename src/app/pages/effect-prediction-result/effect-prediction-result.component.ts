import { Component, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import { JobType } from '~/app/api/mmli-backend/v1';
import { LoadingComponent } from '~/app/components/loading/loading.component';
import { JobTabComponent } from "~/app/components/job-tab/job-tab.component";

import { CleanDbService, EffectPredictionResult } from '~/app/services/clean-db.service';
import { EffectPredictionComponent } from '~/app/pages/effect-prediction/effect-prediction.component';
import { interval, Subscription, switchMap, takeWhile, tap } from 'rxjs';
import { PanelModule } from 'primeng/panel';
import { Table, TableModule } from 'primeng/table';
import { SequencePositionSelectorComponent } from '~/app/components/sequence-position-selector/sequence-position-selector.component';
import { HeatmapCellLocations, HeatmapComponent } from '~/app/components/heatmap/heatmap.component';
import { ScoreChipComponent } from "../../components/score-chip/score-chip.component";
import { ProteinViewerComponent } from '~/app/components/protein-viewer/protein-viewer.component';
import { ProteinViewerStyle, ProteinColorScheme, ResidueSelection } from '~/app/models/protein-viewer';
import { ProteinSelectionService } from '~/app/services/protein-selection.service';
import { AlphafoldService } from '~/app/services/alphafold.service';
import { TooltipModule } from 'primeng/tooltip';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MenuItem } from 'primeng/api';

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
    ProgressSpinnerModule
],
  host: {
    class: 'flex flex-col h-full',
  }
})
export class EffectPredictionResultComponent implements OnDestroy {
  @ViewChild('heatmap') heatmap: HeatmapComponent;
  @ViewChild('resultTable') resultTable: Table;

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
  previousSelectedPositions: number[]       = [];
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
  viewerStyle: ProteinViewerStyle           = 'cartoon';
  viewerColorScheme: ProteinColorScheme     = 'default';
  highlightColor                            = '#FF4444';
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
        })
      );
    }
  }

  onSelectedPositionsChange(newPositions: number[]): void {
    this.selectedCells = this.generateCellsFromPositions(newPositions);
    if (newPositions.length > 0) {
      const oldPositionSet = new Set(this.previousSelectedPositions);
      const newPositionSet = new Set(newPositions);
      //@ts-ignore
      const diff: number[] = Array.from(newPositionSet.difference(oldPositionSet));
      const minPosition = Math.min(...diff);
      this.heatmap.scrollToCol(minPosition);
      this.scrollTableToPosition(minPosition + 1); // table uses 1-based positions
    }
    this.previousSelectedPositions = [...this.selectedPositions];
    this.selectedPositions = newPositions;
    this.syncViewerSelections();
  }

  onResidueClicked(residue: ResidueSelection): void {
    const position = residue.resi - 1; // resi is 1-based, positions are 0-based
    this.togglePosition(position);
    this.heatmap.scrollToCol(position);
    this.scrollTableToPosition(position + 1); // table uses 1-based positions
  }

  private startSimplefoldPolling(simplefoldJobId?: string): void {
    if (this.service.shouldUsePrecomputedResult(this.jobId)) {
      // For precomputed jobs, load from AlphaFold using the known UniProt ID
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

    if (!simplefoldJobId) return;

    this.simplefoldJobId = simplefoldJobId;
    this.simplefoldLoading = true;

    this.subscriptions.push(
      interval(3000).pipe(
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

  /* ------------------------------ Utils ------------------------------ */
  togglePosition(position: number): void {
    const idx = this.selectedPositions.indexOf(position);
    let newPositions: number[];
    if (idx >= 0) {
      newPositions = this.selectedPositions.filter((_, i) => i !== idx);
    } else {
      newPositions = [...this.selectedPositions, position];
    }
    this.previousSelectedPositions = [...this.selectedPositions];
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

  scrollTableToPosition(position: number): void {
    this.resultTable.el.nativeElement.querySelector(`[data-position="${position}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }

  generateCellsFromPositions(positions: number[]): HeatmapCellLocations {
    const columns = Array.from({ length: this.numColumns }, (_, i) => i);
    return positions.map((position) => 
        columns.map((col) => [col, position] as [number, number])
      ).flat();
  }
}
