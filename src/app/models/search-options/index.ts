import { StringSearchOption } from './StringSearchOption';
import { RangeSearchOption } from './RangeSearchOption';
import { MoleculeSearchOption } from './MoleculeSearchOption';
import { SmilesSearchOption } from './SmilesSearchOption';

export type SearchType = 'string' | 'range' | 'molecule' | 'smiles';

export type SearchOption = StringSearchOption | RangeSearchOption | MoleculeSearchOption | SmilesSearchOption;

export interface QueryValue {
  selectedOption: string;
  value: any;
  [key: string]: any;
}

export * from './StringSearchOption';
export * from './RangeSearchOption';
export * from './MoleculeSearchOption';
export * from './SmilesSearchOption';