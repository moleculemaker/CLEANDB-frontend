import { Component, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import { JobType } from '~/app/api/mmli-backend/v1';
import { LoadingComponent } from '~/app/components/loading/loading.component';
import { JobTabComponent } from "~/app/components/job-tab/job-tab.component";

import { CleanDbService, EffectPredictionResult } from '~/app/services/clean-db.service';
import { EffectPredictionComponent } from '~/app/pages/effect-prediction/effect-prediction.component';
import { Subscription, tap } from 'rxjs';
import { PanelModule } from 'primeng/panel';
import { Table, TableModule } from 'primeng/table';
import { SequencePositionSelectorComponent } from '~/app/components/sequence-position-selector/sequence-position-selector.component';
import { HeatmapCellLocations, HeatmapComponent } from '~/app/components/heatmap/heatmap.component';
import { ScoreChipComponent } from "../../components/score-chip/score-chip.component";
import { TooltipModule } from 'primeng/tooltip';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TieredMenuModule } from 'primeng/tieredmenu';
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
    SequencePositionSelectorComponent,
    ScoreChipComponent
],
  host: {
    class: 'flex flex-col h-full',
  }
})
export class EffectPredictionResultComponent implements OnDestroy {
  @ViewChild('heatmap') heatmap: HeatmapComponent;
  @ViewChild('resultTable') resultTable: Table;

  columns                                   = [
    { field: 'position', header: 'Position' },
    { field: 'mutationLabelExport', header: 'Mutation (Export)' },
    { field: 'score', header: 'Score' }
  ];
  currentPage                               = 'result';
  exportOptions: MenuItem[]                 = [
    {
      label: 'Table (CSV)',
      command: () => this.resultTable.exportCSV()
    },
    {
      label: 'Heatmap',
      items: [
        // { label: 'SVG', command: () => this.heatmap.exportAs('svg') },
        { label: 'PNG', command: () => this.heatmap.exportAs('png') },
        { label: 'JPEG', command: () => this.heatmap.exportAs('jpeg') },
      ]
    }
  ];
  jobId: string                             = this.route.snapshot.paramMap.get("id") || "precomputed";
  jobInfo: any                              = {};
  jobType: JobType                          = JobType.CleandbMepesm;
  previousSelectedPositions: number[]       = [];
  mutedCells: HeatmapCellLocations          = [];
  mutedPositions: number[]                  = [];
  numColumns                                = 20;
  requestOptions: MenuItem[]                = [
    
  ];
  result: EffectPredictionResult;
  selectedCells: HeatmapCellLocations       = [];
  selectedPositions: number[]               = [];
  showResults                               = false;
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
      }),
    );

  constructor(
    private service: CleanDbService,
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

      this.resultTable.el.nativeElement.querySelector(`[data-position="${minPosition + 1}"]`).scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
    this.previousSelectedPositions = [...this.selectedPositions];
    this.selectedPositions = newPositions;
  }

  /* ------------------------------ Utils ------------------------------ */
  generateCellsFromPositions(positions: number[]): HeatmapCellLocations {
    const columns = Array.from({ length: this.numColumns }, (_, i) => i);
    return positions.map((position) => 
        columns.map((col) => [col, position] as [number, number])
      ).flat();
  }
}
