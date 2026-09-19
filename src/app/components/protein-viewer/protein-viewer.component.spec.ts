import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProteinViewerComponent } from './protein-viewer.component';
import { ProteinResidueColors, ResidueNumbering } from '~/app/models/protein-viewer';

/**
 * 3Dmol is a CDN global the loader service reads straight off `window`, and it
 * is already there by the time Angular boots (blocking <script> in index.html),
 * so the viewer's subscription resolves synchronously. This stub keeps that
 * timing, which is the thing under test.
 */
function installFake3Dmol(resis: number[]): { addStyle: jasmine.Spy } {
  const addStyle = jasmine.createSpy('addStyle');
  (window as any).$3Dmol = {
    createViewer: () => ({
      addStyle,
      removeAllModels: () => {},
      addModel: () => {},
      selectedAtoms: () => resis.map(resi => ({ resi })),
      setStyle: () => {},
      setClickable: () => {},
      render: () => {},
      zoomTo: () => {},
      zoom: () => {},
      clear: () => {},
    }),
  };
  return { addStyle };
}

@Component({
  standalone: true,
  imports: [ProteinViewerComponent],
  template: `<app-protein-viewer
      [pdbData]="pdb"
      [residueColors]="colors"
      (residueNumberingChange)="onNumbering($event)"></app-protein-viewer>`,
})
class HostComponent {
  pdb = 'ATOM      1  N   MET A   1';
  colors: ProteinResidueColors | null = null;
  numbering: ResidueNumbering | null = null;

  // Mirrors EffectPredictionResultComponent: record the numbering, then derive
  // and assign the colour map that is bound straight back into the viewer.
  onNumbering(numbering: ResidueNumbering | null) {
    this.numbering = numbering;
    if (numbering?.count === 3) {
      this.colors = { 1: 'rgb(1, 2, 3)', 2: 'rgb(4, 5, 6)', 3: 'rgb(7, 8, 9)' };
    }
  }
}

describe('ProteinViewerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let addStyle: jasmine.Spy;

  async function setUp(resis: number[]) {
    addStyle = installFake3Dmol(resis).addStyle;
    await TestBed.configureTestingModule({
      imports: [HostComponent, HttpClientTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  }

  it('reports the residue numbering without leaving the parent changed-after-checked', async () => {
    await setUp([1, 2, 3]);

    // Emitting during the first render would mutate [residueColors] after it was
    // checked in this same pass (NG0100).
    expect(() => fixture.detectChanges()).not.toThrow();

    await fixture.whenStable();
    expect(fixture.componentInstance.numbering).toEqual({ count: 3, min: 1, max: 3 });

    // ...and the deferred emit still repaints: the colour map reaches 3Dmol.
    fixture.detectChanges();
    expect(addStyle).toHaveBeenCalledWith({ resi: [1] }, { cartoon: { color: 'rgb(1, 2, 3)' } });
  });

  it('reports the real bounds when the model is not numbered from 1', async () => {
    await setUp([20, 21, 22]);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.numbering).toEqual({ count: 3, min: 20, max: 22 });
  });
});
