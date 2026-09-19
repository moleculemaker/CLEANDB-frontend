import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEnvironmentServiceStub } from '~/app/testing/environment-service.stub';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { LandingPageComponent } from './landing-page.component';

describe('LandingPageComponent', () => {
  let component: LandingPageComponent;
  let fixture: ComponentFixture<LandingPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingPageComponent],
      providers: [provideRouter([]), provideEnvironmentServiceStub(), provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LandingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
