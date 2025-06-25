import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataSnapshotComponent } from './data-snapshot.component';

describe('DataSnapshotComponent', () => {
  let component: DataSnapshotComponent;
  let fixture: ComponentFixture<DataSnapshotComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataSnapshotComponent]
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
