export interface CleanDbPredictedEC {
    ec_number: string;
    score: number;
}

export interface CleanDbRecord {
    protein: string;
    uniprot: string;
    organism: string;
    curation_status: string;
    predicted_ec: CleanDbPredictedEC[];
    id: string;
    gene_id: string;
    ncbi_tax_id: number;
    ec_uniprot?: string;
    amino_acids: number;    
    sequence: string;
    function: string;
}