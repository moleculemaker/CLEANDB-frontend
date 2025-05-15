import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Loadable } from './openenzymedb.service';

@Injectable({
  providedIn: 'root'
})
export class CactusService {
  private readonly API_URL = 'https://cactus.nci.nih.gov';

  constructor(
    private http: HttpClient
  ) { }


  /**
   * Get SMILES from Cactus
   */
  getSMILESFromName(name: string): Observable<Loadable<string>> {
    return new Observable(observer => {
      observer.next({ status: 'loading', data: null });

      const subscription = this.http.get(`${this.API_URL}/chemical/structure/${name}/smiles`, { responseType: 'text' })
        .subscribe({
          next: (smiles) => {
            console.log('[cactus-service] smiles', smiles);
            observer.next({ status: 'loaded', data: smiles });
            observer.complete();
          },
          error: (error) => {
            observer.next({ 
              status: error.status >= 500 ? 'error' : 'invalid',
              data: null 
            });
            observer.complete();
          }
        });

      return () => subscription.unsubscribe();
    });
  }
}
