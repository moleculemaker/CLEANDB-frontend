import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideEnvironmentServiceStub } from '~/app/testing/environment-service.stub';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { HeatmapComponent } from './heatmap.component';

describe('HeatmapComponent', () => {
  let component: HeatmapComponent;
  let fixture: ComponentFixture<HeatmapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeatmapComponent],
      providers: [provideEnvironmentServiceStub(), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
