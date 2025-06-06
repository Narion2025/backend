# Cookie Guardian Backend

This service crawls a website, classifies cookies and scripts and stores results in MongoDB.

## Setup
1. `cp .env.example .env` and fill in MongoDB connection info
2. `npm install` (or `pnpm i`)
3. `npm run dev` starts the API on http://localhost:4000/v1

### REST endpoints
- `POST /v1/evaluations/scan` with `{ "domain": "example.com" }` crawls and stores a result
- `GET /v1/evaluations/:domain` returns the latest evaluation

### Batch scanning
Run `npm run scan -- domain1.com domain2.com` to process multiple domains from the command line.
