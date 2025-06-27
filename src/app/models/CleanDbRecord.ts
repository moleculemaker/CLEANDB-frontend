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
    gene_name: string;
    ncbi_tax_id: string;
    ec_uniprot: string[];
    amino_acids: string;
    sequence: string;
    function: string;
    generic_names: {
        name: string;
        ec: string;
    }[];
}

export interface CleanDbRecordRaw {
    predictions_uniprot_annot_id: number;
    uniprot: string;
    curation_status: string;
    accession: string;
    protein: string | null;
    organism: string;
    ncbi_tax_id: number;
    amino_acids: number;
    sequence: string;
    function: string | null;
    gene_name: string | null;
    predicted_ec: CleanDbPredictedEC[];
    annot_ec_number_array: string[] | null;
}

import ecJson from '~/assets/ec_class_name_mapping.json';

export function cleanDbRecordRawToCleanDbRecord(raw: CleanDbRecordRaw): CleanDbRecord {
    return {
        protein: raw.protein?.trim() || '',
        uniprot: raw.uniprot.trim(),
        organism: raw.organism.trim(),
        curation_status: raw.curation_status.trim(),
        predicted_ec: raw.predicted_ec,
        ec_uniprot: raw.annot_ec_number_array?.map(ec => ec.trim()) || [],
        id: raw.predictions_uniprot_annot_id.toString(),
        gene_name: raw.gene_name?.trim() || '',
        ncbi_tax_id: `${raw.ncbi_tax_id}`,
        amino_acids: `${raw.amino_acids}`,
        sequence: raw.sequence.trim(),
        function: raw.function?.trim() || '',
        generic_names: raw.predicted_ec?.map((ec: CleanDbPredictedEC) => 
            ({
                name: ecJson[ec.ec_number as keyof typeof ecJson]?.ec_name,
                ec: ec.ec_number,
            })),
    }
}