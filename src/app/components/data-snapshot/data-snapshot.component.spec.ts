import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideEnvironmentServiceStub } from '~/app/testing/environment-service.stub';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { DataSnapshotComponent } from './data-snapshot.component';

describe('DataSnapshotComponent', () => {
  let component: DataSnapshotComponent;
  let fixture: ComponentFixture<DataSnapshotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataSnapshotComponent],
      providers: [provideEnvironmentServiceStub(), provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataSnapshotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
