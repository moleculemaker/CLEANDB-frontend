import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EcChipComponent } from './ec-chip.component';

describe('EcChipComponent', () => {
  let component: EcChipComponent;
  let fixture: ComponentFixture<EcChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EcChipComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EcChipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
