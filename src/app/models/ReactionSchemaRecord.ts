export interface ReactionSchemaRecordChemicalRaw {
  chebi_id: string;
  name: string;
  formula: string;
  smiles: string;
}

export type ReactionSchemaRecord = {
  reactionPartners: string;
  reactants: ReactionSchemaRecordChemicalRaw[];
  products: ReactionSchemaRecordChemicalRaw[];

  ligandStructureId?: number;
};

export interface ReactionSchemaRecordRaw {
  reaction_id: string;
  accession: string;
  ec_numbers: string[];
  equation: string;
  substrates: ReactionSchemaRecordChemicalRaw[];
  products: ReactionSchemaRecordChemicalRaw[];
}

export function reactionSchemaRecordRawToReactionSchemaRecord(raw: ReactionSchemaRecordRaw): ReactionSchemaRecord {
  return {
    reactionPartners: raw.equation,
    reactants: raw.substrates,
    products: raw.products,
  };
}