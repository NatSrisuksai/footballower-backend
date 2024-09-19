import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import cors from "cors";
import pg from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import helmet from "helmet";
import { body, validationResult } from "express-validator";
import session from "express-session";
import fetchAndMergeData from "./public/fetchMergeData.js"
import basicTeamInfo from "./public/basicTeamInfo.js"
import scrapeData from "./public/scrapeData.js"

dotenv.config();
const app = express();
const port = 3000;

var cookies;

// Set up session middleware
app.use(
  session({
    secret: process.env.COOKIE_SECRET_KEY, 
    resave: true, // Prevents session from being saved again if unmodified
    saveUninitialized: true, // Saves uninitialized sessions 
    cookie: {
      secure: true, // Set true if using HTTPS
      maxAge: 1000 * 60 * 60, // 1 hour session duration
    },
  })
);


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  cors({
    origin: "https://footballower-web-application.vercel.app", 
    credentials: true, // Allow sending cookies or authentication headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'] // Allowed headers
  })
);
app.options('*', cors()); // Preflight requests for all routes


app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://footballower-web-application.vercel.app');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});



app.use(helmet());
const { Pool } = pg;
const db = new Pool({
  connectionString: process.env.POSTGRES_URL,
})

db.connect();

const url = "https://www.premierleague.com/tables"; // URL of Premier League standings page



app.get("/", cors(), async (req, res) => {
  try {
    const mergedData = await fetchAndMergeData();
    console.log(cookies);
    res.json(mergedData);
  } catch (error) {
    res.status(500).send("Error fetching data");
  }
});

app.get("/getFav", cors(), async (req, res) => {
  try {
    const userID = cookies.id;
    const query =
      "SELECT f.team FROM userdata u JOIN favouritetable f ON u.id = f.user_id WHERE u.id =$1";
    const result = await db.query(query, [userID]);
    const favTeam = result.rows;

    res.json(favTeam);
  } catch (error) {
    res.status(500).send("Error fetching data");
  }
});

// API route to get the latest match data
app.get("/latestMatch", cors(), async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).send("URL is required");
  }

  try {
    const matches = await scrapeData(url);
    res.json(matches);
  } catch (error) {
    res.status(500).send("Error fetching match data");
  }
});

// Register API
app.post(
  "/register",
  [
    body("username").isLength({ min: 3 }),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
  ],
  async (req, res) => {
    const { username, email, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const checkUsernameQuery = "SELECT * FROM userdata WHERE username = $1";
      const usernameResult = await db.query(checkUsernameQuery, [username]);

      if (usernameResult.rows.length > 0) {
        return res.status(400).json({ message: "Username already exists." });
      }

      const checkEmailQuery = "SELECT * FROM userdata WHERE email = $1";
      const emailResult = await db.query(checkEmailQuery, [email]);

      if (emailResult.rows.length > 0) {
        return res.status(400).json({ message: "Email already exists." });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const insertQuery =
        "INSERT INTO userdata (username, email, password) VALUES ($1, $2, $3)";
      await db.query(insertQuery, [username, email, hashedPassword]);

      const queryForCookie = "SELECT * FROM userdata WHERE username = $1";
      const resultForCooke = await db.query(queryForCookie, [username]);
      const user = resultForCooke.rows[0];
      // Save user info in the session
      req.session.user = {
        id: user.id,
        username: user.username,
      };
      cookies = req.session.user;
      res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
      console.error("Error inserting data:", error);
      res.status(500).json({ message: "An error occurred while registering." });
    }
  }
);

// Login API with session support
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const query = "SELECT * FROM userdata WHERE username = $1";
    const result = await db.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Username not found." });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    // Save user info in the session
    req.session.user = {
      id: user.id,
      username: user.username,
    };
    cookies = req.session.user;
    res.status(200).json({ message: "Login successful!" });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "An error occurred during login." });
  }
});

// Logout API to destroy the session
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to log out" });
    }
    res.clearCookie("connect.sid"); // Clear session cookie
    res.status(200).json({ message: "Logged out successfully" });
    cookies = null;
    console.log("Destroy Cookies");
  });
});

app.post("/addFavorite", async (req, res) => {
  const userId = cookies.id;
  const teamName = req.body.teamName;

  if (!userId || !teamName) {
    return res
      .status(400)
      .json({ message: "User ID and team name are required." });
  }

  try {
    const query = "INSERT INTO favouritetable (user_id, team) VALUES ($1, $2)";
    await db.query(query, [userId, teamName]);
    res.status(201).json({ message: "Favorite team added successfully!" });
  } catch (error) {
    console.error("Error adding favorite team:", error);
    res
      .status(500)
      .json({ message: "An error occurred while adding the favorite team." });
  }
});

app.delete("/deleteFavorite", async (req, res) => {
  const userId = cookies.id;
  const teamName = req.body.teamName;

  if (!userId || !teamName) {
    return res
      .status(400)
      .json({ message: "User ID and team name are required." });
  }

  try {
    const query = "DELETE FROM favouritetable WHERE user_id = $1 AND team = $2";
    const result = await db.query(query, [userId, teamName]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Favorite team not found." });
    }

    res.status(200).json({ message: "Favorite team removed successfully!" });
  } catch (error) {
    console.error("Error deleting favorite team:", error);
    res
      .status(500)
      .json({ message: "An error occurred while deleting the favorite team." });
  }
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
