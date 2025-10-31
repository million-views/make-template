---
inclusion: always
---

# Diátaxis Documentation Framework

## Overview

The Diátaxis framework organizes documentation into four distinct types based on user needs and context. This systematic approach ensures comprehensive, user-focused documentation that serves different purposes effectively.

## The Four Documentation Types

### 1. Tutorials (Learning-Oriented)

**Purpose**: Guide beginners through hands-on learning experiences  
**User Need**: "I want to learn by doing"  
**Structure**: Step-by-step lessons with guaranteed outcomes

**Characteristics:**

- **Learning-oriented**: Focus on education, not problem-solving
- **Hands-on**: Users build something concrete
- **Beginner-friendly**: Assume no prior knowledge
- **Success-guaranteed**: Every step should work reliably
- **Encouraging tone**: Supportive, patient, confidence-building

**Content Guidelines:**

- Start with clear learning objectives
- Provide step-by-step instructions
- Include expected results for each step
- Use encouraging language ("You'll learn...", "Let's create...")
- End with sense of accomplishment and next steps

**Avoid in Tutorials:**

- Complex explanations (save for Explanation docs)
- Multiple options or alternatives
- Troubleshooting sections (handle in How-to Guides)
- Assumptions about user knowledge

### 2. How-to Guides (Problem-Oriented)

**Purpose**: Solve specific problems with practical solutions  
**User Need**: "I have a problem and need to solve it"  
**Structure**: Goal-oriented instructions for specific tasks

**Characteristics:**

- **Problem-oriented**: Address specific user goals
- **Task-focused**: Clear objective with concrete outcome
- **Practical**: Assume basic familiarity with the system
- **Efficient**: Get to the solution quickly
- **Direct tone**: Clear, concise, action-oriented

**Content Guidelines:**

- Start with clear problem statement
- Provide direct, actionable steps
- Include prerequisites and assumptions
- Use imperative language ("Configure...", "Set up...")
- Focus on one problem per guide

**Avoid in How-to Guides:**

- Teaching concepts (save for Tutorials)
- Comprehensive explanations (save for Explanation docs)
- Complete parameter lists (save for Reference docs)

### 3. Reference (Information-Oriented)

**Purpose**: Provide comprehensive, accurate technical information  
**User Need**: "I need to look up specific information"  
**Structure**: Systematic, complete coverage of technical details

**Characteristics:**

- **Information-oriented**: Comprehensive technical details
- **Systematic**: Complete, consistent coverage
- **Accurate**: Precise, up-to-date information
- **Searchable**: Well-organized for quick lookup
- **Neutral tone**: Objective, factual, comprehensive

**Content Guidelines:**

- Organize information systematically
- Provide complete parameter lists and options
- Include all possible values and constraints
- Use consistent formatting and structure
- Keep descriptions factual and precise

**Avoid in Reference:**

- Step-by-step instructions (save for How-to Guides)
- Learning exercises (save for Tutorials)
- Design rationale (save for Explanation docs)

### 4. Explanation (Understanding-Oriented)

**Purpose**: Provide context, background, and design rationale  
**User Need**: "I want to understand how and why this works"  
**Structure**: Conceptual discussion with context and reasoning

**Characteristics:**

- **Understanding-oriented**: Focus on comprehension
- **Contextual**: Provide background and rationale
- **Exploratory**: Discuss alternatives and trade-offs
- **Thoughtful**: Consider broader implications
- **Reflective tone**: Analytical, thoughtful, exploratory

**Content Guidelines:**

- Explain the reasoning behind design decisions
- Provide context and alternatives considered
- Discuss trade-offs and implications
- Connect concepts to broader principles
- Use exploratory language ("The reason we chose...", "This approach...")

**Avoid in Explanation:**

- Step-by-step instructions (save for How-to Guides)
- Complete technical specifications (save for Reference docs)
- Beginner learning exercises (save for Tutorials)

## Content Organization Strategy

### Directory Structure

```
docs/
├── tutorial/           # Learning-oriented content
├── guides/            # Task-oriented content (how-to)
├── reference/         # Information-oriented content
├── explanation/       # Understanding-oriented content
└── _templates/        # Documentation templates and guidelines
```

### Special Cases

**README.md** - Does not fit the Diátaxis framework as it serves a unique multi-purpose role as project "front door" (marketing + quick-start + navigation). See separate README guidelines for specific guidance.

### Cross-Referencing Between Types

**From Tutorials:**

- Link to How-to Guides for advanced tasks
- Link to Reference for complete parameter details
- Link to Explanation for deeper understanding

**From How-to Guides:**

- Link to Tutorials for beginners
- Link to Reference for complete options
- Link to Explanation for background context

**From Reference:**

- Link to How-to Guides for practical examples
- Link to Tutorials for hands-on introduction
- Link to Explanation for design rationale

**From Explanation:**

- Link to Tutorials for hands-on experience
- Link to How-to Guides for practical application
- Link to Reference for implementation details

## Writing Guidelines by Type

### Tone and Voice

| Type         | Tone                    | Voice                                  | Focus                  |
| ------------ | ----------------------- | -------------------------------------- | ---------------------- |
| Tutorial     | Encouraging, supportive | "You will learn...", "Let's create..." | Building confidence    |
| How-to Guide | Direct, efficient       | "To accomplish X, do Y"                | Solving problems       |
| Reference    | Precise, neutral        | "Parameter X accepts..."               | Providing information  |
| Explanation  | Thoughtful, exploratory | "The reason we chose..."               | Understanding concepts |

### Content Structure

**Tutorial Structure:**

1. What you'll learn/build
2. Prerequisites
3. Step-by-step instructions with expected results
4. What you accomplished
5. Next steps

**How-to Guide Structure:**

1. Problem/goal statement
2. Prerequisites
3. Step-by-step solution
4. Verification steps
5. Related information

**Reference Structure:**

1. Overview
2. Systematic coverage of all options/parameters
3. Examples for each major feature
4. Related references

**Explanation Structure:**

1. Introduction to concept
2. Context and background
3. Design decisions and rationale
4. Trade-offs and alternatives
5. Implications and connections

## Quality Assurance

### Content Type Validation

**Ask these questions for each document:**

**For Tutorials:**

- Does this teach through hands-on experience?
- Can a beginner follow this successfully?
- Does each step have a clear, expected result?
- Is the tone encouraging and supportive?

**For How-to Guides:**

- Does this solve a specific problem?
- Are the steps direct and actionable?
- Does it assume appropriate background knowledge?
- Is it focused on one clear objective?

**For Reference:**

- Is the information complete and systematic?
- Are all parameters/options documented?
- Is it organized for easy lookup?
- Is the information accurate and current?

**For Explanation:**

- Does this provide context and understanding?
- Are design decisions explained with rationale?
- Does it connect to broader concepts?
- Is it thoughtful and exploratory?

### Common Anti-Patterns

**Mixed Purposes:**

- ❌ Tutorial that explains design decisions (save for Explanation)
- ❌ Reference that includes step-by-step instructions (save for How-to)
- ❌ How-to Guide that teaches concepts (save for Tutorial)
- ❌ Explanation that lists all parameters (save for Reference)

**Wrong Audience:**

- ❌ Tutorial that assumes expert knowledge
- ❌ How-to Guide for absolute beginners
- ❌ Reference with learning exercises
- ❌ Explanation with step-by-step instructions

## Implementation Guidelines

### For New Documentation

1. **Identify the primary user need** - What is the user trying to accomplish?
2. **Choose the appropriate type** - Learning, problem-solving, lookup, or understanding?
3. **Follow the type-specific guidelines** - Structure, tone, and content approach
4. **Cross-reference appropriately** - Link to related content in other types

### For Existing Documentation

1. **Audit current content** - What type is each document trying to be?
2. **Identify mixed purposes** - Does content serve multiple types poorly?
3. **Split or refocus** - Separate mixed content into appropriate types
4. **Improve cross-references** - Connect related content across types

### Content Organization Strategy

**When organizing documentation:**

1. Identify the primary purpose of each section
2. Create tutorial content as step-by-step lessons
3. Organize problem-solving content as how-to guides
4. Structure technical details as reference docs
5. Present design rationale as explanation docs

## Benefits of Diátaxis

### For Users

- **Clear expectations** - Users know what type of help they're getting
- **Appropriate depth** - Content matches user's current need
- **Better discoverability** - Organized by user intent, not internal structure
- **Reduced cognitive load** - No need to filter irrelevant information

### For Documentation Teams

- **Clear writing guidelines** - Each type has specific rules and patterns
- **Reduced duplication** - Clear boundaries prevent content overlap
- **Easier maintenance** - Updates go to the appropriate type
- **Quality assurance** - Clear criteria for evaluating content

### For Projects

- **Comprehensive coverage** - Framework ensures all user needs are addressed
- **Consistent experience** - Users develop familiarity with documentation patterns
- **Scalable organization** - Structure works for small and large documentation sets
- **Professional appearance** - Systematic approach creates polished documentation

## Conclusion

The Diátaxis framework provides a systematic approach to documentation that serves users effectively by matching content to their specific needs and context. By following these guidelines, documentation becomes more useful, maintainable, and professional.

Remember: **The key is to serve the user's immediate need without mixing purposes or audiences within a single document.**
