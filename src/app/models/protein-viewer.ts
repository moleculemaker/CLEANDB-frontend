export type ProteinViewerStyle = 'cartoon' | 'stick' | 'line' | 'sphere';
export type ProteinColorScheme = 'spectrum' | 'chain' | 'ssJmol' | 'residue' | 'default';

/**
 * Per-residue override colors, keyed by 1-based residue number (3Dmol `resi`)
 * and valued as CSS hex. Applied on top of the base colorScheme, so residues
 * absent from the map keep the scheme's color.
 */
export type ProteinResidueColors = Record<number, string>;

export interface ResidueSelection {
  resi: number;
  resn: string;
  chain: string;
}
