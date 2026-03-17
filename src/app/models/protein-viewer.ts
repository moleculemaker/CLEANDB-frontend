export type ProteinViewerStyle = 'cartoon' | 'stick' | 'line' | 'sphere';
export type ProteinColorScheme = 'spectrum' | 'chain' | 'ssJmol' | 'residue' | 'default';

export interface ResidueSelection {
  resi: number;
  resn: string;
  chain: string;
}
