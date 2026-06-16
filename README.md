# Backend Ledger System

A secure banking ledger backend built with Node.js, Express, MongoDB, and Mongoose. This system manages authentication, account handling, secure fund transfers, transaction history, and token-based session management using modern backend practices.

## Features

### Authentication & Security
- User Registration & Login
- JWT-based Authentication
- Token Blacklisting for Secure Logout
- Protected Routes with Middleware
- Authorization Checks

### Account Management
- Create Account
- Get All Accounts
- Account Status Validation (ACTIVE/INACTIVE)
- Balance Retrieval

### Transaction System
- Secure Fund Transfer Between Accounts
- Initial System Funding
- Double-entry Ledger System (Debit/Credit)
- Ledger-based Balance Calculation
- Idempotency Support (Prevents Duplicate Transactions)
- Atomic Transactions using MongoDB Sessions
- Transaction Status Tracking (PENDING / COMPLETED / FAILED)

### Notifications
- Email Alerts for Successful Transactions
- Failure Notifications

---

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Nodemailer

---

## Project Structure

```bash
Backend-Ledger/
│── controllers/
│── models/
│── routes/
│── services/
│── middlewares/
│── config/
│── utils/
│── app.js
│── server.js
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout and blacklist token |

### Accounts

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/accounts` | Create account |
| GET | `/api/accounts` | Get all accounts |
| GET | `/api/accounts/:id/balance` | Get account balance |

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/transactions` | Transfer funds |
| POST | `/api/transactions/initial-funds` | Add initial funds |

---

## Security Features

- JWT Authentication
- Token Blacklisting on Logout
- Protected API Routes
- Ownership Validation for Transactions
- Idempotency Protection
- MongoDB ACID Transactions

---

## Transaction Flow

1. Validate request  
2. Verify JWT token  
3. Check token blacklist  
4. Validate idempotency key  
5. Validate account ownership  
6. Check account balance  
7. Create pending transaction  
8. Create debit entry  
9. Create credit entry  
10. Complete transaction  
11. Send notification  

---

## Installation

```bash
git clone <your-repo-url>
npm install
```

Create `.env` file:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
```

Run server:

```bash
npm run dev
```

---

## Core Concepts Used

- JWT Authentication
- Token Blacklisting
- ACID Transactions
- MongoDB Sessions
- Double-entry Accounting
- Idempotency
- Middleware Authorization
- Error Handling

---

## Future Improvements

- Transaction Reversal
- Admin Dashboard
- Transaction Analytics
- Scheduled Payments
- Multi-currency Support

---

## Author

Developed by **Tushar Jain**
