export interface FilterConfigParams {
  category: string;
  label: {
    value: string;
    rawValue: string;
  };
  placeholder: string;
  field: string;
  type?: 'range' | 'multiselect' | 'singleselect';
  value?: any;
  defaultValue?: any;
  matchMode?: 'in' | 'range' | 'subset' | 'union';
  disabled?: boolean;
  optionsField?: string;
  sortingField?: string;
}

export abstract class FilterConfig {
  public category: string;
  public label: {
    value: string;
    rawValue: string;
  };
  public placeholder: string;
  public field: string;
  public type: 'range' | 'multiselect' | 'singleselect';
  public defaultValue: any;
  public matchMode: 'in' | 'range' | 'subset' | 'union';
  public formattedValue: any;
  public disabled: boolean;
  public optionsField: string;
  public sortingField: string;
  #value: any;

  constructor(params: FilterConfigParams) {
    this.category = params.category;
    this.label = params.label;
    this.placeholder = params.placeholder;
    this.field = params.field;
    this.type = params.type ?? 'multiselect';
    this.#value = params.value;
    this.defaultValue = params.defaultValue ?? null;
    this.matchMode = params.matchMode ?? 'in';
    this.disabled = params.disabled ?? false;
    this.optionsField = params.optionsField ?? params.field;
    this.sortingField = params.sortingField ?? params.field;
  }

  get value() {
    return this.#value;
  }

  set value(value: any) {
    const parsedValue = this.parseInput(value);
    this.#value = parsedValue;
    this.formattedValue = this.formatValue();
  }

  abstract hasFilter(): boolean;
  abstract parseInput(value: any): any;
  abstract formatValue(): any;
}

export interface RangeFilterParams extends FilterConfigParams {
  min: number;
  max: number;
  value?: [number, number];
}

export class RangeFilterConfig extends FilterConfig {
  public min: number;
  public max: number;
  constructor(params: RangeFilterParams) {
    super({
      ...params,
      type: 'range',
      value: params.value ?? [params.min, params.max],
      defaultValue: [params.min, params.max],
      matchMode: 'range'
    });
    this.min = params.min;
    this.max = params.max;
  }

  hasFilter(): boolean {
    return this.value[0] !== this.defaultValue[0] || this.value[1] !== this.defaultValue[1];
  }

  parseInput(input: string | [number, number]): [number, number] {
    let min, max;
    if (typeof input === 'string') {
      const rangeRegex = /^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/;
      const match = input.match(rangeRegex);
      if (!match) {
        return this.defaultValue;
      }
      min = parseFloat(match[1]);
      max = parseFloat(match[2]);
    } else {
      [min, max] = input;
    }

    if (min > max) {
      return this.defaultValue;
    }

    return [min, max];
  }

  formatValue(): string {
    if (!this.value || !Array.isArray(this.value)) {
      return '';
    }
    const [min, max] = this.value;
    if (min === this.min && max === this.max) {
      return '';
    }
    return `${min}-${max}`;
  }
}

export interface MultiselectFilterParams extends FilterConfigParams {
  options?: any[];
  value?: any[];
}

export class MultiselectFilterConfig extends FilterConfig {
  public options: any[];
  constructor(params: MultiselectFilterParams) {
    super({
      ...params,
      type: 'multiselect',
      value: params.value ?? [],
      defaultValue: [],
    });
    this.options = params.options ?? [];
    this.optionsField = params.optionsField ?? params.field;
  }

  hasFilter(): boolean {
    return this.value.length > 0;
  }

  parseInput(value: any[]): any[] {
    return value;
  }

  formatValue(): string {
    if (!this.value || !Array.isArray(this.value)) {
      return '';
    }
    return this.value.join(', ');
  }
}

export interface SingleSelectFilterParams extends FilterConfigParams {
  options?: any[];
  value?: any;
}

export class SingleSelectFilterConfig extends FilterConfig {
  public options: any[];
  constructor(params: SingleSelectFilterParams) {
    super({
      ...params,
      type: 'singleselect',
      value: params.value ?? null,
      defaultValue: null,
    });
    this.options = params.options ?? [];
    this.optionsField = params.optionsField ?? params.field;
  }

  hasFilter(): boolean {
    return !!this.value;
  }

  parseInput(value: any): any {
    return value;
  }

  formatValue(): string {
    if (!this.value) {
      return '';
    }
    return this.value;
  }
}