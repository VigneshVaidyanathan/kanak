# Kanak App API Documentation

## Overview

This document describes the REST API endpoints for the Kanak application.

## Base URL

```
https://api.kanak.app/v1
```

## Authentication

All API requests (except for authentication endpoints) require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Authentication Endpoints

### POST /auth/login

Login with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### POST /auth/register

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### POST /auth/refresh

Refresh an existing JWT token.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "token": "new_jwt_token_here"
}
```

## User Endpoints

### GET /users/profile

Get the current user's profile information.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2023-01-01T00:00:00Z"
}
```

### PUT /users/profile

Update the current user's profile information.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John Doe",
  "updatedAt": "2023-01-01T00:00:00Z"
}
```

## Transaction Endpoints

### GET /transactions

Get all transactions for the authenticated user.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of transactions per page (default: 50)
- `category` (optional): Filter by category
- `startDate` (optional): Filter transactions from this date
- `endDate` (optional): Filter transactions to this date

**Response:**

```json
{
  "transactions": [
    {
      "id": "transaction_id",
      "amount": 25.5,
      "description": "Coffee",
      "category": "Food",
      "date": "2023-01-01T00:00:00Z",
      "createdAt": "2023-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

### POST /transactions

Create a new transaction.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "amount": 25.5,
  "description": "Coffee",
  "category": "Food",
  "date": "2023-01-01T00:00:00Z"
}
```

**Response:**

```json
{
  "id": "transaction_id",
  "amount": 25.5,
  "description": "Coffee",
  "category": "Food",
  "date": "2023-01-01T00:00:00Z",
  "createdAt": "2023-01-01T00:00:00Z"
}
```

### PUT /transactions/:id

Update an existing transaction.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "amount": 25.5,
  "description": "Coffee",
  "category": "Food"
}
```

**Response:**

```json
{
  "id": "transaction_id",
  "amount": 25.5,
  "description": "Coffee",
  "category": "Food",
  "date": "2023-01-01T00:00:00Z",
  "updatedAt": "2023-01-01T00:00:00Z"
}
```

### DELETE /transactions/:id

Delete a transaction.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "message": "Transaction deleted successfully"
}
```

## Category Endpoints

### GET /categories

Get all available categories.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "categories": [
    {
      "id": "category_id",
      "name": "Food",
      "color": "#FF6B6B",
      "icon": "utensils"
    }
  ]
}
```

### POST /categories

Create a new category.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "name": "Food",
  "color": "#FF6B6B",
  "icon": "utensils"
}
```

**Response:**

```json
{
  "id": "category_id",
  "name": "Food",
  "color": "#FF6B6B",
  "icon": "utensils",
  "createdAt": "2023-01-01T00:00:00Z"
}
```

## Budget Endpoints

### GET /budgets

Get all budgets for the authenticated user.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "budgets": [
    {
      "id": "budget_id",
      "name": "Monthly Food Budget",
      "amount": 500.0,
      "spent": 125.5,
      "remaining": 374.5,
      "period": "monthly",
      "categoryId": "category_id",
      "createdAt": "2023-01-01T00:00:00Z"
    }
  ]
}
```

### POST /budgets

Create a new budget.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "name": "Monthly Food Budget",
  "amount": 500.0,
  "period": "monthly",
  "categoryId": "category_id"
}
```

**Response:**

```json
{
  "id": "budget_id",
  "name": "Monthly Food Budget",
  "amount": 500.0,
  "spent": 0.0,
  "remaining": 500.0,
  "period": "monthly",
  "categoryId": "category_id",
  "createdAt": "2023-01-01T00:00:00Z"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "error": "Invalid request data",
  "details": "Email is required"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Access denied"
}
```

### 404 Not Found

```json
{
  "error": "Not found",
  "message": "Transaction not found"
}
```

### 429 Too Many Requests

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "Something went wrong"
}
```

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **Transaction endpoints**: 100 requests per minute
- **Other endpoints**: 60 requests per minute

Rate limit headers are included in all responses:

- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit window resets (Unix timestamp)

## Data Types

### Transaction

```typescript
interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO 8601 date
  createdAt: string; // ISO 8601 datetime
  updatedAt?: string; // ISO 8601 datetime
}
```

### User

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string; // ISO 8601 datetime
  updatedAt?: string; // ISO 8601 datetime
}
```

### Category

```typescript
interface Category {
  id: string;
  name: string;
  color: string; // Hex color code
  icon: string; // Icon name
  createdAt: string; // ISO 8601 datetime
}
```

### Budget

```typescript
interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  remaining: number;
  period: 'weekly' | 'monthly' | 'yearly';
  categoryId: string;
  createdAt: string; // ISO 8601 datetime
}
```
