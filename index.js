import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import cors from "cors";
import * as cheerio from "cheerio";
import pg from "pg";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import helmet from "helmet";
import { body, validationResult } from "express-validator";
import session from "express-session";

dotenv.config();
const app = express();
const port = 3000;

var cookies;

// Set up session middleware
app.use(
  session({
    secret: process.env.COOKIE_SECRET_KEY, 
    resave: false, 
    saveUninitialized: true, 
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
    origin: "https://footballower.vercel.app", // eact app's URL
    credentials: true, // Allow cookies to be sent
  })
);
app.use(helmet());

const db = new pg.Pool({
  connectionString: process.env.POSTGRES_URL,
});

db.connect();

const url = "https://www.premierleague.com/tables"; // URL of Premier League standings page

const basicTeamInfo = [
  {
    name: "Manchester City FC",
    url: "https://www.fctables.com/teams/manchester-city-189570/",
    coach: "Pep Guardiola",
    ongoingTournament: ["Premier League", "UEFA Champions League"],
    teamID: 65,
    crest: "https://crests.football-data.org/65.png",
  },
  {
    name: "Liverpool FC",
    url: "https://www.fctables.com/teams/liverpool-189071/",
    coach: "Arne Slot",
    ongoingTournament: ["Premier League", "UEFA Champions League"],
    teamID: 64,
    crest: "https://crests.football-data.org/64.png",
  },
  {
    name: "Arsenal FC",
    url: "https://www.fctables.com/teams/arsenal-180231/",
    coach: "Mikel Arteta",
    ongoingTournament: ["Premier League", "UEFA Champions League"],
    teamID: 57,
    crest: "https://crests.football-data.org/57.png",
  },
  {
    name: "Chelsea FC",
    url: "https://www.fctables.com/teams/chelsea-182666/",
    coach: "Mauricio Pochettino",
    ongoingTournament: ["Premier League", "UEFA Europa Conference League"],
    teamID: 61,
    crest: "https://crests.football-data.org/61.png",
  },
  {
    name: "Manchester United FC",
    url: "https://www.fctables.com/teams/manchester-united-189577/",
    coach: "Erik ten Hag",
    ongoingTournament: ["Premier League", "UEFA Europa League"],
    teamID: 66,
    crest: "https://crests.football-data.org/66.png",
  },
  {
    name: "Tottenham Hotspur FC",
    url: "https://www.fctables.com/teams/tottenham-195775/",
    coach: "Angelos Postecoglou",
    ongoingTournament: ["Premier League", "UEFA Europa League"],
    teamID: 73,
    crest: "https://crests.football-data.org/73.png",
  },
  {
    name: "West Ham United FC",
    url: "https://www.fctables.com/teams/west-ham-197305/",
    coach: "David Moyes",
    ongoingTournament: ["Premier League"],
    teamID: 563,
    crest: "https://crests.football-data.org/563.png",
  },
  {
    name: "Everton FC",
    url: "https://www.fctables.com/teams/everton-184479/",
    coach: "Sean Dyche",
    ongoingTournament: ["Premier League"],
    teamID: 62,
    crest: "https://crests.football-data.org/62.png",
  },
  {
    name: "Leicester City FC",
    url: "https://www.fctables.com/teams/leicester-188852/",
    coach: "Steve Cooper",
    ongoingTournament: ["Premier League"],
    teamID: 338,
    crest: "https://crests.football-data.org/338.png",
  },
  {
    name: "Aston Villa FC",
    url: "https://www.fctables.com/teams/aston-villa-180502/",
    coach: "Unai Emery",
    ongoingTournament: ["Premier League", "UEFA Champions League"],
    teamID: 58,
    crest: "https://crests.football-data.org/58.png",
  },
  {
    name: "Brighton and Hove Albion FC",
    url: "https://www.fctables.com/teams/brighton-181730/",
    coach: "Roberto De Zerbi",
    ongoingTournament: ["Premier League"],
    teamID: 397,
    crest: "https://crests.football-data.org/397.png",
  },
  {
    name: "Newcastle United FC",
    url: "https://www.fctables.com/teams/newcastle-united-190686/",
    coach: "Eddie Howe",
    ongoingTournament: ["Premier League"],
    teamID: 67,
    crest: "https://crests.football-data.org/67.png",
  },
  {
    name: "Wolverhampton Wanderers FC",
    url: "https://www.fctables.com/teams/wolverhampton-197476/",
    coach: "Gary O'Neil",
    ongoingTournament: ["Premier League"],
    teamID: 76,
    crest: "https://crests.football-data.org/76.png",
  },
  {
    name: "Nottingham Forest FC",
    url: "https://www.fctables.com/teams/nottingham-forest-190924/",
    coach: "Steve Cooper",
    ongoingTournament: ["Premier League"],
    teamID: 351,
    crest: "https://crests.football-data.org/351.png",
  },
  {
    name: "Ipswich Town FC",
    url: "https://www.fctables.com/teams/ipswich-187495/",
    coach: "Kieran McKenna",
    ongoingTournament: ["Premier League"],
    teamID: 349,
    crest: "https://crests.football-data.org/349.png",
  },
  {
    name: "Southampton FC",
    url: "https://www.fctables.com/teams/southampton-194444/",
    coach: "Russell Martin",
    ongoingTournament: ["Premier League"],
    teamID: 340,
    crest: "https://crests.football-data.org/340.png",
  },
  {
    name: "Brentford FC",
    url: "https://www.fctables.com/teams/brentford-181700/",
    coach: "Thomas Frank",
    ongoingTournament: ["Premier League"],
    teamID: 402,
    crest: "https://crests.football-data.org/402.png",
  },
  {
    name: "Bournemouth FC",
    url: "https://www.fctables.com/teams/bournemouth-179321/",
    coach: "Andoni Iraola",
    ongoingTournament: ["Premier League"],
    teamID: 1044,
    crest: "https://crests.football-data.org/bournemouth.png",
  },
  {
    name: "Fulham FC",
    url: "https://www.fctables.com/teams/fulham-185904/",
    coach: "Marco Silva",
    ongoingTournament: ["Premier League"],
    teamID: 63,
    crest: "https://crests.football-data.org/63.png",
  },
  {
    name: "Crystal Palace FC",
    url: "https://www.fctables.com/teams/crystal-palace-183166/",
    coach: "Roy Hodgson",
    ongoingTournament: ["Premier League"],
    teamID: 354,
    crest: "https://crests.football-data.org/354.png",
  },
];

//scap premierleauge table data and then merge with basicTeamInfo
async function fetchAndMergeData() {
  try {
    const response = await axios(url);
    const html = response.data;
    const $ = cheerio.load(html);
    const tableRows = [];

    // Scrape the table data
    $("tbody.league-table__tbody.isPL tr").each((index, element) => {
      const teamName = $(element).find(".team .long").text().trim();
      const rank = $(element).find(".league-table__value").text().trim();
      const points = $(element).find(".points").text().trim();

      if (teamName !== "") {
        tableRows.push({
          team: teamName + " FC",
          rank: rank,
          points: points,
        });
      }
    });
    // Merge with the basicTeamInfo
    const mergedData = tableRows.map((row) => {
      const teamInfo = basicTeamInfo.find((info) => row.team === info.name);
      return teamInfo ? { ...row, ...teamInfo } : row;
    });

    return mergedData;
  } catch (error) {
    console.error(error);
    return []; // Return an empty array in case of an error
  }
}

//scap next match and last 5 matches
async function scrapeData(url) {
  try {
    // Fetch the HTML of the page
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Find the container with last matches
    const matchesContainer = $("div.box_last_matches");
    // Initialize an array to hold the match data
    const matches = [];

    // Iterate through each match
    matchesContainer.find("div.game").each((index, element) => {
      const homeTeam = $(element).find("span.home").text().trim();
      const awayTeam = $(element).find("span.away").text().trim();

      const scoreElement = $(element).find("span.score.text-center");
      const homeScore = scoreElement.find("span").eq(0).text().trim();
      const awayScore = scoreElement.find("span").eq(2).text().trim();

      if (matches.length < 5) {
        matches.push({
          homeTeam,
          awayTeam,
          homeScore,
          awayScore,
        });
      }
    });

    // Find the container with last matches
    const dateContainer = $("div.small_box_h2h");
    // Initialize an array to hold the match data
    var matchDate;
    // Iterate through each match
    dateContainer.find("div.status").each((index, element) => {
      if (index === 7) {
        const dateDiv = $(element).find("div.date");
        const unixTime = dateDiv.attr("data-unixtime");
        const dateText = dateDiv.text().trim();

        if (unixTime) {
          // Convert Unix timestamp to milliseconds and create a Date object
          const date = new Date(parseInt(unixTime, 10) * 1000);

          // Format the date
          const options = {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          };
          const formattedDate = date.toLocaleString("en-GB", options);
          matchDate = {
            date: formattedDate,
            dateText,
          };
        }
      }
    });
    const teamContainer = $("div.game_box");

    const wrongName = [
      "Tottenham FC",
      "Brighton FC",
      "Ipswich FC",
      "West Ham FC",
      "Leicester FC",
    ];
    const correctName = [
      "Tottenham Hotspur FC",
      "Brighton and Hove Albion FC",
      "Ipswich Town FC",
      "West Ham United FC",
      "Leicester City FC",
    ];

    var nextMatch = [];
    teamContainer.find("div.col-xs-5").each((index, element) => {
      if (index < 2) {
        var teamName = $(element).find("a").last().text().trim() + " FC";
        if (wrongName.includes(teamName)) {
          teamName =
            correctName[wrongName.findIndex((element) => element === teamName)];
        }
        nextMatch.push(teamName);
      }
    });
    if (matches.length < 6) {
      matches.push({
        nextMatch,
        matchDate,
      });
    }
    return matches;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}


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
  "/register",  cors() ,
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
app.post("/login",   cors() ,async (req, res) => {
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
app.post("/logout",  cors(), (req, res) => {
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

app.post("/addFavorite", cors(), async (req, res) => {
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

app.delete("/deleteFavorite",  cors(),async (req, res) => {
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
