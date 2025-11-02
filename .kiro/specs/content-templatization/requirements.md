# Requirements: Enhance make-template Analyzers for Content Templatization in React/Vite Projects

## Objective
Update the analyzers in `make-template` to automatically identify and extract all project-specific content values from React (JSX/TSX) and related files, not just config files.

## Functional Requirements

### 1. Expand Placeholder Detection
- Analyze JSX/TSX files to find hardcoded values that are likely to change between projects or instances, including:
  - Text content (e.g., headings, taglines, quotes, citations)
  - Image sources (e.g., logo URLs)
  - Link URLs (e.g., hrefs in `<a>` tags)
  - Alt text for images

### 2. Categorize Placeholders
- Clearly categorize extracted values as:
  - Text Content
  - Image URLs
  - Link URLs
  - Alt Text

### 3. Exclude Non-Templatizable Elements
- Do NOT treat CSS class names, style objects, component names, or framework/library imports as placeholders.

### 4. Output Format
- For each detected placeholder, output:
  - The placeholder name (e.g., COMPANY_NAME, LOGO_URL)
  - The original value
  - The file and location (line/column or AST path)
  - The category (text, image, link, alt)

### 5. Testing Requirements
- Add/expand tests to ensure analyzers correctly extract these values from representative React/Vite codebases.

## Non-Functional Requirements
- Maintain backward compatibility with existing analyzer functionality
- Performance: Analysis should be efficient for typical React/Vite project sizes
- Accuracy: Minimize false positives in placeholder detection

## Reference Example
From the current codebase, the following should be detected as templatizable:
- Company name: "Million Views"
- Tagline: "Ideas Worth Pursuing"
- Quote: "You can resist an invading army, but you cannot resist an idea whose time has come."
- Quote citation: "— Victor Hugo"
- Logo URL: "https://m5nv.com/logo.png"
- Logo alt: "Million Views Logo"
- Banner link: "https://m5nv.com"

## Rationale
This will ensure that `make-template` can generate more complete and useful templates for React/Vite projects, capturing all user-facing content and project-specific values, not just config metadata.

## Acceptance Criteria
- All specified content types are detected in JSX/TSX files
- Placeholders are correctly categorized
- Non-templatizable elements are excluded
- Tests pass for representative codebases
- Existing functionality remains intact