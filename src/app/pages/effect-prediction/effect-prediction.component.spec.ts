import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideEnvironmentServiceStub } from '~/app/testing/environment-service.stub';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { of } from 'rxjs';

import { EffectPredictionComponent } from './effect-prediction.component';
import { CleanDbService } from '~/app/services/clean-db.service';
import { Job } from '~/app/api/mmli-backend/v1';

describe('EffectPredictionComponent', () => {
  let component: EffectPredictionComponent;
  let fixture: ComponentFixture<EffectPredictionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EffectPredictionComponent],
      providers: [provideNoopAnimations(), provideEnvironmentServiceStub(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EffectPredictionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('structure prediction bound', () => {
    /** A FASTA record whose body is `length` residues, optionally stop-terminated. */
    const fasta = (length: number, stopCodon = false) =>
      `>test\n${'A'.repeat(length)}${stopCodon ? '*' : ''}`;

    const enter = (sequence: string) => component.form.patchValue({ sequence });

    it('requests a structure at exactly the bound', () => {
      enter(fasta(component.maxStructureResidues));

      expect(component.sequenceLength).toBe(component.maxStructureResidues);
      expect(component.structurePredictionAvailable).toBeTrue();
    });

    it('skips the structure one residue above the bound', () => {
      enter(fasta(component.maxStructureResidues + 1));

      expect(component.sequenceLength).toBe(component.maxStructureResidues + 1);
      expect(component.structurePredictionAvailable).toBeFalse();
    });

    it('does not count a trailing stop codon as a residue', () => {
      // The validator drops one trailing `*` before it measures, so a sequence the
      // form accepts as exactly the bound must not be measured here as one over.
      enter(fasta(component.maxStructureResidues, true));

      expect(component.sequenceLength).toBe(component.maxStructureResidues);
      expect(component.structurePredictionAvailable).toBeTrue();
    });

    it('requests no structure for an empty form', () => {
      expect(component.sequenceLength).toBe(0);
      expect(component.structurePredictionAvailable).toBeFalse();
    });

    it('still accepts sequences ESM-2 can handle but simplefold cannot', () => {
      enter(fasta(component.maxResidues));

      expect(component.form.controls['sequence'].valid).toBeTrue();
      expect(component.structurePredictionAvailable).toBeFalse();
    });
  });
  describe('submitted output', () => {
    let navigate: jasmine.Spy;
    let emitted: string[];

    beforeEach(() => {
      navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      emitted = [];
      component.submitted.subscribe((jobId) => emitted.push(jobId));
    });

    it('emits the precomputed id before navigating when the example is submitted', () => {
      component.form.patchValue({ sequence: '>example\nACDEFGHIKL' });
      component.exampleUsed = true;

      component.onSubmit();

      expect(emitted).toEqual(['precomputed']);
      expect(navigate).toHaveBeenCalledWith(['effect-prediction', 'result', 'precomputed']);
    });

    it('emits the created job id once the submission resolves', () => {
      const service = TestBed.inject(CleanDbService);
      spyOn(service, 'createSimplefoldJob').and.returnValue(of({ job_id: 'simplefold-1' } as Job));
      spyOn(service, 'createAndRunJob').and.returnValue(of({ job_id: 'job-b' } as Job));
      component.form.patchValue({ sequence: '>test\nACDEFGHIKL' });
      component.exampleUsed = false;

      component.onSubmit();

      expect(emitted).toEqual(['job-b']);
      expect(navigate).toHaveBeenCalledWith(['effect-prediction', 'result', 'job-b']);
    });
  });
  describe('resubmitting a loaded job', () => {
    const loadedJob = { job_id: 'job-a', sequence_name: '>test', sequence: 'ACDEFGHIKL', positions: [], email: 'a@b.c' };
    let navigate: jasmine.Spy;
    let createAndRunJob: jasmine.Spy;
    let emitted: string[];

    beforeEach(() => {
      const service = TestBed.inject(CleanDbService);
      spyOn(service, 'createSimplefoldJob').and.returnValue(of({ job_id: 'simplefold-1' } as Job));
      createAndRunJob = spyOn(service, 'createAndRunJob').and.returnValue(of({ job_id: 'job-b' } as Job));
      navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
      emitted = [];
      component.submitted.subscribe((jobId) => emitted.push(jobId));

      component.formValue = loadedJob;
      component.ngOnChanges({ formValue: new SimpleChange(null, loadedJob, true) });
      component.exampleUsed = false;
    });

    it('returns to the loaded job instead of creating a duplicate when the request is unchanged', () => {
      expect(component.requestUnchanged).toBeTrue();

      component.onSubmit();

      expect(createAndRunJob).not.toHaveBeenCalled();
      expect(emitted).toEqual(['job-a']);
      expect(navigate).toHaveBeenCalledWith(['effect-prediction', 'result', 'job-a']);
    });

    it('creates a new job once the sequence differs', () => {
      component.form.patchValue({ sequence: '>test\nACDEFGHIKLM' });
      expect(component.requestUnchanged).toBeFalse();

      component.onSubmit();

      expect(createAndRunJob).toHaveBeenCalled();
      expect(emitted).toEqual(['job-b']);
    });

    it('creates a new job once the header differs', () => {
      component.form.patchValue({ sequence: '>renamed\nACDEFGHIKL' });

      expect(component.requestUnchanged).toBeFalse();
    });

    // Email is a notification setting, not part of the prediction request.
    it('treats an email-only change as the same request', () => {
      component.form.patchValue({ email: 'other@b.c' });

      expect(component.requestUnchanged).toBeTrue();
    });

    it('is never unchanged on the standalone page, which has no loaded job', () => {
      component.formValue = null;

      expect(component.requestUnchanged).toBeFalse();
    });
  });
});
