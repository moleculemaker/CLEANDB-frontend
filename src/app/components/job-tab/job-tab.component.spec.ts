import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { JobTabComponent } from './job-tab.component';

describe('JobTabComponent', () => {
  let component: JobTabComponent;
  let fixture: ComponentFixture<JobTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobTabComponent],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(JobTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
