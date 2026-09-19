import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideEnvironmentServiceStub } from '~/app/testing/environment-service.stub';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { EffectPredictionResultComponent } from './effect-prediction-result.component';

describe('EffectPredictionResultComponent', () => {
  let component: EffectPredictionResultComponent;
  let fixture: ComponentFixture<EffectPredictionResultComponent>;

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
});
