import axios from "axios";
import basicTeamInfo from "./basicTeamInfo.js"
import * as cheerio from "cheerio";



const url = "https://www.premierleague.com/tables"; // URL of Premier League standings page

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

export default fetchAndMergeData;