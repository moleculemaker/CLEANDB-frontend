import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideEnvironmentServiceStub } from '~/app/testing/environment-service.stub';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { EffectPredictionComponent } from './effect-prediction.component';

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
});
