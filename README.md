# V2 Backend

A modern TypeScript Express.js backend with comprehensive API endpoints for user management, audience segmentation, insights analytics, and data enrichment.

## 🚀 Features

- **TypeScript** - Full type safety and modern JavaScript features
- **Express.js** - Fast, unopinionated web framework
- **PostgreSQL** - Robust relational database with Drizzle ORM
- **JWT Authentication** - Secure user authentication and authorization
- **Rate Limiting** - Built-in API rate limiting and security
- **AWS S3 Integration** - File upload and storage capabilities
- **Docker Support** - Containerized deployment ready
- **Health Checks** - Built-in health monitoring endpoints

## 📋 API Endpoints

### Authentication
- `POST /users/getTenant` - Get tenant information
- `POST /users/userStatus` - Get user status
- `POST /users/loginJWT` - Login with JWT
- `POST /users/logout` - Logout user
- `POST /users/googleLoginJWT` - Google login
- `GET /session/persist` - Check session persistence

### Settings & User Management
- `POST /settings/getUserSetting` - Get user settings
- `POST /settings/updateUser` - Update user profile
- `POST /settings/inviteUser` - Invite new user
- `POST /settings/updateRole` - Update user role
- `POST /settings/uploadLogo` - Upload organization logo
- `POST /settings/readLogo` - Read organization logo

### Enrich Templates
- `POST /settings/saveEnrichTemplate` - Save enrich template
- `POST /settings/getEnrichTemplateData` - Get template data
- `POST /settings/editEnrichTemplateData` - Edit template data
- `POST /enrichTemplate/deleteTemplate` - Delete template

### Champion Tracking
- `POST /champion/getPicklistValues` - Get Salesforce picklist values

### Audience & Segments
- `POST /audience/fetch-all-segments` - Get all segments
- `POST /segment/save-segment-data` - Save segment data
- `GET /segment/filters` - Get user filters
- `POST /segment/filters` - Save user filter

### Insights & Analytics
- `POST /insights/getPicklistValues` - Get picklist values
- `POST /insightsRoutes/getColumns` - Get columns
- `POST /insightsRoutes/liveTable` - Get live data
- `POST /insightsRoutes/enrichColumns` - Enrich columns

## 🐳 Docker Deployment

### Prerequisites
- Docker and Docker Compose installed
- AWS credentials (for S3 functionality)

### Quick Start with Docker Compose

1. **Clone and navigate to the project:**
   ```bash
   cd v2-backend
   ```

2. **Set up environment variables:**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Check service health:**
   ```bash
   docker-compose ps
   curl http://localhost:3002/health
   ```

5. **View logs:**
   ```bash
   docker-compose logs -f v2-backend
   ```

6. **Stop services:**
   ```bash
   docker-compose down
   ```

### Docker Build Only

If you want to build and run just the application container:

```bash
# Build the image
docker build -t v2-backend:latest .

# Run the container
docker run -d \
  --name v2-backend-app \
  -p 3002:3002 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e DB_USER=your-db-user \
  -e DB_PASSWORD=your-db-password \
  -e AWS_ACCESS_KEY_ID=your-aws-key \
  -e AWS_SECRET_ACCESS_KEY=your-aws-secret \
  v2-backend:latest
```

## 🛠️ Development

### Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Start production server:**
   ```bash
   npm start
   ```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3002` |
| `DB_HOST` | Database host | `localhost` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | `test_wb` |
| `DB_PORT` | Database port | `5432` |
| `JWT_SECRET_KEY` | JWT signing secret | - |
| `AWS_ACCESS_KEY_ID` | AWS access key | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - |
| `AWS_REGION` | AWS region | `us-east-1` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

### Docker Services

The docker-compose setup includes:

- **v2-backend** - Main application (port 3002)
- **postgres** - PostgreSQL database (port 5433)
- **redis** - Redis cache (port 6380)

## 📊 Health Monitoring

- **Health Check Endpoint:** `GET /health`
- **API Documentation:** `GET /api-docs`
- **Docker Health Checks:** Built-in container health monitoring

## 🔒 Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- JWT authentication
- Input validation
- SQL injection prevention with parameterized queries

## 🏗️ Architecture

```
src/
├── controllers/     # Request handlers
├── services/        # Business logic
├── routes/          # API route definitions
├── middleware/      # Custom middleware
├── config/          # Configuration files
├── db/             # Database schemas and connections
├── storage/        # Data access layer
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

## 📝 License

MIT License - see LICENSE file for details.
