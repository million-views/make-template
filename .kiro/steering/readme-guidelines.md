---
inclusion: always
---

# README Guidelines

## Purpose and Unique Role

README.md serves as the "front door" of any project - it's part marketing, part quick-start guide, and part navigation hub. Unlike Diátaxis documentation types, README has a unique multi-purpose role that requires special treatment.

## Core Principle: The 30-Second Rule

A visitor should understand **what the project does**, **why they should care**, and **how to get started** within 30 seconds of landing on the README.

## README Structure Framework

### 1. Hook Section (Above the fold)
**Purpose**: Capture attention and communicate value immediately

**Essential Elements:**
- **Project name and tagline** - Clear, memorable description
- **Badges** - Build trust (version, downloads, license, build status)
- **Value proposition** - What problem does this solve?
- **Quick visual** - Screenshot, demo GIF, or code example

**Guidelines:**
- Lead with benefits, not features
- Use action-oriented language
- Keep tagline under 10 words
- Show, don't just tell

### 2. Quick Start Section
**Purpose**: Get users to success as fast as possible

**Essential Elements:**
- **Installation** - Single command if possible
- **Basic usage** - Minimal working example
- **Expected result** - What success looks like

**Guidelines:**
- Assume zero prior knowledge
- Test every command/example
- Show realistic, meaningful examples
- Include expected output when helpful

### 3. Navigation Section
**Purpose**: Guide users to appropriate next steps

**Essential Elements:**
- **Learning path** - For beginners
- **Problem-solving path** - For specific tasks
- **Reference path** - For detailed information
- **Understanding path** - For deeper knowledge

**Guidelines:**
- Use clear, descriptive link text
- Organize by user intent, not internal structure
- Provide context for each link
- Use visual cues (emojis, formatting) for scannability

### 4. Social Proof Section
**Purpose**: Build credibility and encourage adoption

**Essential Elements:**
- **Key features** - What makes this special
- **Requirements** - System dependencies
- **Community links** - Issues, discussions, contributions

**Guidelines:**
- Focus on user benefits, not technical features
- Keep requirements simple and clear
- Make contribution pathways obvious
- Use social proof (stars, downloads, testimonials)

## Content Guidelines for CLI Tools

### CLI Tool README Template
```markdown
# Tool Name
Brief description of what it does and why it's useful

## Quick Start
```bash
# Installation
npm install -g tool-name

# Basic usage
tool-name create my-project

# Expected result
✅ Project created successfully!
```

## Key Features
- ✅ Feature that solves user problem
- ✅ Another compelling capability
- ✅ Third major benefit

## Options
- `--dry-run` - Preview changes without executing
- `--yes` - Skip confirmation prompts
- `--help` - Show usage information

## Next Steps
- 📚 [Getting Started Guide](docs/getting-started.md) - Your first project
- 🛠️ [Advanced Usage](docs/advanced-usage.md) - Power user features
- 📖 [CLI Reference](docs/cli-reference.md) - All commands and options
```



## Writing Guidelines

### Tone and Voice
- **Confident but not arrogant** - "This tool helps you..." not "This is the best..."
- **User-focused** - Emphasize benefits, not technical implementation
- **Action-oriented** - Use verbs and active voice
- **Accessible** - Avoid jargon, explain when necessary

### Language Patterns

**Value Propositions:**
```markdown
✅ GOOD: "Create production-ready projects in seconds"
❌ BAD: "A scaffolding tool with advanced templating capabilities"

✅ GOOD: "Zero dependencies. Maximum security."
❌ BAD: "Built with security-first architecture using modern patterns"
```

**Feature Descriptions:**
```markdown
✅ GOOD: "✅ **Git-native** - Any repository can host multiple templates"
❌ BAD: "✅ **Git Integration** - Uses git for template storage"

✅ GOOD: "🚀 **Lightning fast** - Cached templates load instantly"
❌ BAD: "🚀 **Performance** - Implements caching for speed"
```

**Call-to-Actions:**
```markdown
✅ GOOD: "Get started in 30 seconds:"
❌ BAD: "Installation instructions:"

✅ GOOD: "Try it now with your first project:"
❌ BAD: "Usage example:"
```

## Visual Design Principles

### Scannable Structure
- Use **bold** for key concepts
- Use `code formatting` for commands and filenames
- Use emojis sparingly but consistently for visual cues
- Break up text with headers, lists, and code blocks

### Information Hierarchy
1. **Most important** - Project name, value prop, quick start
2. **Important** - Key features, navigation links
3. **Supporting** - Requirements, community links, detailed examples

### Code Examples
- Always test code examples
- Show realistic, meaningful examples
- Include expected output when helpful
- Keep examples minimal but complete

## Common Anti-Patterns

### Content Issues
- ❌ **Feature laundry list** - Long list of technical capabilities
- ❌ **Implementation details** - How it's built vs. what it does
- ❌ **Assumption of knowledge** - Skipping context for newcomers
- ❌ **Outdated examples** - Code that doesn't work anymore

### Structure Issues
- ❌ **Buried value proposition** - Important info below the fold
- ❌ **Missing quick start** - No fast path to success
- ❌ **Poor navigation** - No clear next steps
- ❌ **Wall of text** - No visual breaks or hierarchy

### Tone Issues
- ❌ **Overly technical** - Jargon without explanation
- ❌ **Underselling** - Not confident about value
- ❌ **Overselling** - Unrealistic claims
- ❌ **Developer-centric** - Focused on implementation, not user value

## Maintenance Guidelines

### Regular Updates
- **Keep examples current** - Test all code examples regularly
- **Update badges** - Ensure version numbers and links work
- **Refresh screenshots** - Keep visuals current with UI changes
- **Validate links** - Check that all documentation links work

### Version Considerations
- **Avoid specific version numbers** in examples (use "latest" patterns)
- **Update requirements** when dependencies change
- **Keep examples current** with latest version
- **Archive old examples** rather than leaving broken ones

### Analytics and Feedback
- **Monitor bounce rates** - Are people leaving quickly?
- **Track conversion** - Do people follow the quick start?
- **Gather feedback** - Ask users what's confusing
- **A/B test changes** - Measure impact of improvements

## Quality Checklist

Before publishing README updates:

- [ ] **30-second test** - Can a newcomer understand the value quickly?
- [ ] **Quick start works** - Every command/example tested and functional
- [ ] **Links validated** - All internal and external links work
- [ ] **Mobile friendly** - Readable on mobile devices
- [ ] **Accessible** - Clear headings, alt text for images
- [ ] **Consistent tone** - Matches project's voice and brand
- [ ] **Up-to-date** - Examples work with current version
- [ ] **Scannable** - Good visual hierarchy and formatting

## Success Metrics

A good README should achieve:
- **High engagement** - Users click through to documentation
- **Low bounce rate** - People don't leave immediately
- **Successful onboarding** - Users complete quick start successfully
- **Clear navigation** - Users find appropriate next steps
- **Community growth** - Increased stars, forks, contributions

## Conclusion

README.md is your project's most important marketing and onboarding document. It should serve as an effective "front door" that welcomes newcomers, demonstrates value quickly, and guides users to appropriate next steps.

Remember: **Your README is often the first and only chance to make a good impression. Make it count.**