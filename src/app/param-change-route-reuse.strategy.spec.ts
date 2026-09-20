import { Component, EnvironmentProviders, inject, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, RouteReuseStrategy, RouterOutlet, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AppRoutingModule } from './app-routing.module';
import { ParamChangeRouteReuseStrategy } from './param-change-route-reuse.strategy';
import { EffectPredictionResultComponent } from './pages/effect-prediction-result/effect-prediction-result.component';
import { provideEnvironmentServiceStub } from './testing/environment-service.stub';

/** Stands in for MainLayoutComponent: a param-less parent that must survive a child param change. */
@Component({ standalone: true, imports: [RouterOutlet], template: '<router-outlet />' })
class LayoutStubComponent {}

/** Reads its id once from the snapshot, the way the result page does. */
@Component({ standalone: true, template: '' })
class ParamReaderStubComponent {
  id = inject(ActivatedRoute).snapshot.paramMap.get('id');
}

const strategyProvider: Provider = { provide: RouteReuseStrategy, useClass: ParamChangeRouteReuseStrategy };

async function setup(routes: Routes, extraProviders: (Provider | EnvironmentProviders)[] = []): Promise<RouterTestingHarness> {
  await TestBed.configureTestingModule({
    providers: [provideRouter(routes), strategyProvider, ...extraProviders],
  }).compileComponents();
  return RouterTestingHarness.create();
}

/** The harness hands back the top-level routed component (the layout), so find the child ourselves. */
function childInstance<T>(harness: RouterTestingHarness, type: new (...args: any[]) => T): T {
  return harness.fixture.debugElement.query(By.directive(type)).componentInstance;
}

describe('ParamChangeRouteReuseStrategy', () => {
  describe('on a stub route', () => {
    const routes: Routes = [
      {
        path: '',
        component: LayoutStubComponent,
        children: [{ path: 'thing/:id', component: ParamReaderStubComponent }],
      },
    ];

    it('recreates the routed component when a path param changes, keeping the param-less parent', async () => {
      const harness = await setup(routes);
      await harness.navigateByUrl('/thing/A', LayoutStubComponent);
      const first = childInstance(harness, ParamReaderStubComponent);
      const firstLayout = childInstance(harness, LayoutStubComponent);
      expect(first.id).toBe('A');

      await harness.navigateByUrl('/thing/B', LayoutStubComponent);
      const second = childInstance(harness, ParamReaderStubComponent);

      expect(second).not.toBe(first);
      expect(second.id).toBe('B');
      expect(childInstance(harness, LayoutStubComponent)).toBe(firstLayout);
    });

    it('keeps the component when only query params change', async () => {
      const harness = await setup(routes);
      await harness.navigateByUrl('/thing/A', LayoutStubComponent);
      const first = childInstance(harness, ParamReaderStubComponent);

      await harness.navigateByUrl('/thing/A?tab=results', LayoutStubComponent);

      expect(childInstance(harness, ParamReaderStubComponent)).toBe(first);
    });
  });

  // The bug this strategy fixes: resubmitting from result A landed on result/B with
  // A's component, which had read its job id once from a snapshot. One test on the
  // real page pins that; the invariant itself is covered above on a stub.
  it('gives the effect prediction result page a fresh component for a new job id', async () => {
    const harness = await setup(
      [{
        path: '',
        component: LayoutStubComponent,
        children: [{ path: 'effect-prediction/result/:id', component: EffectPredictionResultComponent }],
      }],
      [provideNoopAnimations(), provideEnvironmentServiceStub(), provideHttpClient(), provideHttpClientTesting()],
    );
    await harness.navigateByUrl('/effect-prediction/result/A', LayoutStubComponent);
    const first = childInstance(harness, EffectPredictionResultComponent);
    expect(first.jobId).toBe('A');

    await harness.navigateByUrl('/effect-prediction/result/B', LayoutStubComponent);
    const second = childInstance(harness, EffectPredictionResultComponent);

    expect(second).not.toBe(first);
    expect(second.jobId).toBe('B');
  });

  it('is the strategy the app routing module provides', () => {
    TestBed.configureTestingModule({ imports: [AppRoutingModule] });
    expect(TestBed.inject(RouteReuseStrategy)).toBeInstanceOf(ParamChangeRouteReuseStrategy);
  });
});
