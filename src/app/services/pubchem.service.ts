import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, of, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PubchemService {

  private readonly API_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

  constructor(
    private http: HttpClient
  ) { }

  /**
   * Get Compound SMILES from PubChem in Text format
   */
  getCompoundSMILES(name: string): Observable<string> {
    return this.http.get(`${this.API_URL}/compound/name/${name}/smiles/TXT`, { responseType: 'text' });
  }

  /**
   * Get Compound Name from PubChem in Text format
   */
  getCompoundNameFromSMILES(smiles: string): Observable<string> {
    return this.http.get(`${this.API_URL}/compound/smiles/${smiles}/name/TXT`, { responseType: 'text' });
  }

  getCompoundCIDsFromSMILES(smiles: string): Observable<string> {
    return this.http.get(`${this.API_URL}/compound/smiles/${smiles}/cids/TXT`, { responseType: 'text' });
  }

  /**
   * Get 3D Structure from PubChem in SDF format
   */
  get3DStructureFromSMILES(smiles: string): Observable<string> {
    return this.getCompoundCIDsFromSMILES(smiles).pipe(
      switchMap((cidline: string) => {
        const cids = cidline.split('\n').filter(cid => cid.trim() !== '');
        if (cids.length === 0) {
          throw new Error('No CID found for the given SMILES');
        }
        return this.http.get(`${this.API_URL}/compound/cid/${cids[0]}/record/SDF?record_type=3d`, { responseType: 'text' });
      })
    );
  }
}
