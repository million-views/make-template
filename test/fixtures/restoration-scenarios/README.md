# Restoration Test Fixtures

This directory contains test scenarios for the template restoration feature. Each scenario includes:

- Original project state (before template conversion)
- Template state (after conversion with make-template)
- Undo log files for restoration testing
- Expected restoration results

## Scenario Types

### Round-Trip Testing
- `basic-round-trip/` - Simple project for basic conversion → restoration cycles
- `complex-round-trip/` - Complex project with multiple file types and configurations

### Sanitization Testing
- `sanitized-undo-log/` - Undo logs with sanitized sensitive information
- `partial-sanitization/` - Mixed sanitized and non-sanitized data

### Error Scenarios
- `corrupted-undo-log/` - Various corruption scenarios for error handling tests
- `missing-values/` - Undo logs with missing restoration values
- `version-mismatch/` - Undo logs from different make-template versions

## Usage

These fixtures are used by:
- `test/functional/restoration-workflow.test.js` - End-to-end restoration testing
- `test/integration/restoration-integrity.test.js` - Cross-project restoration validation
- Unit tests for individual restoration components

Each scenario directory contains a `scenario.json` file describing the test case and expected outcomes.