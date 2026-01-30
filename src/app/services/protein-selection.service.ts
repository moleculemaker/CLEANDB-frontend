import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResidueSelection } from '~/app/models/protein-viewer';

@Injectable({
  providedIn: 'root'
})
export class ProteinSelectionService {
  private selectionsMap$ = new BehaviorSubject<Map<string, ResidueSelection[]>>(new Map());

  getSelections$(viewerId: string): Observable<ResidueSelection[]> {
    return this.selectionsMap$.pipe(
      map(m => m.get(viewerId) ?? [])
    );
  }

  setSelections(viewerId: string, selections: ResidueSelection[]): void {
    const current = new Map(this.selectionsMap$.value);
    current.set(viewerId, [...selections]);
    this.selectionsMap$.next(current);
  }

  toggleSelection(viewerId: string, residue: ResidueSelection): void {
    const current = new Map(this.selectionsMap$.value);
    const existing = current.get(viewerId) ?? [];
    const idx = existing.findIndex(
      r => r.resi === residue.resi && r.chain === residue.chain
    );
    if (idx >= 0) {
      existing.splice(idx, 1);
    } else {
      existing.push(residue);
    }
    current.set(viewerId, [...existing]);
    this.selectionsMap$.next(current);
  }

  clearSelections(viewerId: string): void {
    const current = new Map(this.selectionsMap$.value);
    current.set(viewerId, []);
    this.selectionsMap$.next(current);
  }
}
