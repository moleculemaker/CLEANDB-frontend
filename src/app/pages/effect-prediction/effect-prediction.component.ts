import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
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
import { Subscription } from "rxjs";

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

    JobTabComponent,
    QueryInputComponent,
  ],
  host: {
    class: "flex flex-col h-full"
  }
})
export class EffectPredictionComponent implements OnChanges {
  @Input() formValue!: any; // TODO: update type
  @Input() showJobTab = true;
  
  currentPage = 'input';
  example = {
    sequence: '>sp|Q29476|ST1A1_CANLF Sulfotransferase 1A1 OS=Canis lupus familiaris OX=9615 GN=SULT1A1 PE=1 SV=1\nMEDIPDTSRPPLKYVKGIPLIKYFAEALESLQDFQAQPDDLLISTYPKSGTTWVSEILDMIYQDGDVEKCRRAPVFIRVPFLEFKAPGIPTGLEVLKDTPAPRLIKTHLPLALLPQTLLDQKVKVVYVARNAKDVAVSYYHFYRMAKVHPDPDTWDSFLEKFMAGEVSYGSWYQHVQEWWELSHTHPVLYLFYEDMKENPKREIQKILKFVGRSLPEETVDLIVQHTSFKEMKNNSMANYTTLSPDIMDHSISAFMRKGISGDWKTTFTVAQNERFDADYAKKMEGCGLSFRTQL',
    positions: {
      "selectedOption": "positions",
      "value": [ 138, 145 ],
      "valueLabel": "138-145"
    }
  }
  exampleUsed = false;
  form = new FormGroup({
    email: new FormControl("", [Validators.email]),
    sequence: new FormControl(""),
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
      this.form.valueChanges.subscribe((v) => {
        this.exampleUsed
          = v.positions?.value[0] === this.example.positions.value[0]
          && v.positions?.value[1] === this.example.positions.value[1]
          && v.sequence === this.example.sequence;
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['formValue'] && changes['formValue'].currentValue) {
      this.form.patchValue(this.formValue);
    }
  }

  useExample() {
    this.form.patchValue(this.example);
  }

  clearAll() {
    this.form.reset();
  }

  onSubmit() {
    if (!this.form.valid) {
      return;
    }

    console.log('submitting value: ', this.form.value);

    this.service.createAndRunJob(
      JobType.Somn, //TODO: use the correct job type
      { 
        job_info: JSON.stringify({
          // TODO: add job info here
        }),
        email: this.form.controls["email"].value || '',
      }
    ).subscribe((response) => {
      this.router.navigate(['effect-prediction', 'result', response.job_id]);
    })
  }
}
