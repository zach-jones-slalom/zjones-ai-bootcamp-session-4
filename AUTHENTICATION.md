# Authentication Implementation

## Overview

This implementation adds secure authentication and authorization to the Slalom Capabilities Management System, addressing the security concerns outlined in Issue #16.

## Features Implemented

### 🔐 Authentication
- **JWT-based authentication** - Secure token-based authentication with 8-hour sessions
- **Password hashing** - Bcrypt hashing for secure password storage
- **Session management** - Persistent login with localStorage (tokens stored securely)
- **Login/Logout functionality** - Full user session lifecycle

### 👥 Role-Based Access Control (RBAC)
Two user roles with different permissions:

**Admin Role:**
- Register any consultant for any capability
- Unregister any consultant from any capability
- View audit logs
- Full system access

**Consultant Role:**
- Register themselves for capabilities only
- View all capabilities and consultants
- Cannot unregister anyone (including themselves)

### 📝 Audit Logging
- All authentication events logged (logins)
- All capability changes logged (register/unregister)
- Audit logs include:
  - Timestamp
  - Action performed
  - User who performed the action
  - Details of the action
- Admin-only access to audit logs via `/audit/logs` endpoint

### 🔒 Security Features
- Protected API endpoints - All capability management requires authentication
- JWT token validation on each request
- Proper HTTP status codes (401 Unauthorized, 403 Forbidden)
- Password verification with bcrypt
- Token expiration handling

## Demo Credentials

For testing purposes, the following demo accounts are available:

**Admin Account:**
- Email: alice.smith@slalom.com
- Password: password123
- Can: Register/unregister anyone, view audit logs

**Consultant Accounts:**
- Email: bob.johnson@slalom.com
- Password: password123
- Can: Register themselves only

- Email: emma.davis@slalom.com
- Password: password123
- Can: Register themselves only

## API Changes

### New Endpoints

#### POST /auth/login
Authenticate user and receive JWT token
```json
Request:
{
  "email": "alice.smith@slalom.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "email": "alice.smith@slalom.com",
    "name": "Alice Smith",
    "role": "admin"
  }
}
```

#### GET /auth/me
Get current authenticated user information (requires authentication)

#### GET /audit/logs
Get audit logs (admin only)

### Modified Endpoints

#### POST /capabilities/{capability_name}/register
- Now requires authentication (Bearer token)
- Request body changed to JSON:
```json
{
  "email": "user@slalom.com",
  "capability_name": "Cloud Architecture"
}
```
- Consultants can only register themselves
- Admins can register anyone

#### DELETE /capabilities/{capability_name}/unregister
- Now requires admin authentication
- Request body changed to JSON:
```json
{
  "email": "user@slalom.com",
  "capability_name": "Cloud Architecture"
}
```
- Only admins can unregister consultants

## Technical Implementation

### Backend
- **FastAPI** - Web framework
- **python-jose** - JWT token creation and validation
- **passlib[bcrypt]** - Password hashing
- **python-multipart** - Form data handling
- **Pydantic models** - Request/response validation

### Frontend
- **JWT token storage** - localStorage for persistent sessions
- **Authorization headers** - Bearer token in all authenticated requests
- **Role-based UI** - Different UI elements based on user role
- **Login/Logout flow** - Complete session management

### Security Configuration
```python
SECRET_KEY = "slalom-capabilities-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours
```

**⚠️ IMPORTANT:** In production, the SECRET_KEY must be changed to a secure random value and stored as an environment variable.

## Database Considerations

Currently, users and audit logs are stored in-memory for demonstration purposes. For production deployment, you should:

1. Implement a persistent database (PostgreSQL recommended - see Issue #14)
2. Store users in database with proper schema
3. Store audit logs in database with indexes for querying
4. Implement database migrations
5. Add user registration endpoint for new consultants

## Testing the Implementation

1. **Start the application:**
   ```bash
   uvicorn src.app:app --reload
   ```

2. **Test admin flow:**
   - Login as alice.smith@slalom.com
   - Notice "ADMIN" badge in header
   - Register any consultant for any capability
   - Unregister button (❌) appears next to consultants
   - Access audit logs at `/audit/logs`

3. **Test consultant flow:**
   - Login as bob.johnson@slalom.com
   - Notice "CONSULTANT" badge in header
   - Try to register yourself
   - Cannot see unregister buttons
   - Cannot access audit logs

## Future Enhancements

As noted in Issue #16, additional enhancements could include:

- [ ] OAuth 2.0 / OpenID Connect integration
- [ ] Slalom SSO / Azure AD integration
- [ ] Email verification for new registrations
- [ ] Password reset functionality
- [ ] Multi-factor authentication (MFA)
- [ ] More granular role permissions (Practice Lead role)
- [ ] Consultant self-unregister capability
- [ ] Enhanced audit log querying and filtering
- [ ] Real-time notifications for capability changes

## Security Notes

⚠️ **Production Considerations:**

1. **SECRET_KEY must be changed** and stored securely
2. Use HTTPS in production (never send tokens over HTTP)
3. Implement rate limiting on login endpoint
4. Add CORS configuration for specific origins
5. Implement refresh tokens for better security
6. Add account lockout after failed login attempts
7. Store passwords with proper salting (already using bcrypt)
8. Regular security audits and dependency updates

## What's Not Implemented (From Issue #16)

The following items from Issue #16 were not implemented in this iteration:

- OAuth/SSO integration (requires external identity provider setup)
- Email verification (requires email service)
- Database persistence (Issue #14 addresses this separately)
- UI for self-unregistration
- Advanced audit log filtering

These can be addressed in future iterations as the platform matures.
