import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SequencePositionSelectorComponent } from './sequence-position-selector.component';

describe('SequencePositionSelectorComponent', () => {
  let component: SequencePositionSelectorComponent;
  let fixture: ComponentFixture<SequencePositionSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SequencePositionSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SequencePositionSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
