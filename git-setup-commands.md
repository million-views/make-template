# Git Setup Commands

## After installing Git, run these commands in order:

### 1. Initialize the repository and set up remote
```bash
git init
git remote add origin git@github.com:million-views/make-template.git
```

### 2. Configure git user (if not already configured globally)
```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

### 3. Create .gitignore file
```bash
# Add common Node.js ignores
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo "*.log" >> .gitignore
echo ".DS_Store" >> .gitignore
echo "dist/" >> .gitignore
echo "build/" >> .gitignore
echo "coverage/" >> .gitignore
```

### 4. Add all files and commit
```bash
git add .
git commit -m "feat: complete make-template CLI implementation

- Implement comprehensive CLI tool for converting Node.js projects to templates
- Add support for multiple project types (cf-d1, cf-turso, vite-react, generic)
- Include smart placeholder detection and replacement
- Add safety features with dry-run mode and validation
- Generate _setup.mjs and template.json for create-scaffold compatibility
- Include comprehensive test suite with unit, integration, and functional tests
- Configure package for npm distribution with proper ESM setup
- Add detailed README with usage examples and documentation"
```

### 5. Push to GitHub
```bash
git branch -M main
git push -u origin main
```

## Alternative: HTTPS instead of SSH
If you don't have SSH keys set up, use HTTPS:
```bash
git remote set-url origin https://github.com/million-views/make-template.git
```