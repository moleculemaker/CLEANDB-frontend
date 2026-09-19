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
});
