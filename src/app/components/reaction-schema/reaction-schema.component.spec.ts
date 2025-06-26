import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReactionSchemaComponent } from './reaction-schema.component';

describe('ReactionSchemaComponent', () => {
  let component: ReactionSchemaComponent;
  let fixture: ComponentFixture<ReactionSchemaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactionSchemaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReactionSchemaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
