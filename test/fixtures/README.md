# Test Fixtures

This directory will contain test fixtures for different project types:

- `input-projects/` - Sample projects to be converted to templates
- `expected-templates/` - Expected template outputs for validation

## Structure

```
test/fixtures/
├── input-projects/
│   ├── cf-d1-project/          # Sample Cloudflare D1 project
│   ├── cf-turso-project/       # Sample Cloudflare Turso project
│   ├── vite-react-project/     # Sample Vite React project
│   └── generic-node-project/   # Generic Node.js project
└── expected-templates/
    ├── cf-d1-template/         # Expected template output
    ├── cf-turso-template/      # Expected template output
    ├── vite-react-template/    # Expected template output
    └── generic-node-template/  # Expected template output
```

Test fixtures will be created as part of the comprehensive functional test suite implementation.