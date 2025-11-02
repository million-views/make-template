# Tasks: Enhance make-template Analyzers for Content Templatization in React/Vite Projects

## Implementation Tasks

- [x] Implement JSX file discovery in PlaceholderFinder
- [x] Add regex patterns for text content extraction
- [x] Add regex patterns for image src extraction
- [x] Add regex patterns for link href extraction
- [x] Add regex patterns for alt text extraction
- [x] Implement placeholder name generation logic
- [x] Integrate JSX processing into findPlaceholders method
- [x] Add exclusion logic for non-templatizable elements
- [x] Update output structure with category and location
- [x] Add comprehensive unit tests for JSX parsing
- [x] Add integration tests with vite-react fixture
- [x] Test with representative React/Vite codebase
- [x] Validate backward compatibility
- [x] Update documentation if needed

## Testing Tasks

- [x] Create test fixtures with JSX content matching reference examples
- [x] Verify detection of company name, tagline, quotes, logo URL, alt text, banner links
- [x] Ensure no false positives for CSS classes, component names, imports
- [x] Confirm categorization accuracy (text, image, link, alt)
- [x] Test performance with larger JSX files

## Validation Tasks

- [x] Run full test suite to ensure no regressions
- [x] Manual testing with sample projects
- [x] Code review for adherence to Kiro principles