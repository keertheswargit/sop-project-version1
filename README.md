# Smart Hostel Portal

A web-based **Smart Hostel Portal** designed to digitize hostel laundry services and store transactions using a centralized digital card system.

The system provides separate interfaces for **students and staff**, allowing students to request laundry services and purchase hostel-store items while enabling staff to verify requests and manage transactions.

## Features

### Student Module

* Student login and authentication
* Digital wallet/balance
* Laundry service selection
* Wash Only, Wash & Dry and Ironing services
* Laundry pricing based on service and quantity
* Automatic laundry token generation
* Hostel store and snacks ordering
* Quantity-based store billing
* Digital transaction history
* Balance deduction after staff verification

### Staff Module

* Staff authentication
* Laundry verification desk
* View pending laundry requests
* Verify and approve laundry requests
* Store counter dashboard
* View pending store orders
* Accept or reject store orders
* Transaction management

### Authentication & Security

* Role-based authentication
* Separate student and staff access
* Password hashing using `bcrypt`
* Environment variables using `dotenv`
* PostgreSQL database integration

## Technology Stack

| Technology | Purpose                         |
| ---------- | ------------------------------- |
| HTML       | Frontend structure              |
| CSS        | User interface and styling      |
| JavaScript | Frontend functionality          |
| Node.js    | Backend runtime                 |
| Express.js | Backend framework               |
| PostgreSQL | Database                        |
| `pg`       | PostgreSQL connectivity         |
| bcrypt     | Password hashing                |
| CORS       | Cross-origin request handling   |
| dotenv     | Environment variable management |

## Project Structure

```text
sop-project-version1/
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── create-users.js
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

## How the System Works

```text
Student / Staff
       │
       ▼
   Login Page
       │
       ▼
 Role Verification
       │
   ┌───┴────┐
   │        │
Student    Staff
   │        │
   ▼        ▼
Laundry    Laundry / Store
& Store    Verification
   │        │
   └───┬────┘
       ▼
   Express Server
       │
       ▼
   PostgreSQL
       │
       ▼
Transactions / User Data
```

## Prerequisites

Before running the project, install:

* Node.js
* npm
* PostgreSQL

## Installation

Clone the repository:

```bash
git clone https://github.com/keertheswargit/sop-project-version1.git
cd sop-project-version1
```

Install the dependencies:

```bash
npm install
```

## Database Configuration

Create a PostgreSQL database named:

```text
smart_hostel
```

Configure the database connection using environment variables.

Create a `.env` file locally:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_hostel
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD
PORT=5000
```

> Never commit your real `.env` file or database credentials to GitHub.

## Database Setup

Make sure PostgreSQL is running and the required database tables are available.

Then run:

```bash
node create-users.js
```

This creates the initial student and staff accounts required for testing.

## Running the Application

Start the server:

```bash
npm start
```

The application runs on:

```text
http://localhost:5000
```

Open the URL in your browser to access the Smart Hostel Portal.

## Demo Accounts

The project includes sample accounts for testing.

### Students

```text
Username: student1
Password: student123
```

```text
Username: student2
Password: student123
```

### Laundry Staff

```text
Username: staff1
Password: staff123
```

### Store Staff

```text
Username: store1
Password: staff123
```

> These credentials are intended only for local/demo testing. Change them before using the application in a real environment.

## API Overview

The backend provides APIs for:

* User authentication
* Student profile information
* Transaction history
* Laundry requests
* Laundry staff verification
* Store orders
* Store staff verification
* Digital balance management

The Express server serves the frontend from the `public/` directory.

## Future Enhancements

* JWT-based authentication
* Password reset functionality
* Admin dashboard
* Hostel-wide user management
* Online payment integration
* Email/SMS notifications
* Improved database schema management
* Deployment using a cloud PostgreSQL service
* Responsive mobile interface
* Automated testing

## Project Objective

The objective of this project is to provide a centralized digital system for managing hostel laundry and store services while reducing manual processing, improving transaction tracking and providing students with a convenient digital payment and service-request interface.

## License

This project is developed for academic purposes.
