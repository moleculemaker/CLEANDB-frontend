import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EcArrowComponent } from './ec-arrow.component';

describe('EcArrowComponent', () => {
  let component: EcArrowComponent;
  let fixture: ComponentFixture<EcArrowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EcArrowComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EcArrowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
