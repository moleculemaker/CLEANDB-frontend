import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideEnvironmentServiceStub } from '~/app/testing/environment-service.stub';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { EffectPredictionResultComponent } from './effect-prediction-result.component';
import { EffectPredictionResult } from '~/app/services/clean-db.service';

describe('EffectPredictionResultComponent', () => {
  let component: EffectPredictionResultComponent;
  let fixture: ComponentFixture<EffectPredictionResultComponent>;

  /** Three sequence positions (WAG) over a two-residue alphabet. */
  const result: EffectPredictionResult = {
    rowKeys: ['A', 'G'],
    colKeys: ['W', 'A', 'G'],
    values: [
      [-3, 0, -1],
      [-2, -4, 0],
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EffectPredictionResultComponent],
      providers: [provideNoopAnimations(), provideEnvironmentServiceStub(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EffectPredictionResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('structure colouring guard', () => {
    beforeEach(() => {
      component.result = result;
    });

    it('colours the structure when the model is numbered 1..N over the predicted positions', () => {
      component.onStructureResidueNumbering({ count: 3, min: 1, max: 3 });

      expect(component.structureColoringUnavailable).toBeFalse();
      expect(Object.keys(component.structureResidueColors ?? {})).toEqual(['1', '2', '3']);
    });

    it('refuses to colour a model whose residue count matches but numbering is offset', () => {
      component.onStructureResidueNumbering({ count: 3, min: 20, max: 22 });

      expect(component.structureResidueColors).toBeNull();
      expect(component.structureColoringUnavailable).toBeTrue();
    });

    it('refuses to colour a model with the right bounds but extra residues in between', () => {
      // e.g. a ligand or a second chain numbered inside the same range.
      component.onStructureResidueNumbering({ count: 4, min: 1, max: 3 });

      expect(component.structureResidueColors).toBeNull();
      expect(component.structureColoringUnavailable).toBeTrue();
    });

    it('refuses to colour, and says so, when the viewer cannot read the numbering', () => {
      component.onStructureResidueNumbering(null);

      expect(component.structureResidueColors).toBeNull();
      expect(component.structureColoringUnavailable).toBeTrue();
    });

    it('stays quiet before the viewer has reported anything', () => {
      expect(component.structureColoringUnavailable).toBeFalse();
    });

    it('stays quiet in single-colour mode, which needs no alignment', () => {
      component.structureColorMode = 'single';
      component.onStructureResidueNumbering({ count: 3, min: 20, max: 22 });

      expect(component.structureResidueColors).toBeNull();
      expect(component.structureColoringUnavailable).toBeFalse();
    });
  });

  describe('missing structure explanation', () => {
    const load = (residues: number, jobInfo: any = {}, stopCodon = false) => {
      component.sequence = 'A'.repeat(residues) + (stopCodon ? '*' : '');
      component.jobInfo = jobInfo;
    };

    it('explains a structure that was never requested because the sequence was too long', () => {
      load(component.maxStructureResidues + 1);

      expect(component.structureOmittedForLength).toBeTrue();
      expect(component.sequenceResidueCount).toBe(component.maxStructureResidues + 1);
    });

    it('says nothing at exactly the bound, where the fold was requested', () => {
      load(component.maxStructureResidues);

      expect(component.structureOmittedForLength).toBeFalse();
    });

    it('does not count a trailing stop codon as the residue that crosses the bound', () => {
      load(component.maxStructureResidues, {}, true);

      expect(component.sequenceResidueCount).toBe(component.maxStructureResidues);
      expect(component.structureOmittedForLength).toBeFalse();
    });

    it('says nothing about a long job that did request a fold', () => {
      // Submitted before the bound existed: the panel shows its own loading or
      // error state, and length is not the reason for anything.
      load(component.maxStructureResidues + 1, { simplefold_job_id: 'abc' });

      expect(component.structureOmittedForLength).toBeFalse();
    });

    it('says nothing for the precomputed example, whose structure comes from AlphaFold', () => {
      // The fixture has already loaded it: 360 residues and no simplefold id, which
      // is the shape this getter must not mistake for an omitted fold.
      expect(component.jobInfo.simplefold_job_id).toBeUndefined();
      expect(component.sequenceResidueCount).toBe(360);
      expect(component.structureOmittedForLength).toBeFalse();
    });

    it('renders the explanation, so the getter is actually reachable from the page', () => {
      load(component.maxStructureResidues + 1);
      fixture.detectChanges();

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('No 3D structure was predicted for this job');
      expect(text).toContain(`${component.maxStructureResidues + 1} residues`);
    });

    it('says nothing before any sequence is known', () => {
      load(0);

      expect(component.structureOmittedForLength).toBeFalse();
    });
  });
});
