import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KineticTableComponent } from './kinetic-table.component';

describe('KineticTableComponent', () => {
  let component: KineticTableComponent;
  let fixture: ComponentFixture<KineticTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineticTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KineticTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
