import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AlphafoldService {

  private readonly API_URL = 'https://alphafold.ebi.ac.uk/files';

  constructor(
    private http: HttpClient
  ) { }

  /**
   * Get 3D Protein Structure from AlphaFold
   */
  get3DProtein(uniprot: string): Observable<string> {
    return this.http.get(`${this.API_URL}/AF-${uniprot}-F1-model_v4.pdb`, { responseType: 'text' });
  }
}
