/**
 * This file contains a snapshot of the dataset statistics. Later, we can fetch the statistics
 * from the API and remove this file.
 */

/*
--- FOR TOTALS
SELECT
    COUNT(DISTINCT pua.predictions_uniprot_annot_id) AS entries,
    COUNT(DISTINCT puace.clean_ec_number) AS ec_numbers,
    COUNT(DISTINCT lower(pua.protein_name)) AS proteins,
    COUNT(DISTINCT accession) AS accessions,
    COUNT(DISTINCT lower(pua.gene_name)) AS genes,
    COUNT(DISTINCT lower(pua.organism)) AS organisms,
    COUNT(CASE WHEN clean_ec_confidence < 0.5 THEN 1 END) AS low_confidence,
    COUNT(CASE WHEN clean_ec_confidence >= 0.5 AND clean_ec_confidence < 0.8 THEN 1 END) AS medium_confidence,
    COUNT(CASE WHEN clean_ec_confidence >= 0.8 THEN 1 END) AS high_confidence
FROM cleandb.predictions_uniprot_annot_clean_ec puace
    INNER JOIN cleandb.predictions_uniprot_annot pua
        ON puace.predictions_uniprot_annot_id = pua.predictions_uniprot_annot_id;

--- FOR EC CLASS STATISTICS
SELECT
    regexp_substr(puace.clean_ec_number, '^\d+') AS ec_class,
    COUNT(DISTINCT pua.predictions_uniprot_annot_id) AS entries,
    COUNT(DISTINCT puace.clean_ec_number) AS ec_numbers,
    COUNT(DISTINCT lower(pua.protein_name)) AS proteins,
    COUNT(DISTINCT accession) AS accessions,
    COUNT(DISTINCT lower(pua.gene_name)) AS genes,
    COUNT(DISTINCT lower(pua.organism)) AS organisms,
    COUNT(CASE WHEN clean_ec_confidence < 0.5 THEN 1 END) AS low_confidence,
    COUNT(CASE WHEN clean_ec_confidence >= 0.5 AND clean_ec_confidence < 0.8 THEN 1 END) AS medium_confidence,
    COUNT(CASE WHEN clean_ec_confidence >= 0.8 THEN 1 END) AS high_confidence
FROM cleandb.predictions_uniprot_annot_clean_ec puace
    INNER JOIN cleandb.predictions_uniprot_annot pua
        ON puace.predictions_uniprot_annot_id = pua.predictions_uniprot_annot_id
GROUP BY ec_class;
*/

export type ECClass = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'TOTAL';

export interface ECClassStatistics {
    ecClass: ECClass
    ecClassTitle: string;
    ecClassDescription: string;
    entries: number;
    ecNumbers: number;
    proteins: number;
    accessions: number;
    genes: number;
    organisms: number;
    lowConfidencePredictions: number;
    midConfidencePredictions: number;
    highConfidencePredictions: number;
}

export const totalStatistics: ECClassStatistics = {
    ecClass: 'TOTAL',
    ecClassTitle: 'All EC Classes',
    ecClassDescription: '',
    entries: 55183064,
    ecNumbers: 5240,
    proteins: 91208,
    accessions: 55183064,
    genes: 1037372,
    organisms: 1098304,
    lowConfidencePredictions: 10742897,
    midConfidencePredictions: 9103690,
    highConfidencePredictions: 39712566
};

export const ecClassStatistics: ECClassStatistics[] = [
    {
        ecClass: 1,
        ecClassTitle: 'Oxidoreductases',
        ecClassDescription: 'Enzymes that catalyze oxidation-reduction reactions.',
        entries: 8310259,
        ecNumbers: 1496,
        proteins: 21038,
        accessions: 8310259,
        genes: 158371,
        organisms: 96152,
        lowConfidencePredictions: 1729239,
        midConfidencePredictions: 1500937,
        highConfidencePredictions: 5730297
    },
    {
        ecClass: 2,
        ecClassTitle: 'Transferases',
        ecClassDescription: 'Enzymes that transfer functional groups from one molecule to another.',
        entries: 19239425,
        ecNumbers: 1577,
        proteins: 39451,
        accessions: 19239425,
        genes: 466999,
        organisms: 172391,
        lowConfidencePredictions: 3698999,
        midConfidencePredictions: 3200446,
        highConfidencePredictions: 13723202
    },
    {
        ecClass: 3,
        ecClassTitle: 'Hydrolases',
        ecClassDescription: 'Enzymes that catalyze the hydrolysis of various bonds.',
        entries: 13501331,
        ecNumbers: 1027,
        proteins: 38464,
        accessions: 13501331,
        genes: 314657,
        organisms: 212827,
        lowConfidencePredictions: 3432118,
        midConfidencePredictions: 2584094,
        highConfidencePredictions: 8053882
    },
    {
        ecClass: 4,
        ecClassTitle: 'Lyases',
        ecClassDescription: 'Enzymes that catalyze the breaking of various chemical bonds by means other than hydrolysis and oxidation.',
        entries: 4356568,
        ecNumbers: 609,
        proteins: 11872,
        accessions: 4356568,
        genes: 50659,
        organisms: 115598,
        lowConfidencePredictions: 616726,
        midConfidencePredictions: 564920,
        highConfidencePredictions: 3407707
    },
    {
        ecClass: 5,
        ecClassTitle: 'Isomerases',
        ecClassDescription: 'Enzymes that catalyze the rearrangement of atoms within a molecule.',
        entries: 2872164,
        ecNumbers: 255,
        proteins: 5931,
        accessions: 2872164,
        genes: 35774,
        organisms: 57862,
        lowConfidencePredictions: 441563,
        midConfidencePredictions: 404429,
        highConfidencePredictions: 2157278
    },
    {
        ecClass: 6,
        ecClassTitle: 'Ligases',
        ecClassDescription: 'Enzymes that catalyze the joining of two molecules with the formation of a new bond, typically with the consumption of ATP.',
        entries: 3414089,
        ecNumbers: 198,
        proteins: 4822,
        accessions: 3414089,
        genes: 33382,
        organisms: 51569,
        lowConfidencePredictions: 379959,
        midConfidencePredictions: 415020,
        highConfidencePredictions: 2877488
    },
    {
        ecClass: 7,
        ecClassTitle: 'Translocases',
        ecClassDescription: 'Enzymes that catalyze the movement of ions or molecules across membranes.',
        entries: 4417016,
        ecNumbers: 78,
        proteins: 2214,
        accessions: 4417016,
        genes: 18213,
        organisms: 857722,
        lowConfidencePredictions: 444293,
        midConfidencePredictions: 433844,
        highConfidencePredictions: 3762712
    }
];
