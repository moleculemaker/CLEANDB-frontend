/**
 * CLEAN Data API
 * API for accessing enzyme kinetic data from the CLEAN database  ## Automatic Pagination  When a query would return more than 5000 records and no explicit limit is provided, the API will automatically paginate results to return 5000 records at a time. The response will include pagination metadata with links to navigate to next and previous pages.  This threshold can be configured using the AUTO_PAGINATION_THRESHOLD environment variable. 
 *
 * The version of the OpenAPI document: 0.1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


/**
 * Model for the response of a CLEAN typeahead query.
 */
export interface CLEANTypeaheadResponse { 
    field_name?: CLEANTypeaheadResponse.FieldNameEnum | null;
    /**
     * Search term for typeahead suggestions (minimum 3 characters)
     */
    search?: any | null;
    /**
     * List of results matching the search term.
     */
    matches?: any | null;
}
export namespace CLEANTypeaheadResponse {
    export type FieldNameEnum = 'accession' | 'organism' | 'protein_name' | 'gene_name';
    export const FieldNameEnum = {
        Accession: 'accession' as FieldNameEnum,
        Organism: 'organism' as FieldNameEnum,
        ProteinName: 'protein_name' as FieldNameEnum,
        GeneName: 'gene_name' as FieldNameEnum
    };
}


