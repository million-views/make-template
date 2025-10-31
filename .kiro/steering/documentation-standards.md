---
inclusion: always
---

# Documentation Maintenance Guidelines

## Core Principle: Avoid Maintenance Liabilities

Documentation should be helpful and accurate without creating unnecessary maintenance overhead. Follow these guidelines to prevent documentation debt.

## Maintenance Liability Test

Before including specific numbers, versions, or counts in documentation, ask:

**❌ AVOID (High Maintenance Liability):**

- Implementation details that change with code evolution
- Specific test counts ("78+ tests", "36 functional tests")
- Specific version requirements that will evolve ("Node.js 22+")
- Internal metrics that fluctuate ("47 CLI tests")
- Point-in-time snapshots of changing data

**✅ KEEP (Low Maintenance Liability):**

- User guidance and time estimates ("15 minutes", "30 minutes setup")
- API constraints and system limits ("1-720 hours", "TTL range")
- Realistic examples showing user experience ("v20.10.0" in command output)
- Design decisions and architectural constants ("24 hours default TTL")
- Business requirements and user-facing features

## Specific Guidelines

### Test References

```markdown
❌ BAD: "All changes must pass 78+ tests across 4 specialized test suites"
✅ GOOD: "All changes must pass our complete test suite"

❌ BAD: "npm run test:functional # 36 end-to-end CLI behavior tests"
✅ GOOD: "npm run test:functional # End-to-end CLI behavior tests"
```

### Version Requirements

```markdown
❌ BAD: "Node.js 22+ required"
✅ GOOD: "Node.js (latest LTS) required"

❌ BAD: "Upgrade to Node.js 22 or later"
✅ GOOD: "Upgrade to supported Node.js version"
```

### System Capabilities

```markdown
❌ BAD: "The project maintains 78+ tests across 4 specialized test suites"
✅ GOOD: "The project maintains comprehensive test coverage across multiple specialized test suites"

❌ BAD: "36 tests covering end-to-end CLI behavior"
✅ GOOD: "Comprehensive end-to-end CLI behavior tests"
```

### Acceptable Specificity

```markdown
✅ GOOD: "estimated_time: 15 minutes" (user guidance)
✅ GOOD: "Cache TTL (1-720 hours)" (API constraint)
✅ GOOD: "Default TTL: 24 hours" (design decision)
✅ GOOD: "Files: 12 files, 3 directories" (realistic example output)
```

## Implementation Strategy

### For New Documentation

1. **Write generically first** - Use descriptive terms instead of specific counts
2. **Question every number** - Apply the maintenance liability test
3. **Focus on capabilities** - Describe what the system does, not internal metrics
4. **Use ranges for constraints** - When specificity is needed, use ranges that won't change

### For Existing Documentation

1. **Regular audits** - Review docs quarterly for maintenance liabilities
2. **Update during changes** - When code changes, update related generic descriptions
3. **Validation scripts** - Use automated tools to catch specific patterns
4. **Team awareness** - Educate contributors on these principles

## Generated Content Guardrails

- **Verify before committing**: Treat AI-assisted or templated drafts as outlines. Cross-check every file path, command name, and configuration detail against the current repository state before committing.
- **Prefer canonical entry points**: Reference stable interfaces like `npm test`, documented scripts, or shared utilities instead of enumerating individual test files or legacy runner names. If an example must mention a file, confirm the kebab-case filename in `test/` first.
- **Standardize on `node --test`**: Always reference the native Node.js test runner when describing how to execute or add tests. Replace any mentions of custom harnesses or deprecated `node` scripts with the canonical `node --test` workflow before publishing documentation.
- **Reproduce real outputs**: When showing command output or code snippets produced by tools, rerun the command locally and capture the actual output so examples reflect the current behavior.
- **Reject legacy patterns**: If generated content references deprecated infrastructure (custom runners, camelCase suites, obsolete directories), rewrite it to match the modernized workflow before submitting the documentation.

## Validation and Enforcement

### Automated Checks

- Use validation scripts to detect patterns like "\\d+ tests", "\\d+ files", "version \\d+"
- Flag specific version requirements in reviews
- Check for hard-coded counts in comments and documentation

### Review Guidelines

- During PR reviews, question any specific numbers
- Ask: "Will this number change if we add/remove tests/features?"
- Suggest generic alternatives for maintenance liabilities

### Documentation Templates

- Update templates to use generic language
- Provide examples of good vs. bad specificity
- Include maintenance liability guidance in templates

## Common Examples

### Test Suite References
```markdown
❌ HIGH MAINTENANCE: "Project has 47+ tests across 3 test suites"
✅ LOW MAINTENANCE: "Project has comprehensive test coverage"

❌ HIGH MAINTENANCE: "npm run test:unit    # 23 unit tests"
✅ LOW MAINTENANCE: "npm run test:unit    # Unit test suite"
```

### Version Requirements
```markdown
❌ HIGH MAINTENANCE: "Requires Python 3.11+ and Django 4.2+"
✅ LOW MAINTENANCE: "Requires Python (latest stable) and Django (LTS)"

❌ HIGH MAINTENANCE: "Compatible with React 18.2+ and Next.js 13+"
✅ LOW MAINTENANCE: "Compatible with React (latest) and Next.js (current)"
```

### System Metrics
```markdown
❌ HIGH MAINTENANCE: "API supports 15 endpoints across 4 modules"
✅ LOW MAINTENANCE: "API provides comprehensive endpoint coverage"

❌ HIGH MAINTENANCE: "Database contains 23 tables with 156 columns"
✅ LOW MAINTENANCE: "Database schema supports all application features"
```

## Benefits

### Reduced Maintenance Overhead

- No need to update docs when test counts change
- Version requirements can evolve without doc updates
- Focus on capabilities rather than implementation details

### Better User Experience

- Users care about capabilities, not internal metrics
- Generic descriptions are often clearer and more helpful
- Reduces confusion from outdated specific numbers

### Future-Proof Documentation

- Documentation remains accurate as code evolves
- Less likely to become outdated or misleading
- Easier to maintain consistency across large documentation sets

## Red Flags to Watch For

During documentation work, be alert for these patterns:

- Specific test counts in any context
- Version numbers in requirements (unless truly fixed)
- Internal metrics exposed to users
- Point-in-time snapshots of changing data
- Hard-coded numbers in examples that represent current state

## Exception Cases

Some specificity is appropriate when:

- **API Constraints**: "Must be between 1-100 items" (system limits that won't change)
- **User Examples**: Command output showing version numbers (realistic user experience)
- **Time Estimates**: "15 minutes to complete" (user planning guidance)
- **Business Requirements**: "Supports X concurrent users" (product specifications)

The key test: **Will this number change due to code evolution, or is it a stable constraint/example?**

## Conclusion

Maintainable documentation focuses on capabilities and user value rather than internal implementation details. By avoiding maintenance liabilities, we create documentation that stays accurate and helpful over time without constant updates.

Remember: **If a number represents how the code currently works rather than what the system is designed to do, make it generic.**
