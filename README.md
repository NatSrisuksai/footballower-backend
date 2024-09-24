
# 📝 Footballower (Back End)
This is back end for Footballower Web Application [Footballower](https://github.com/NatSrisuksai/Footballower-Web-Application) .The backend provides user authentication, session management, and a system to manage favorite teams. It serves as the core API for the Footballower frontend.




## Tech Stack

- Node.JS
- Express.js
- PostgreSQL
- bcrypt (for password hashing)
- cors (CORS Management)

## Prerequisites

- Node.JS
- PostgreSQL
## Installation

Install my-project with npm


- Clone the repository:
```bash
git clone https://github.com/NatSrisuksai/footballower-backend.git
```

- Navigate to the project directory:
```bash
cd footballower-backend
```

- Install dependencies:
```bash
npm install
```

- Create a .env file in the root directory and add the following variables:

```env
COOKIE_SECRET_KEY=KEY_FOR_HASH_COOKIE
POSTGRES_URL=ONLINE_POSTGRES_URL
```

- Run the server:
```bash
npm start
```
## Features

- **User Registration**: Users can sign up with a unique username and password
- **User Login**: Secure login by applying session method and hashing password by using bcrypt
- **Favorite Teams**: Users can add or remove their favorite teams.
- **User Profile**: Retrieve and update user information.
- **Search Teams**: Search for teams in the Premier League.

