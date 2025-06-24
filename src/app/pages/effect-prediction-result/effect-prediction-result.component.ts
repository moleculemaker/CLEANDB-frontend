import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

import { JobType } from '~/app/api/mmli-backend/v1';
import { LoadingComponent } from '~/app/components/loading/loading.component';
import { JobTabComponent } from "~/app/components/job-tab/job-tab.component";

import { CleanDbService } from '~/app/services/clean-db.service';
import { EffectPredictionComponent } from '~/app/pages/effect-prediction/effect-prediction.component';
import { Subscription, tap } from 'rxjs';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { SequencePositionSelectorComponent } from '~/app/components/sequence-position-selector/sequence-position-selector.component';
import { HeatmapComponent } from '~/app/components/heatmap/heatmap.component';
import { Molecule3dComponent } from '~/app/components/molecule3d/molecule3d.component';

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
  ],
  host: {
    class: 'flex flex-col h-full',
  }
})
export class EffectPredictionResultComponent implements OnDestroy {
  columns                       = [];
  currentPage                   = 'input';
  jobId: string                 = this.route.snapshot.paramMap.get("id") || "example-id";
  jobInfo: any                  = {};
  jobType: JobType              = JobType.Somn;  //TODO: use the correct job type
  results: any                  = null;          //TODO: update results 
  showResults                   = false;
  subscriptions: Subscription[] = [];

  statusResponse$
    = this.service.getResultStatus(this.jobType, this.jobId).pipe(
      tap((job) => {
        this.jobId = {
          ...JSON.parse(job.job_info || '{}'),
          email: job.email || '',
        };
      }),
    );

  constructor(
    private service: CleanDbService,
    private route: ActivatedRoute,
  ) {
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
}
