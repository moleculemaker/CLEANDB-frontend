import { FormControl, Validators, AbstractControl, FormGroup, ValidationErrors } from '@angular/forms';
import { Observable, of, switchMap, map, first, catchError, tap, filter, distinctUntilChanged, debounceTime, startWith } from 'rxjs';
import { BaseSearchOptionParams, BaseSearchOption, SearchOptionType } from './BaseSearchOption';
import { Loadable } from '~/app/models/Loadable';

type SmilesSearchOptionParams = Omit<BaseSearchOptionParams, 'type'> & {
  example: Record<string, any>;
  smilesValidator: (smiles: string) => Observable<Loadable<string>>;
  nameToSmilesConverter: (name: string) => Observable<Loadable<string>>;
};

type SmilesSearchInputType = 'name' | 'smiles';

type SmilesSearchAdditionalControls = {
  inputType: FormControl<SmilesSearchInputType | null>;
  inputValue: FormControl<string | null>;
};

type SmilesSearchOptionType = SearchOptionType<string, SmilesSearchAdditionalControls>;

export class SmilesSearchOption extends BaseSearchOption<string, SmilesSearchAdditionalControls> {
  override formGroup: FormGroup<SmilesSearchOptionType> = new FormGroup({
    inputType: new FormControl<SmilesSearchInputType>('name', [Validators.required]),
    inputValue: new FormControl<string>('', 
      [Validators.required],
      [this.validateInput.bind(this)]
    ),
    value: new FormControl<string>('', [Validators.required]),
  });

  public chemInfo: Loadable<string> = {
    data: '',
    status: 'na'
  };

  private nameToSmilesConverter: (name: string) => Observable<Loadable<string>>;
  private smilesValidator: (smiles: string) => Observable<ValidationErrors | null>;

  constructor(params: SmilesSearchOptionParams) {
    super({
      ...params,
      type: 'smiles',
    });
    this.nameToSmilesConverter = params.nameToSmilesConverter;
    this.smilesValidator = (smiles: string) => {
      return params.smilesValidator(smiles).pipe(
        tap((chemical) => this.chemInfo = chemical),
        filter((chemical) => chemical.status !== 'loading'),
        map((chemical) => {
          if (chemical.status === 'loaded') {
            this.formGroup.get('value')!.setValue(chemical.data, { emitEvent: false });
            console.log('[smiles-search-option] smiles validated', chemical);
            return null;
          }
          console.log('[smiles-search-option] smiles validation error', chemical);
          return { invalidSmiles: true };
        }),
      )
    };
  }

  override reset() {
    super.reset();
    this.chemInfo = {
      data: '',
      status: 'na'
    };
    this.formGroup.get('inputType')!.setValue('name', { emitEvent: false });
    this.formGroup.get('value')!.setValue('', { emitEvent: false });
    this.formGroup.get('inputValue')!.setValue('', { emitEvent: false });
  }

  private validateInput(control: AbstractControl<string | null>) {
    return control.valueChanges.pipe(
      startWith(control.value),
      tap(() => this.chemInfo.status = 'loading'),
      distinctUntilChanged(),
      tap((v) => console.log('[smiles-search-option] inputValue changed', v)),
      debounceTime(300),
      switchMap((value) => {
        if (!value) {
          return of({ required: true });
        }

        const inputType = this.formGroup.get('inputType')!.value;
        switch (inputType) {
          case 'name':
            return this.nameToSmilesConverter(value).pipe(
              filter((smiles) => smiles.status !== 'loading'),
              first(),
              switchMap((smiles) => {
                switch (smiles.status) {
                  case 'loaded':
                    return this.smilesValidator(smiles.data || '');
                  default: // only error and invalid are possible
                    this.chemInfo = {
                      status: 'invalid' as const,
                      data: ''
                    };
                    return of({ invalidName: true });
                }
              }),
            )
          case 'smiles':
            return this.smilesValidator(value)
        }

        return of({ unknownInputType: true });
      }),
      first()
    )
  }
}