import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideEnvironmentServiceStub } from '~/app/testing/environment-service.stub';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { EffectPredictionResultComponent } from './effect-prediction-result.component';
import { EffectPredictionComponent } from '~/app/pages/effect-prediction/effect-prediction.component';
import { EffectPredictionResult } from '~/app/services/clean-db.service';
import { firstValueFrom } from 'rxjs';
import { By } from '@angular/platform-browser';
import { TieredMenu } from 'primeng/tieredmenu';

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

  describe('structure export item', () => {
    const structureItem = () =>
      component.exportOptions.find((item) => item.label === 'Protein Structure')!;

    it('is disabled while there is no structure to export', () => {
      component.simplefoldPdbData = '';

      expect(structureItem().disabled).toBeTrue();
    });

    it('is enabled once the structure has loaded', () => {
      component.simplefoldPdbData = 'ATOM      1  N   MET A   1';

      expect(structureItem().disabled).toBeFalse();
    });

    it('is disabled for a job whose fold was skipped for length', () => {
      // The steady state this closes: no structure is ever coming, so the item would
      // have stayed clickable and silently done nothing for the life of the page.
      component.sequence = 'A'.repeat(component.maxStructureResidues + 1);
      component.jobInfo = {};

      expect(component.structureOmittedForLength).toBeTrue();
      expect(structureItem().disabled).toBeTrue();
    });

    it('renders as disabled in the open menu, and enables when data arrives', async () => {
      // Proves PrimeNG actually reads the getter: a flag it never looked at would pass
      // every assertion above and still leave a clickable item on the page.
      await firstValueFrom(component.statusResponse$);
      component.showResults = true;
      component.simplefoldPdbData = '';
      fixture.detectChanges();

      // The Request Options split button owns a TieredMenu of its own and comes first
      // in the template, so pick the one actually bound to the export model.
      const menu = fixture.debugElement.queryAll(By.directive(TieredMenu))
        .map((el) => el.componentInstance as TieredMenu)
        .find((candidate) => candidate.model === component.exportOptions)!;
      expect(menu).withContext('the export menu').toBeTruthy();
      menu.show({ currentTarget: document.body, relatedTarget: null });
      fixture.detectChanges();

      const structureItem = () =>
        Array.from(document.body.querySelectorAll('li.p-menuitem'))
          .find((li) => li.textContent?.includes('Protein Structure'));

      expect(structureItem())
        .withContext('the structure export item is rendered')
        .toBeTruthy();
      expect(Array.from(structureItem()!.classList)).toContain('p-disabled');

      // Both menu components are OnPush, so the rendered state is settled when the menu
      // is opened rather than live while it sits open. Reopening is the flow that
      // matters: a structure that arrives mid-popup shows up on the next open.
      menu.visible = false;
      fixture.detectChanges();

      component.simplefoldPdbData = 'ATOM      1  N   MET A   1';
      menu.show({ currentTarget: document.body, relatedTarget: null });
      fixture.detectChanges();

      expect(Array.from(structureItem()!.classList)).not.toContain('p-disabled');

      menu.visible = false;
      fixture.detectChanges();
    });

    it('tracks the data without replacing the array or the item', () => {
      // PrimeNG rebuilds its internal item list whenever the model reference changes,
      // which would disturb an open popup, so both identities have to hold.
      const options = component.exportOptions;
      const item = structureItem();

      component.simplefoldPdbData = 'ATOM      1  N   MET A   1';

      expect(component.exportOptions).toBe(options);
      expect(structureItem()).toBe(item);
      expect(item.disabled).toBeFalse();
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

    it('says nothing for the precomputed example, whose structure comes from AlphaFold', async () => {
      // With no route id the job is 'precomputed' and the status stream serves the
      // bundled example: 360 residues and no simplefold id, which is the shape this
      // getter must not mistake for an omitted fold. The example arrives through a
      // lazy import, so wait for it: run alone, this spec reached the assertions
      // before it had landed and read an empty sequence.
      await firstValueFrom(component.statusResponse$);

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
  describe('resubmitting from the embedded form', () => {
    it('hands the form the job id it is showing, so it can recognise an unchanged resubmit', async () => {
      await firstValueFrom(component.statusResponse$);

      expect(component.jobInfo.job_id).toBe(component.jobId);
    });

    // No route param in this fixture, so the page shows the precomputed job.
    const embeddedForm = (): EffectPredictionComponent =>
      fixture.debugElement.query(By.directive(EffectPredictionComponent)).componentInstance;

    beforeEach(() => {
      component.currentPage = 'input';
      fixture.detectChanges();
    });

    it('returns to the results tab when the submission resolves to the job already shown', () => {
      embeddedForm().submitted.emit('precomputed');

      expect(component.currentPage).toBe('result');
    });

    it('leaves the tab alone for another job, which navigation handles', () => {
      embeddedForm().submitted.emit('some-other-job');

      expect(component.currentPage).toBe('input');
    });
  });

  describe('heatmap and structure row', () => {
    // Rendered in a fixed-width host with the real stylesheet, so these measure
    // what the browser does with the layout classes rather than list the classes.
    // The structure panel is put in its loading state: that renders the panel and
    // its viewer box with a spinner rather than the WebGL viewer.
    const layOut = (hostWidth: number) => {
      const host = fixture.nativeElement as HTMLElement;
      host.style.display = 'block';
      host.style.width = `${hostWidth}px`;
      component.result = result;
      component.showResults = true;
      component.simplefoldLoading = true;
      fixture.detectChanges();

      const heatmapColumn = host.querySelector('app-heatmap')!.parentElement!;
      const structureColumn = heatmapColumn.parentElement!.children[1] as HTMLElement;
      const viewerBox = structureColumn.querySelector<HTMLElement>('.relative')!;
      return {
        host: host.getBoundingClientRect(),
        heatmap: heatmapColumn.getBoundingClientRect(),
        structure: structureColumn.getBoundingClientRect(),
        viewer: viewerBox.getBoundingClientRect(),
      };
    };

    it('puts the structure beside a 604px heatmap when the row has room for both', () => {
      const { heatmap, structure } = layOut(1100);

      expect(heatmap.width).toBe(604);
      expect(structure.top).toBe(heatmap.top);
      expect(structure.left).toBeGreaterThanOrEqual(heatmap.right);
    });

    it('stacks the structure under a full-width heatmap at 480px, keeping the viewer its usual height', () => {
      const wide = layOut(1100);
      const { host, heatmap, structure, viewer } = layOut(480);

      expect(structure.top).toBeGreaterThanOrEqual(heatmap.bottom);
      expect(structure.width).toBe(heatmap.width);
      // Nothing inside forces the page wider than the window: the grid's
      // thousands of pixels stay inside the heatmap's own scroller.
      expect(heatmap.right).toBeLessThanOrEqual(host.right);
      expect(structure.right).toBeLessThanOrEqual(host.right);
      // Stacked, there is no heatmap beside it to stretch to, so the viewer
      // would otherwise collapse to nothing.
      expect(viewer.height).toBe(wide.viewer.height);
      expect(viewer.height).toBeGreaterThan(400);
    });
  });
});
