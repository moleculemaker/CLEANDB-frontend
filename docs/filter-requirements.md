# Filter Feature - Frontend Requirements

## Overview

A modal-based filter system that allows users to refine **existing search results** on the database-search page. Filters are applied only when the user clicks "Apply Filters". Active filters are displayed as removable chips on the main page.

---

## Filter Specifications

| Filter | Type | Data Source | API Parameter |
|--------|------|-------------|---------------|
| Protein Name | Typeahead (multi-select, paginated) | `/api/v1/typeahead?field_name=protein_name` | `protein` |
| Organism | Typeahead (multi-select, paginated) | `/api/v1/typeahead?field_name=organism` | `organism` |
| Curation Status | Static dropdown (multi-select) | `/api/v1/curation-statuses` | `curation_status` |
| Predicted EC Number | Typeahead (multi-select, paginated) | `/api/v1/typeahead?field_name=predicted_ec` | `ec_number` |
| Confidence Score Category | Static dropdown (single-select, contiguous only) | UI-defined | Maps to `clean_ec_confidence_min/max` |
| Confidence Score Range | Dual numeric input | User-entered | `clean_ec_confidence_min`, `clean_ec_confidence_max` |

**Note:** All typeahead requests include the current search context (original search + applied filters) so that options are constrained to the current result set.

---

## Filter Logic

- **Within a filter:** OR logic
  - Example: `Organism = "Homo sapiens" OR "Mus musculus"`
- **Across filters:** AND logic
  - Example: `(Organism = "Homo sapiens" OR "Mus musculus") AND (Confidence >= 0.8)`
- **Relationship to search:** Filters are additive constraints on the original search query

---

## Modal Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⊽ Filters                                                        ✕ │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Identifiers                    │   Predictions                    │
│                                  │                                  │
│   Protein Name                   │   Predicted EC Number            │
│   ┌────────────────────────┐     │   ┌────────────────────────┐     │
│   │ Select proteins      ▼ │     │   │ Select EC number     ▼ │     │
│   └────────────────────────┘     │   └────────────────────────┘     │
│                                  │                                  │
│   Organism                       │   Confidence Score Category      │
│   ┌────────────────────────┐     │   ┌────────────────────────┐     │
│   │ Select organisms     ▼ │     │   │ Select category      ▼ │     │
│   └────────────────────────┘     │   └────────────────────────┘     │
│                                  │                                  │
│   Curation Status                │   Confidence Score Range         │
│   ┌────────────────────────┐     │   ┌──────────┐  ┌──────────┐     │
│   │ Select status        ▼ │     │   │ Min      │  │ Max      │     │
│   └────────────────────────┘     │   └──────────┘  └──────────┘     │
│                                  │                                  │
├─────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐                              ┌───────────────────┐ │
│ │ Reset Filters │                             │   Apply Filters   │ │
│ └──────────────┘                              └───────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Modal Interactions

| Action | Trigger | Behavior |
|--------|---------|----------|
| Open modal | Click "Filter" button on results page | Display modal with current filter state |
| Close modal | Click ✕, click outside modal, press Escape | Close without applying; discard unsaved changes |
| Reset Filters | Click "Reset Filters" button | Clear all selections; modal stays open |
| Apply Filters | Click "Apply Filters" button | Close modal; trigger API request with original search + filters |

---

## Individual Filter Behaviors

### Protein Name (Typeahead Multi-select, Paginated)

- User types in input field
- After 3+ characters, call:
  ```
  GET /api/v1/typeahead?field_name=protein_name&search={query}&limit=20&offset=0&{search_context_params}
  ```
- `{search_context_params}` = original search params + any applied filters
- Show loading spinner while fetching
- Display matches in dropdown
- **Infinite scroll:** When user scrolls to bottom of dropdown, fetch next page (`offset=20`, `offset=40`, etc.)
- Click match to add as selection chip
- Multiple selections allowed
- Chips displayed inside or below the input

### Organism (Typeahead Multi-select, Paginated)

- Same behavior as Protein Name
- Uses `/api/v1/typeahead?field_name=organism&search={query}&limit=20&offset=0&{search_context_params}`

### Predicted EC Number (Typeahead Multi-select, Paginated)

- Same behavior as Protein Name
- Uses `/api/v1/typeahead?field_name=predicted_ec&search={query}&limit=20&offset=0&{search_context_params}`

### Curation Status (Static Multi-select)

- On modal open, fetch options from `/api/v1/curation-statuses`
- Display as checkbox list or multi-select dropdown
- Options: "Reviewed (Swiss-Prot)", "Unreviewed (TrEMBL)"
- Multiple selections allowed

### Confidence Score Category (Single-select, Contiguous)

Only contiguous range selections are allowed.

**Dropdown Options:**

| Option | Min | Max |
|--------|-----|-----|
| Low | 0.0 | 0.5 |
| Low to Medium | 0.0 | 0.8 |
| Low to High | 0.0 | 1.0 |
| Medium | 0.5 | 0.8 |
| Medium to High | 0.5 | 1.0 |
| High | 0.8 | 1.0 |

**Interaction with Range Input:**
- Selecting a category auto-fills the Min/Max range inputs
- Category and Range are linked but user can override

### Confidence Score Range (Dual Numeric Input)

- Two input fields: Min and Max
- Default: empty (no filter)
- Validation:
  - Min ≤ Max
  - Both values between 0.0 and 1.0
  - Show inline error if invalid
- If user manually edits, clear the Category dropdown selection
- Accept decimal values (e.g., 0.75)

---

## Filter Chips (Main Page)

After filters are applied, display active filters as removable chips above the results table.

### Chip Display Format

```
┌─────────────────────────────────────────────────────────────────────┐
│ Active Filters:                                                     │
│ [Organism: Homo sapiens ✕] [Confidence: 0.8-1.0 ✕] [Clear All]     │
└─────────────────────────────────────────────────────────────────────┘
```

### Chip Behaviors

| Chip Type | Display | On Remove |
|-----------|---------|-----------|
| Single value | `Organism: Homo sapiens` | Remove filter, re-fetch |
| Multiple values | `Organism: Homo sapiens +2 more` | Remove entire filter, re-fetch |
| Confidence range | `Confidence: 0.8-1.0` | Remove range filter, re-fetch |
| Clear All | `Clear All` (link/button) | Remove all filters, re-fetch |

### Tooltip on Hover (Multi-value)

When a chip has multiple values, show full list on hover:
```
Homo sapiens
Mus musculus  
Rattus norvegicus
```

---

## Empty Results State

When applied filters return zero results:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    No results match your filters                    │
│                                                                     │
│     Active filters: Organism: Homo sapiens, Confidence: 0.9-1.0    │
│                                                                     │
│                      [ Reset Filters ]                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

- Display friendly message
- Show which filters are currently active
- Provide "Reset Filters" button to clear all filters and re-fetch

---

## State Management

| State | Scope | Persistence |
|-------|-------|-------------|
| Draft selections in modal | Modal session | Lost if modal closed without Apply |
| Applied filters | Page session | Persist until reset or page refresh |
| URL synchronization | — | Not implemented |
| Cross-session storage | — | Not implemented |

### State Flow

```
User opens modal
       │
       ▼
┌─────────────────┐
│  Draft State    │ ← User makes selections
│  (in modal)     │
└────────┬────────┘
         │
         ▼
    ┌─────────┐
    │ Apply?  │
    └────┬────┘
    Yes  │  No
    ▼    │    ▼
┌────────┴────────┐
│ Applied State   │    Discard draft
│ (persisted)     │
└─────────────────┘
         │
         ▼
   API call with
   original search
   + applied filters
```

---

## Loading States

| Scenario | UI Behavior |
|----------|-------------|
| Typeahead fetching | Spinner inside dropdown |
| Typeahead loading more (infinite scroll) | Spinner at bottom of dropdown list |
| Applying filters | Disable "Apply Filters" button; show spinner on results table |
| Removing chip | Disable chip; show spinner on results table |

---

## Error Handling

| Error | Handling |
|-------|----------|
| Typeahead request fails | Show "Failed to load suggestions" in dropdown; allow retry |
| Typeahead pagination fails | Show "Failed to load more" at bottom of list; allow retry |
| Filter request fails | Show toast/alert: "Failed to apply filters. Please try again." |
| Invalid confidence range | Inline validation error; disable Apply until fixed |

---

## Accessibility Requirements

- Modal traps focus when open
- Escape key closes modal
- All form inputs have associated labels
- Chips are keyboard-navigable and removable via keyboard
- Screen reader announces when filters are applied/removed
- Color is not the only indicator of state (use icons, text)