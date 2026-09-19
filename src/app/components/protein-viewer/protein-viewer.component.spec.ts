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
function installFake3Dmol(resis: number[]): { addStyle: jasmine.Spy; resize: jasmine.Spy } {
  const addStyle = jasmine.createSpy('addStyle');
  const resize = jasmine.createSpy('resize');
  (window as any).$3Dmol = {
    createViewer: () => ({
      addStyle,
      resize,
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
  return { addStyle, resize };
}

@Component({
  standalone: true,
  imports: [ProteinViewerComponent],
  // The viewer fills a positioned box, as it does on the results page, where
  // that box is sized by the flex row around it rather than by the viewer.
  template: `<div class="box" style="position: relative; width: 200px; height: 120px">
      <app-protein-viewer
        [pdbData]="pdb"
        [residueColors]="colors"
        (residueNumberingChange)="onNumbering($event)"></app-protein-viewer>
    </div>`,
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
  let resize: jasmine.Spy;
  let original3Dmol: unknown;

  // installFake3Dmol writes to window, and ThreedmolLoaderService reads that
  // global directly, so without restoring it the stub would stand in for the
  // real library in every later spec of the same Karma run.
  beforeEach(() => {
    original3Dmol = (window as any).$3Dmol;
  });

  afterEach(() => {
    if (original3Dmol === undefined) {
      delete (window as any).$3Dmol;
    } else {
      (window as any).$3Dmol = original3Dmol;
    }
  });

  async function setUp(resis: number[]) {
    ({ addStyle, resize } = installFake3Dmol(resis));
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
  /** ResizeObserver reports after layout, on the next frame. */
  const settleResizeObserver = () =>
    new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

  it('resizes the viewer when its box changes size, and lets go of the box on destroy', async () => {
    await setUp([1, 2, 3]);
    fixture.detectChanges();
    await settleResizeObserver();

    const box: HTMLElement = fixture.nativeElement.querySelector('.box');
    resize.calls.reset();
    box.style.height = '240px';
    await settleResizeObserver();
    expect(resize).withContext('3Dmol sizes its canvas once; a taller box needs a resize').toHaveBeenCalled();

    const viewer = fixture.debugElement.children[0].children[0].componentInstance as ProteinViewerComponent;
    viewer.ngOnDestroy();
    resize.calls.reset();
    box.style.height = '300px';
    await settleResizeObserver();
    expect(resize).withContext('observer must be disconnected with the component').not.toHaveBeenCalled();
  });
});
