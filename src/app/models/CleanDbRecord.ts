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
    ID: string;
    Accession: string;
    Organism: string;
    Sequence: string;
    'Curation Status': string;
    'Protein Name': string;
    'NCBI TaxID': string;
    'Amino Acids': string;
    'CLEAN_EC': string;

    Function?: string;
    'Gene Name'?: string;
    "EC Number"?: string[];
}

import ecJson from '~/assets/ec_class_name_mapping.json';

export function cleanDbRecordRawToCleanDbRecord(raw: CleanDbRecordRaw): CleanDbRecord {
    const cleanEcEntries = raw['CLEAN_EC']?.split(',').map(ec => {
        const [ec_number, score] = ec.split('/');
        return {
            ec_number: ec_number.split(':')[1],
            score: parseFloat(score),
        }
    }) || [];
    return {
        protein: raw['Protein Name'],
        uniprot: raw.Accession,
        organism: raw.Organism,
        curation_status: raw['Curation Status'],
        predicted_ec: cleanEcEntries,
        ec_uniprot: raw['EC Number'] || [],
        id: raw.ID,
        gene_id: raw['Gene Name'] || '',
        ncbi_tax_id: raw['NCBI TaxID'],
        amino_acids: raw['Amino Acids'],
        sequence: raw.Sequence,
        function: raw.Function || '',
        generic_names: cleanEcEntries?.map((ec: CleanDbPredictedEC) => 
            ({
                name: ecJson[ec.ec_number as keyof typeof ecJson]?.ec_name,
                ec: ec.ec_number,
            })),
    }
}