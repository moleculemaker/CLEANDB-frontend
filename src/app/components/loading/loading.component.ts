import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";
import { BehaviorSubject, interval, map, Observable, Subscription, switchMap } from "rxjs";
import { NgIf } from "@angular/common";
import { ProgressBarModule } from "primeng/progressbar";

import { JobStatus } from "~/app/api/mmli-backend/v1";

export interface WithPhaseAndTime {
  phase?: JobStatus;
  time_created?: number;
}

@Component({
    selector: "app-loading",
    templateUrl: "./loading.component.html",
    styleUrls: ["./loading.component.scss"],
    host: {
        class: "grow",
    },
    standalone: true,
    imports: [
      NgIf,
      ProgressBarModule,
    ],
})
export class LoadingComponent implements OnInit, OnDestroy {
  @Input() statusQuery$: Observable<WithPhaseAndTime> = new Observable();
  @Input() estimatedTime: number = 10 * 60;
  @Output() progressChange = new EventEmitter<number>();

  jobId: string = this.route.snapshot.paramMap.get("id") || "";

  estimatedTimeString: string = '';

  showError$ = new BehaviorSubject(false);
  value = 0;

  form = new FormGroup({
    agreeToSubscription: new FormControl(false),
    subscriberEmail: new FormControl("", [Validators.required, Validators.email]),
  });

  subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.updateEstimatedTimeString();

    this.subscriptions.push(
      interval(1000).pipe(
        switchMap(() => this.statusQuery$),
        map((status) => {
          switch (status.phase) {
            case JobStatus.Queued:
            case JobStatus.Processing:
              const jobStartedMs = (status.time_created || 0) * 1000;
              const jobElapsedMs = Date.now() - jobStartedMs;
              const coe = 2 / 5;
              const estimatedMs = this.estimatedTime * 1000;
              const decimalTime = (jobElapsedMs % estimatedMs) / estimatedMs;
              const wholeTime = Math.floor(jobElapsedMs / estimatedMs);
    
              let sum = 0;
              let i = 1;
              while (i < wholeTime && wholeTime >= 1) {
                sum += Math.pow(coe, i);
                i++;
              }
              sum += Math.pow(coe, i) * decimalTime;
              return sum * 100;
    
            case JobStatus.Completed:
              return 100;
    
            case JobStatus.Error:
              this.showError$.next(true);
              return 0;
          }
          return 0;
        })
      ).subscribe((value) => {
        this.value = value;
        this.progressChange.emit(value);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  private updateEstimatedTimeString(): void {
    const hours = Math.floor(this.estimatedTime / 3600);
    const minutes = Math.floor((this.estimatedTime % 3600) / 60);
    let resultString = '';
    if (hours > 0) {
      resultString += `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    if (minutes > 0) {
      resultString += `${resultString.length > 0 ? ' ' : ''}${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    
    this.estimatedTimeString = resultString;
  }
}
