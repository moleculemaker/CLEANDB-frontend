import { FormGroup, FormControl } from '@angular/forms';
import { SearchType } from '.';

export interface BaseSearchOptionParams {
  key: string;
  label: string;
  type: SearchType;
  placeholder: string;
  example: Record<string, any>;
}

type AdditionalControls = Record<string, FormControl<any>>;

export type SearchOptionType<V, X extends AdditionalControls> = {
  value: FormControl<V | null>;
} & X;

export abstract class BaseSearchOption<V, X extends AdditionalControls> {
  abstract formGroup: FormGroup<SearchOptionType<V, X>>;

  key: string;
  label: string;
  type: SearchType;
  placeholder: string;
  example: Record<string, any>;

  constructor(params: BaseSearchOptionParams) {
    this.key = params.key;
    this.label = params.label;
    this.type = params.type;
    this.placeholder = params.placeholder;
    this.example = params.example;
  }

  reset() {
    this.formGroup.reset();
  }
}
