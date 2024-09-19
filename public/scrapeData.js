import axios from "axios";
import * as cheerio from "cheerio";
import basicTeamInfo from "./basicTeamInfo.js"




const url = "https://www.premierleague.com/tables"; // URL of Premier League standings page

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

export default scrapeData;