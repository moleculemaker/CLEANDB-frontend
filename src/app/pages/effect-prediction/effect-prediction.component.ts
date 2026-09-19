import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from "@angular/core";
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
import { combineLatestWith, map, Subscription, switchMap, tap } from "rxjs";
import { getFasta, getSingleSeq, residueCount } from "~/app/utils/fasta";
import { InputTextModule } from "primeng/inputtext";
import { SequenceValidatorDirective } from "~/app/directives/sequence-validator.directive";

/**
 * Longest sequence the STRUCTURE half will accept. Not a model limit: the same
 * submission starts an ml-simplefold job whose VRAM grows with length until it
 * exhausts the shared GPU (at 1022 it OOMs even running alone). Above this the fold
 * is skipped rather than the submission blocked, because the heatmap is the primary
 * result and ESM-2 handles the full 1022 fine. Shared with the result page, which
 * tells a later reader why the structure panel is absent.
 */
export const MAX_STRUCTURE_RESIDUES = 700;

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
    SequenceValidatorDirective,
  ],
  host: {
    class: "flex flex-col h-full"
  }
})
export class EffectPredictionComponent implements OnChanges, OnDestroy {
  @Input() formValue!: any;    // TODO: update type to support positions
  @Input() showJobTab = true;
  /**
   * The job id a submission resolved to, emitted just before navigating to it. The
   * result page that embeds this form needs it for the one case navigation cannot
   * cover: a resubmit that resolves to the job already on screen (the unchanged
   * precomputed example) is a same-URL navigation the router ignores.
   */
  @Output() submitted = new EventEmitter<string>();
  
  currentPage = 'input';
  example: any = null;
  exampleUsed: boolean = false;
  form = new FormGroup({
    email: new FormControl("", [Validators.email]),
    sequence: new FormControl("", [Validators.required]),
    positions: new FormControl<QueryValue | null>(null),
    agreeToSubscription: new FormControl(false),
  });
  maxSeqNum = 1;
  // ESM-2's own ceiling: 1024 context minus BOS/EOS. This is what the mutation
  // effect prediction can actually handle, and it is what the form accepts.
  maxResidues = 1022;
  maxStructureResidues = MAX_STRUCTURE_RESIDUES;
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
        tap((v) => this.example = {
          ...v,
          positions: this.getQueryValueFromPositions(v.positions),
        }),
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
        positions: this.getQueryValueFromPositions(this.formValue.positions),
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

    if (this.exampleUsed) {
      this.submitted.emit('precomputed');
      this.router.navigate(['effect-prediction', 'result', 'precomputed']);
      return;
    } 

    // Resubmitting the loaded job's own request would only queue a duplicate of a
    // result that already exists, so return to that result instead.
    if (this.requestUnchanged) {
      this.submitted.emit(this.formValue.job_id);
      this.router.navigate(['effect-prediction', 'result', this.formValue.job_id]);
      return;
    }

    const { sequenceName, sequence } = getSingleSeq(this.form.value.sequence || '');
    const email = this.form.value.email || '';
    const positions = this.form.value.positions?.value || [];

    // Above the structure bound, submit the MEP job alone. The result page already
    // treats a missing simplefold_job_id as "no structure" -- startSimplefoldPolling
    // returns early and the heatmap widens to full width -- so nothing downstream
    // needs to know why it is absent.
    const mepJob$ = (simplefoldJobId?: string) =>
      this.service.createAndRunJob(JobType.CleandbMepesm, {
        job_info: JSON.stringify({
          sequence, sequence_name: sequenceName, positions,
          ...(simplefoldJobId ? { simplefold_job_id: simplefoldJobId } : {}),
        }),
        email,
      });

    const submission$ = this.structurePredictionAvailable
      ? this.service.createSimplefoldJob(sequence, sequenceName, email).pipe(
          switchMap((simplefoldResponse) => mepJob$(simplefoldResponse.job_id)))
      : mepJob$();

    this.subscriptions.push(
      submission$.subscribe((response) => {
        this.submitted.emit(response.job_id);
        this.router.navigate(['effect-prediction', 'result', response.job_id]);
      })
    );
  }

  /** Length of the entered sequence, or 0 when nothing parseable is entered. */
  get sequenceLength(): number {
    return residueCount(getSingleSeq(this.form.value.sequence || '').sequence);
  }

  /**
   * True when the form would resubmit exactly the request the loaded job ran: same
   * header, residues and positions. Email is not part of the request, so changing
   * only it does not make a new job. Only a result page hands this form a job_id,
   * so on the standalone page this is always false.
   */
  get requestUnchanged(): boolean {
    const job = this.formValue;
    if (!job?.job_id) return false;
    const { sequenceName, sequence } = getSingleSeq(this.form.value.sequence || '');
    const positions = this.form.value.positions?.value || [];
    return sequenceName === job.sequence_name
      && sequence === job.sequence
      && JSON.stringify(positions) === JSON.stringify(job.positions || []);
  }

  /** Single source of truth for the notice and the submit path alike. */
  get structurePredictionAvailable(): boolean {
    const len = this.sequenceLength;
    return len > 0 && len <= this.maxStructureResidues;
  }

  /* ---------------------------------- Utils --------------------------------- */
  getQueryValueFromPositions(positions: number[]): QueryValue | null {
    return positions ? {
      selectedOption: 'positions',
      value: positions,
      valueLabel: positions.join('-'),
    } : null;
  }
}
