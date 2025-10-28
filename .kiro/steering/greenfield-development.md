---
inclusion: always
---

# Greenfield Development Principle

## Core Principle: Write Everything as First-Time Implementation

All code, documentation, tests, and specifications must be written as if being created for the very first time. No backward compatibility considerations, migration paths, or historical references unless explicitly required by specification.

## The Problem with Backward Compatibility Mindset

**Resource Waste:**
- Wastes development time on unnecessary compatibility layers
- Consumes tokens and cognitive load on migration concerns
- Creates technical debt from day one
- Complicates clean, modern implementations

**Quality Degradation:**
- Compromises optimal design for legacy concerns
- Introduces unnecessary complexity
- Perpetuates outdated patterns and practices
- Reduces code clarity and maintainability

## Implementation Guidelines

### Code Development
```markdown
❌ AVOID: "Update existing function to support new parameter while maintaining backward compatibility"
✅ WRITE: "Implement function with optimal parameter design"

❌ AVOID: "Add new feature alongside legacy implementation"
✅ WRITE: "Implement feature using best practices"

❌ AVOID: "Migrate from old pattern to new pattern"
✅ WRITE: "Implement using modern pattern"
```

### Documentation
```markdown
❌ AVOID: "This replaces the old method..."
✅ WRITE: "Use this method to accomplish..."

❌ AVOID: "For backward compatibility, the old parameter is still supported"
✅ WRITE: "Use the parameter to configure..."

❌ AVOID: "Previously this worked differently, but now..."
✅ WRITE: "This works by..."
```

### Testing
```markdown
❌ AVOID: "Test both old and new behavior"
✅ WRITE: "Test current behavior comprehensively"

❌ AVOID: "Ensure migration doesn't break existing functionality"
✅ WRITE: "Ensure functionality works correctly"

❌ AVOID: "Maintain backward compatibility in test suite"
✅ WRITE: "Test current implementation thoroughly"
```

### Specifications
```markdown
❌ AVOID: "Phase out old parameter in favor of new one"
✅ WRITE: "Implement parameter with optimal design"

❌ AVOID: "Provide migration path from legacy system"
✅ WRITE: "Implement system with modern architecture"

❌ AVOID: "Support both old and new formats during transition"
✅ WRITE: "Support optimal format design"
```

## Language Patterns

### Prohibited Phrases
- "Maintain backward compatibility"
- "Migration path"
- "Legacy support"
- "Transition period"
- "Phase out"
- "Deprecate"
- "For historical reasons"
- "Previously this was..."
- "The old way was..."
- "To maintain compatibility..."

### Preferred Patterns
- "Implement using..."
- "Design for..."
- "Build with..."
- "Create optimal..."
- "Use modern..."
- "Follow best practices..."
- "Implement clean..."
- "Design from first principles..."

## Exceptions

### When Backward Compatibility IS Required
Only consider backward compatibility when:

1. **Explicitly specified in requirements** - "MUST maintain compatibility with X"
2. **External API contracts** - Published APIs with external consumers
3. **Data format standards** - Industry standard formats that cannot change
4. **Legal/compliance requirements** - Regulatory mandates for compatibility

### How to Handle Required Compatibility
When compatibility is truly required:

1. **Isolate compatibility concerns** - Keep compatibility code separate from core logic
2. **Document the requirement** - Explain why compatibility is necessary
3. **Set expiration dates** - Define when compatibility support ends
4. **Minimize impact** - Don't let compatibility concerns compromise core design

## Benefits of Greenfield Approach

### Development Efficiency
- **Faster implementation** - No time spent on compatibility layers
- **Cleaner code** - Optimal design without legacy constraints
- **Reduced complexity** - Single implementation path
- **Better testing** - Focus on current behavior only

### Quality Improvements
- **Modern patterns** - Use latest best practices
- **Optimal performance** - No legacy performance compromises
- **Clear documentation** - No confusing historical context
- **Maintainable code** - Clean, focused implementations

### Resource Optimization
- **Token efficiency** - No wasted tokens on compatibility discussions
- **Cognitive clarity** - Single mental model to understand
- **Faster onboarding** - New team members learn one way
- **Reduced bugs** - Fewer code paths mean fewer failure modes

## Implementation Strategy

### For New Features
1. **Design optimally** - Use best practices without constraint
2. **Implement cleanly** - Single, focused implementation
3. **Document clearly** - Explain current behavior only
4. **Test thoroughly** - Validate current implementation

### For Existing Code Changes
1. **Rewrite completely** - Don't patch, rebuild optimally
2. **Use modern patterns** - Apply current best practices
3. **Clean documentation** - Remove historical references
4. **Fresh test suite** - Test new implementation comprehensively

### For Specifications
1. **Define optimal solution** - Design from first principles
2. **Avoid migration language** - Focus on end state
3. **Specify clean implementation** - No compatibility requirements
4. **Clear acceptance criteria** - Test optimal behavior

## Quality Assurance

### Code Review Checklist
- [ ] No backward compatibility code unless explicitly required
- [ ] No references to "old way" or "previous implementation"
- [ ] Uses modern patterns and best practices
- [ ] Clean, focused implementation
- [ ] Documentation explains current behavior only

### Documentation Review Checklist
- [ ] No historical context or "previously" language
- [ ] No migration instructions unless required
- [ ] Explains current functionality clearly
- [ ] Uses present tense, active voice
- [ ] Focuses on what the system does now

### Test Review Checklist
- [ ] Tests current behavior comprehensively
- [ ] No tests for deprecated or legacy functionality
- [ ] Uses modern testing patterns
- [ ] Clear, focused test cases
- [ ] No compatibility test scenarios

## Common Anti-Patterns

### Development Anti-Patterns
```javascript
❌ // Support both old and new parameter formats
function processData(input) {
  // Handle legacy format
  if (isLegacyFormat(input)) {
    return processLegacyData(input);
  }
  // Handle new format
  return processModernData(input);
}

✅ // Process data using optimal format
function processData(input) {
  return processModernData(input);
}
```

### Documentation Anti-Patterns
```markdown
❌ "This parameter replaces the deprecated 'features' parameter. For backward compatibility, 'features' is still supported but will be removed in a future version."

✅ "This parameter accepts contextual options that templates can use to customize their behavior."
```

### Testing Anti-Patterns
```javascript
❌ describe('parameter handling', () => {
  it('should support legacy features parameter', () => {
    // Test old behavior
  });
  
  it('should support new options parameter', () => {
    // Test new behavior
  });
});

✅ describe('parameter handling', () => {
  it('should process options parameter correctly', () => {
    // Test current behavior
  });
});
```

## Enforcement

### Automated Checks
- Flag phrases like "backward compatibility", "legacy", "migration"
- Detect multiple code paths for same functionality
- Identify deprecated or transitional code patterns
- Check for historical references in documentation

### Review Guidelines
- Question any compatibility-related code
- Challenge historical context in documentation
- Ensure single, clean implementation paths
- Verify modern patterns are used throughout

### Team Culture
- Default to greenfield thinking
- Question compatibility assumptions
- Prioritize clean, modern implementations
- Celebrate simplicity and clarity

## Conclusion

The greenfield development principle ensures we build optimal, maintainable, and efficient software without the burden of unnecessary backward compatibility. By writing everything as if for the first time, we create cleaner code, clearer documentation, and more focused implementations.

Remember: **Unless explicitly required by specification, always implement the optimal solution without backward compatibility concerns.**