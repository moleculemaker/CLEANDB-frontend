import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideEnvironmentServiceStub } from '~/app/testing/environment-service.stub';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { EffectPredictionResultComponent } from './effect-prediction-result.component';
import { EffectPredictionComponent } from '~/app/pages/effect-prediction/effect-prediction.component';
import { CleanDbService, EffectPredictionResult } from '~/app/services/clean-db.service';
import { Subject, firstValueFrom, of } from 'rxjs';
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

  describe('slow structure note', () => {
    const NOTE = 'Structure prediction can take several minutes';
    const DELAY = () => component.slowStructureDelayMs;
    const arm = () => component['armSlowStructureNote']();

    /**
     * Visibility, not presence: the results panel sits behind a `hidden` class
     * until showResults, and textContent would read straight through it.
     */
    const noteVisible = (): boolean => {
      fixture.detectChanges();
      const note = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('p'))
        .find((p) => (p.textContent ?? '').includes(NOTE));
      return !!note && note.offsetParent !== null;
    };

    /** A simplefold job whose poller has started, as startSimplefoldPolling leaves it. */
    const simplefoldLoading = () => {
      component.simplefoldJobId = 'abc';
      component.simplefoldLoading = true;
    };

    it('does not arm while the panel is still hidden', fakeAsync(() => {
      simplefoldLoading();
      component.showResults = false;
      arm();

      tick(DELAY());
      expect(component.structureSlow).toBeFalse();
    }));

    it('arms once the panel is on screen and waits out the delay', fakeAsync(() => {
      simplefoldLoading();
      component.showResults = true;
      arm();

      tick(DELAY() - 1);
      expect(component.structureSlow).toBeFalse();
      tick(1);
      expect(component.structureSlow).toBeTrue();
    }));

    it('arms from the handler that mounts the panel, not only when called directly', fakeAsync(() => {
      // The panel mounts inside onProgressChange(100) after the result fetch.
      spyOn(TestBed.inject(CleanDbService), 'getEffectPredictionResult').and.returnValue(of(result));
      simplefoldLoading();

      component.onProgressChange(100);
      expect(component.showResults).toBeTrue();

      tick(DELAY());
      expect(component.structureSlow).toBeTrue();
    }));

    it('never arms for the precomputed example, which is an AlphaFold download, not a prediction', fakeAsync(() => {
      component.simplefoldJobId = '';
      component.simplefoldLoading = true;
      component.showResults = true;
      arm();

      tick(DELAY());
      expect(component.structureSlow).toBeFalse();
    }));

    it('does not arm when nothing is loading', fakeAsync(() => {
      component.simplefoldJobId = 'abc';
      component.simplefoldLoading = false;
      component.showResults = true;
      arm();

      tick(DELAY());
      expect(component.structureSlow).toBeFalse();
    }));

    it('resets a stale flag when re-armed, so a fresh load starts with a bare spinner', fakeAsync(() => {
      simplefoldLoading();
      component.showResults = true;
      component.structureSlow = true;
      arm();

      expect(component.structureSlow).toBeFalse();
      tick(DELAY());
      expect(component.structureSlow).toBeTrue();
    }));

    it('shows the note only while loading, and only once the panel is visible', () => {
      simplefoldLoading();
      component.structureSlow = true;

      component.showResults = false;
      expect(noteVisible()).toBeFalse();

      component.showResults = true;
      expect(noteVisible()).toBeTrue();

      component.structureSlow = false;
      expect(noteVisible()).toBeFalse();

      // The flag is never cleared by a load finishing, so this is the case that
      // makes the template gate load-bearing.
      component.structureSlow = true;
      component.simplefoldLoading = false;
      expect(noteVisible()).toBeFalse();
    });

    it('keeps the note off the error state', () => {
      component.showResults = true;
      component.simplefoldLoading = false;
      component.simplefoldError = true;
      component.structureSlow = true;
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Failed to load structure');
      expect(noteVisible()).toBeFalse();
    });

    it('drops the timer with the component', fakeAsync(() => {
      simplefoldLoading();
      component.showResults = true;
      arm();
      fixture.destroy();

      tick(DELAY());
      expect(component.structureSlow).toBeFalse();
    }));
  });

  describe('result fetch', () => {
    let fetches: Subject<EffectPredictionResult>[];
    let fetchSpy: jasmine.Spy;

    beforeEach(() => {
      fetches = [];
      fetchSpy = spyOn(TestBed.inject(CleanDbService), 'getEffectPredictionResult').and.callFake(() => {
        const fetch = new Subject<EffectPredictionResult>();
        fetches.push(fetch);
        return fetch;
      });
      // A simplefold job still running, so the slow-structure note is in play.
      component.simplefoldJobId = 'abc';
      component.simplefoldLoading = true;
    });

    it('keeps the note up when the loader reports 100 again while the fetch is pending', fakeAsync(() => {
      // <app-loading> reports 100 on every 10 s poll tick until showResults
      // removes it, so a fetch slower than a tick used to be issued twice.
      component.onProgressChange(100);
      component.onProgressChange(100);

      fetches[0].next(result);
      tick(component.slowStructureDelayMs);
      expect(component.structureSlow).toBeTrue();

      // Before the latch this was the second fetch landing and re-arming the
      // note, which blinked it off. With the latch there is no second fetch.
      fetches[1]?.next(result);
      expect(component.structureSlow).toBeTrue();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    }));

    it('fetches again on the next 100 after a failed fetch', () => {
      component.onProgressChange(100);
      fetches[0].error(new Error('503'));
      expect(component.showResults).toBeFalse();

      component.onProgressChange(100);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
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
});
