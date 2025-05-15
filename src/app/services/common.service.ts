import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { Loadable, LoadingStatus } from './openenzymedb.service';
import { SharedService } from '../api/mmli-backend/v1';

@Injectable({
  providedIn: 'root'
})
export class CommonService {

  constructor(
    private sharedService: SharedService
  ) { }

  drawSMILES(
    smiles: string, 
    highlightAtoms: number[] = []
  ): Observable<Loadable<string>> {
    
    return new Observable(observer => {
      observer.next({ status: 'loading', data: null });

      const subscription = this.sharedService.drawSmilesSmilesDrawGet(smiles, highlightAtoms)
        .pipe(
          map((res: string) => ({ 
            status: 'loaded' as LoadingStatus, 
            data: res 
          })),
          catchError((error: Response) => {
            console.error('Error validating chemical:', error);
            const loadable: Loadable<string> = {
              status: 'invalid',
              data: null
            };
            return of(loadable);
          })
        )
        .subscribe((res) => {
          observer.next(res);
          observer.complete();
        });

      return () => {
        subscription.unsubscribe()
      };
    });
  }
}
