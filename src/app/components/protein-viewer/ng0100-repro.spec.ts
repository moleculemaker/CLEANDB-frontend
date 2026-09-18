import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ProteinViewerComponent } from '~/app/components/protein-viewer/protein-viewer.component';
import { ProteinResidueColors } from '~/app/models/protein-viewer';

function installFake3Dmol() {
  (window as any).$3Dmol = {
    createViewer: () => ({
      removeAllModels: () => {},
      addModel: () => {},
      selectedAtoms: () => [
        { resi: 1 }, { resi: 2 }, { resi: 3 },
      ],
      setStyle: () => {},
      addStyle: () => {},
      setClickable: () => {},
      render: () => {},
      zoomTo: () => {},
      zoom: () => {},
      clear: () => {},
    }),
  };
}

@Component({
  standalone: true,
  imports: [ProteinViewerComponent],
  template: `<app-protein-viewer
      [pdbData]="pdb"
      [residueColors]="colors"
      (residueCountChange)="onCount($event)"></app-protein-viewer>`,
})
class HostComponent {
  pdb = 'ATOM      1  N   MET A   1';
  colors: ProteinResidueColors | null = null;
  lastCount: number | null = null;

  onCount(count: number | null) {
    // Mirrors EffectPredictionResultComponent.onStructureResidueCount():
    // record the count, then derive and assign the colour map.
    this.lastCount = count;
    if (count === 3) {
      this.colors = { 1: 'rgb(1, 2, 3)', 2: 'rgb(4, 5, 6)', 3: 'rgb(7, 8, 9)' };
    }
  }
}

describe('ProteinViewerComponent residueCountChange timing', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    installFake3Dmol();
    await TestBed.configureTestingModule({
      imports: [HostComponent, HttpClientTestingModule],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  it('does not put the parent in a changed-after-checked state on first render', async () => {
    // The emit is deferred by a microtask precisely so this assignment does not
    // land mid-check, so the count arrives on the following turn rather than
    // synchronously with the first render.
    expect(() => fixture.detectChanges()).not.toThrow();

    await fixture.whenStable();
    expect(() => fixture.detectChanges()).not.toThrow();

    expect(fixture.componentInstance.lastCount).toBe(3);
    expect(fixture.componentInstance.colors).toEqual({
      1: 'rgb(1, 2, 3)', 2: 'rgb(4, 5, 6)', 3: 'rgb(7, 8, 9)',
    });
  });
});
