# Design: Enhance make-template Analyzers for Content Templatization in React/Vite Projects

## Overview
Extend the `PlaceholderFinder` class to analyze JSX/TSX files for templatizable content, in addition to existing config file analysis. Use regex-based parsing for efficiency and to maintain zero external dependencies.

## Architecture

### Core Changes
- **New Method**: `processJsxPlaceholders()` in `PlaceholderFinder`
- **File Discovery**: Scan for `.jsx`, `.tsx` files in `src/` directory
- **Parsing Strategy**: Regex patterns to extract content from JSX strings and attributes

### Placeholder Detection Patterns

#### Text Content
- Pattern: `>([^<>{}]+)<` (text between tags, excluding dynamic content in {})
- Exclude: Empty strings, whitespace-only, or very short strings (< 3 chars)
- Category: `text`
- Name Generation: `TEXT_CONTENT_${index}` or inferred from content (e.g., if contains "company" -> `COMPANY_NAME`)

#### Image Sources
- Pattern: `<img[^>]*src=["']([^"']+)["'][^>]*>`
- Category: `image`
- Name: `IMAGE_URL_${index}` or `LOGO_URL` if path contains "logo"

#### Link URLs
- Pattern: `<a[^>]*href=["']([^"']+)["'][^>]*>`
- Category: `link`
- Name: `LINK_URL_${index}`

#### Alt Text
- Pattern: `<img[^>]*alt=["']([^"']+)["'][^>]*>`
- Category: `alt`
- Name: `ALT_TEXT_${index}`

### Exclusion Rules
- Skip `className`, `style`, `id` attributes
- Skip component names (capitalized tags like `<MyComponent>`)
- Skip import statements
- Skip dynamic content in `{}` expressions

### Output Structure
Each placeholder object includes:
```javascript
{
  name: 'COMPANY_NAME',
  value: 'Million Views',
  placeholder: '{{COMPANY_NAME}}',
  files: ['src/App.jsx'],
  location: 'line 5, column 10',
  category: 'text'
}
```

### Integration
- Add JSX processing to `findPlaceholders()` method for 'vite-react' project type
- Maintain backward compatibility with existing config file processing

## Implementation Considerations

### Performance
- Limit scanning to `src/` directory
- Use efficient regex with lazy matching
- Process files sequentially to avoid memory issues

### Accuracy
- Regex may miss complex JSX structures
- False positives possible with nested quotes
- Future enhancement: Consider AST parsing if accuracy issues arise

### Testing
- Add test fixtures with representative JSX content
- Unit tests for regex patterns
- Integration tests with full project analysis

## Dependencies
- No new external dependencies (regex-based approach)
- If AST parsing needed later, evaluate @babel/parser as optional dependency

## Risk Mitigation
- Fallback to existing behavior if JSX parsing fails
- Comprehensive test coverage before deployment
- Gradual rollout with feature flag if needed