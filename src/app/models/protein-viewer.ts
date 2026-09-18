export type ProteinViewerStyle = 'cartoon' | 'stick' | 'line' | 'sphere';
export type ProteinColorScheme = 'spectrum' | 'chain' | 'ssJmol' | 'residue' | 'default';

/**
 * Per-residue override colors, keyed by 1-based residue number (3Dmol `resi`)
 * and valued as any CSS color 3Dmol accepts (d3's scales hand back `rgb(r, g, b)`).
 * Applied on top of the base colorScheme, so residues absent from the map keep
 * the scheme's color.
 */
export type ProteinResidueColors = Record<number, string>;

/**
 * How the loaded model numbers its residues: how many distinct `resi` values it
 * has and the bounds of that range. Callers mapping positional data onto the
 * structure need all three, because a matching count on its own does not
 * establish that residue N holds sequence position N.
 */
export interface ResidueNumbering {
  count: number;
  min: number;
  max: number;
}

export interface ResidueSelection {
  resi: number;
  resn: string;
  chain: string;
}
