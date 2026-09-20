import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { JobTabComponent } from './job-tab.component';

@Component({ standalone: true, template: '' })
class ResultStubComponent {}

describe('JobTabComponent', () => {
  let component: JobTabComponent;
  let fixture: ComponentFixture<JobTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobTabComponent],
      providers: [provideRouter([{ path: 'x/result/:id', component: ResultStubComponent }])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(JobTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('follows navigation onto a result URL while alive', async () => {
    expect(component.tabs[1].disabled).toBeTrue();

    await TestBed.inject(Router).navigateByUrl('/x/result/abc');

    expect(component.tabs[1].disabled).toBeFalse();
    expect(component.activeTab).toBe(component.tabs[1]);
  });

  // The result page is destroyed and rebuilt on every resubmit, so a tab that kept
  // listening after destroy would pile up one dead handler per submission.
  it('stops listening to router events once destroyed', async () => {
    fixture.destroy();

    await TestBed.inject(Router).navigateByUrl('/x/result/abc');

    expect(component.tabs[1].disabled).toBeTrue();
    expect(component.activeTab).toBe(component.tabs[0]);
  });
});
