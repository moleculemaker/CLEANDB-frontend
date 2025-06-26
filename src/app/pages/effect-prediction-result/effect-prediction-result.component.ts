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
import { Molecule3dComponent } from '~/app/components/molecule3d/molecule3d.component';
import { ScoreChipComponent } from "../../components/score-chip/score-chip.component";

@Component({
  selector: 'app-effect-prediction-result',
  templateUrl: './effect-prediction-result.component.html',
  styleUrls: ['./effect-prediction-result.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    LoadingComponent,
    PanelModule,
    TableModule,
    EffectPredictionComponent,
    HeatmapComponent,
    JobTabComponent,
    Molecule3dComponent,
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

  columns = [
    // Column for exports
  ];
  currentPage                   = 'result';
  jobId: string                 = this.route.snapshot.paramMap.get("id") || "example-id";
  jobInfo: any                  = {};
  jobType: JobType              = JobType.Somn;  //TODO: use the correct job type
  numColumns                    = 20;
  results: any                  = null;          //TODO: update results 
  showResults                   = false;
  subscriptions: Subscription[] = [];
  tableValues: any[] = [];

  statusResponse$
    = this.service.getResultStatus(this.jobType, this.jobId).pipe(
      tap((job) => {
        this.jobId = {
          ...JSON.parse(job.job_info || '{}'),
          email: job.email || '',
        };
      }),
    );

  /* --------------------------- For testing purpose -------------------------- */
  mutedCells: HeatmapCellLocations = [];
  mutedPositions: number[] = [];
  previousSelectedPositions: number[] = [];
  result: EffectPredictionResult;
  sequence = 'SFVKDFKPQALGDTNLFKPIKIGNNELLHRAVIPPLTRMRALHPGNIPNRDWAVEYYTQRAQRPGTMIITEGAFISPQAGGYDNAPGVWSEEQMVEWTKIFNAIHEKKSFVWVQLWVLGWAAFPDNLARDGLRYDSASDNVFMDAEQEAKAKKANNPQHSLTKDEIKQYIKEYVQAAKNSIAAGADGVEIHSANGYLLNQFLDPHSNTRTDEYGGSIENRARFTLEVVDALVEAIGHEKVGLRLSPYGVFNSMSGGAETGIVAQYAYVAGELEKRAKAGKRLAFVHLVEPRVTNPFLTEGEGEYEGGSNDFVYSIWKGPVIRAGNFALHPEVVREEVKDKRTLIGYGRFFISNPDLVDRLEKGLPLNKYDRDTFYQMSAHGYIDYPTYEEALKLGWDKK';
  selectedPositions: number[] = [];
  selectedCells: HeatmapCellLocations = [];

  constructor(
    private service: CleanDbService,
    private route: ActivatedRoute,
  ) {
    this.service.getEffectPredictionResult('precomputed').subscribe((result) => {
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
            score: value,
          });
        });
      });

      tableValues.sort((a, b) => a.position - b.position);
      this.tableValues = tableValues;

      this.mutedPositions = [1, 2, 3];
      this.mutedCells = this.generateCellsFromPositions(this.mutedPositions);
    });
  }

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
        this.service.getEffectPredictionResult(this.jobId)
          .subscribe((data) => {
            this.showResults = true;
            this.results = data;
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
