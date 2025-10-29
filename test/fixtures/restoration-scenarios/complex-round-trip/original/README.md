# complex-test-app

A complex application for comprehensive restoration testing.

## Features

- Express.js server with CORS support
- Environment-based configuration
- Database integration with PostgreSQL
- Redis caching support
- Email service integration

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your configuration

4. Start development server:
   ```bash
   npm run dev
   ```

## API Endpoints

- `GET /` - Application info
- `GET /api/health` - Health check

## Author

Created by Jane Smith (jane.smith@company.com)

## License

MIT