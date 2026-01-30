export interface AppliedFilters {
  protein: string[];
  organism: string[];
  curation_status: string[];
  ec_number: string[];
  confidence_min: number | null;
  confidence_max: number | null;
  confidence_category: string | null;
}

export const EMPTY_FILTERS: AppliedFilters = {
  protein: [],
  organism: [],
  curation_status: [],
  ec_number: [],
  confidence_min: null,
  confidence_max: null,
  confidence_category: null,
};

export const CONFIDENCE_CATEGORIES = [
  { label: 'Low', value: 'low', min: 0.0, max: 0.5 },
  { label: 'Low to Medium', value: 'low-medium', min: 0.0, max: 0.8 },
  { label: 'Low to High', value: 'low-high', min: 0.0, max: 1.0 },
  { label: 'Medium', value: 'medium', min: 0.5, max: 0.8 },
  { label: 'Medium to High', value: 'medium-high', min: 0.5, max: 1.0 },
  { label: 'High', value: 'high', min: 0.8, max: 1.0 },
];

export function filtersToApiParams(filters: AppliedFilters): Record<string, any> {
  const params: Record<string, any> = {};
  if (filters['protein'].length) params['protein'] = filters['protein'];
  if (filters['organism'].length) params['organism'] = filters['organism'];
  if (filters['curation_status'].length) params['curation_status'] = filters['curation_status'];
  if (filters['ec_number'].length) params['ec_number'] = filters['ec_number'];
  if (filters['confidence_min'] != null) params['clean_ec_confidence_min'] = filters['confidence_min'];
  if (filters['confidence_max'] != null) params['clean_ec_confidence_max'] = filters['confidence_max'];
  return params;
}

export function hasActiveFilters(filters: AppliedFilters): boolean {
  return filters.protein.length > 0 ||
    filters.organism.length > 0 ||
    filters.curation_status.length > 0 ||
    filters.ec_number.length > 0 ||
    filters.confidence_min != null ||
    filters.confidence_max != null;
}
