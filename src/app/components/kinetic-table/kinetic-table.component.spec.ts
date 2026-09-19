import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideEnvironmentServiceStub } from '~/app/testing/environment-service.stub';
import { MessageService } from 'primeng/api';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { KineticTableComponent } from './kinetic-table.component';

describe('KineticTableComponent', () => {
  let component: KineticTableComponent;
  let fixture: ComponentFixture<KineticTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KineticTableComponent],
      providers: [provideEnvironmentServiceStub(), provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations(), MessageService]
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
