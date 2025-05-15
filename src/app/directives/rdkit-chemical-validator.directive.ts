import { Directive, EventEmitter, forwardRef, Output } from '@angular/core';
import { AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter, first, map, Observable, of, startWith, switchMap, tap } from 'rxjs';
import { ReactionMinerService, Loadable } from '../services/reaction-miner.service';

@Directive({
  selector: '[appRdkitChemicalValidator]',
  providers: [
    {
      provide: NG_ASYNC_VALIDATORS,
      useExisting: forwardRef(() => RdkitChemicalValidator),
      multi: true
    }
  ],
  standalone: true
})
export class RdkitChemicalValidator implements AsyncValidator {
  @Output() onChemicalValidationStatusChange = new EventEmitter<Loadable<string>>();

  constructor(private service: ReactionMinerService) { }

  validate(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    if (!control.value || control.value.trim() === '') {
      this.onChemicalValidationStatusChange.emit({ status: 'na', data: null });
      return of(null);
    }
    return control.valueChanges.pipe(
      startWith(control.value),
      tap(() => this.onChemicalValidationStatusChange.emit({ status: 'loading', data: null })),
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(() => this.service.validateChemical(control.value)),
      filter((result: Loadable<string>) => result.status === 'loaded' || result.status === 'error'),
      map((result: Loadable<string>) => {
        this.onChemicalValidationStatusChange.emit(result);
        if (result.status === 'error') {
          return { chemicalNotSupported: true };
        }
        return null;
      }),
      first()
    );
  }
}