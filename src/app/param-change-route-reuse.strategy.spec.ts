import { Component, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, RouteReuseStrategy, RouterOutlet, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { AppRoutingModule } from './app-routing.module';
import { ParamChangeRouteReuseStrategy } from './param-change-route-reuse.strategy';
import { EffectPredictionResultComponent } from './pages/effect-prediction-result/effect-prediction-result.component';
import { provideEnvironmentServiceStub } from './testing/environment-service.stub';

/** Stands in for MainLayoutComponent: a param-less parent that must survive a child param change. */
@Component({ standalone: true, imports: [RouterOutlet], template: '<router-outlet />' })
class LayoutStubComponent {}

const routes: Routes = [
  {
    path: '',
    component: LayoutStubComponent,
    children: [
      { path: 'effect-prediction/result/:id', component: EffectPredictionResultComponent },
    ],
  },
];

async function setup(extraProviders: Provider[]): Promise<RouterTestingHarness> {
  await TestBed.configureTestingModule({
    providers: [
      provideRouter(routes),
      provideNoopAnimations(),
      provideEnvironmentServiceStub(),
      provideHttpClient(),
      provideHttpClientTesting(),
      ...extraProviders,
    ],
  }).compileComponents();
  return RouterTestingHarness.create();
}

function layoutInstance(harness: RouterTestingHarness): LayoutStubComponent {
  return harness.fixture.debugElement.query(By.directive(LayoutStubComponent)).componentInstance;
}

/** The harness hands back the top-level routed component (the layout), so find the child ourselves. */
async function openResult(harness: RouterTestingHarness, jobId: string): Promise<EffectPredictionResultComponent> {
  await harness.navigateByUrl(`/effect-prediction/result/${jobId}`, LayoutStubComponent);
  return harness.fixture.debugElement.query(By.directive(EffectPredictionResultComponent)).componentInstance;
}

describe('ParamChangeRouteReuseStrategy', () => {
  // The bug this strategy fixes: resubmitting from result A lands on result/B with
  // A's component, which read its job id once from a snapshot.
  it('documents that the default strategy keeps job A\'s component on result/B', async () => {
    const harness = await setup([]);
    const first = await openResult(harness, 'A');
    const second = await openResult(harness, 'B');

    expect(second).toBe(first);
    expect(second.jobId).toBe('A');
  });

  it('gives result/B a fresh component while keeping the param-less parent mounted', async () => {
    const harness = await setup([{ provide: RouteReuseStrategy, useClass: ParamChangeRouteReuseStrategy }]);
    const first = await openResult(harness, 'A');
    const firstLayout = layoutInstance(harness);
    expect(first.jobId).toBe('A');

    const second = await openResult(harness, 'B');

    expect(second).not.toBe(first);
    expect(second.jobId).toBe('B');
    expect(layoutInstance(harness)).toBe(firstLayout);
  });

  it('is the strategy the app routing module provides', () => {
    TestBed.configureTestingModule({ imports: [AppRoutingModule] });
    expect(TestBed.inject(RouteReuseStrategy)).toBeInstanceOf(ParamChangeRouteReuseStrategy);
  });
});
