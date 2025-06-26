import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from "@angular/core";
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { CheckboxModule } from "primeng/checkbox";
import { ButtonModule } from "primeng/button";
import { CommonModule } from "@angular/common";

import { JobTabComponent } from "~/app/components/job-tab/job-tab.component";
import { CleanDbService } from '~/app/services/clean-db.service';
import { PanelModule } from "primeng/panel";
import { QueryInputComponent } from "~/app/components/query-input/query-input.component";
import { QueryValue, RangeSearchOption, SearchOption } from "~/app/models/search-options";
import { InputTextareaModule } from "primeng/inputtextarea";
import { JobType } from "~/app/api/mmli-backend/v1";
import { combineLatestWith, map, Subscription, tap } from "rxjs";
import { getFasta, getSeq } from "~/app/utils/fasta";
import { InputTextModule } from "primeng/inputtext";

@Component({
  selector: 'app-effect-prediction',
  templateUrl: './effect-prediction.component.html',
  styleUrls: ['./effect-prediction.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CheckboxModule,
    ButtonModule,
    PanelModule,
    InputTextareaModule,
    InputTextModule,

    JobTabComponent,
    QueryInputComponent,
  ],
  host: {
    class: "flex flex-col h-full"
  }
})
export class EffectPredictionComponent implements OnChanges, OnDestroy {
  @Input() formValue!: any;    // TODO: update type to support positions
  @Input() showJobTab = true;
  
  currentPage = 'input';
  example: any = null;
  exampleUsed: boolean = false;
  form = new FormGroup({
    email: new FormControl("", [Validators.email]),
    sequence: new FormControl("", [Validators.required]),
    positions: new FormControl<QueryValue | null>(null),
    agreeToSubscription: new FormControl(false),
  });
  searchConfigs: SearchOption[] = [
    new RangeSearchOption({
      key: 'positions',
      label: 'Positions (Optional)',
      placeholder: 'Enter an amino acid position or range',
      example: {
        label: '138-145',
        value: [138, 145],
        valueLabel: '138-145',
      },
      min: 0,
    })
  ];
  subscriptions: Subscription[] = [];
 
  constructor(
    private service: CleanDbService,
    private router: Router,
  ) {
    this.subscriptions.push(
      this.service.getResultStatus(JobType.CleandbMepesm, 'precomputed')
      .pipe(
        map((status) => {
          const jobInfo = JSON.parse(status.job_info || '{}');
          return {
            ...jobInfo,
            sequence: getFasta(jobInfo.sequence_name, jobInfo.sequence),
          }
        }),
        tap((v) => this.example = v),
        combineLatestWith(this.form.valueChanges),
        map(([example, formValue]) => example.sequence === formValue.sequence)
      ).subscribe((v) => this.exampleUsed = v)
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['formValue'] && changes['formValue'].currentValue) {
      this.form.patchValue({
        ...this.formValue,
        sequence: getFasta(this.formValue.sequence_name, this.formValue.sequence),
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  useExample(example: any) {
    this.form.patchValue(example);
  }

  clearAll() {
    this.form.reset();
  }

  onSubmit() {
    if (!this.form.valid) {
      return;
    }

    console.log('to submit', this.form.value);

    if (this.exampleUsed) {
      this.router.navigate(['effect-prediction', 'result', 'precomputed']);
      return;
    } 

    const { sequenceName, sequence } = getSeq(this.form.value.sequence || '');
    this.subscriptions.push(
      this.service.createAndRunJob(
        JobType.CleandbMepesm,
        { 
          job_info: JSON.stringify({
            sequence,
            sequence_name: sequenceName,
            positions: this.form.value.positions?.value || [],
          }),
          email: this.form.value.email || '',
        }
      ).subscribe((response) => 
        this.router.navigate(['effect-prediction', 'result', response.job_id])
      )
    );
  }
}
