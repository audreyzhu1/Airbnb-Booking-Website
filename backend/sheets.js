// backend/sheets.js
console.log("✅ sheets.js loaded");

const { google } = require("googleapis");
const credentials = require("./credentials.json");

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

const SPREADSHEET_ID = "13loNnamIaSp7EciX_ONrblWvcaGAmUhj1EEVg71QAdA";
const RANGE = "Main!A2:L";

function parseDateRange(range) {
  const [start, end] = range.split("-");
  const year = "2025";
  const format = (dateStr) => {
    const [month, day] = dateStr.split("/");
    // Make sure we're creating dates at midnight local time
    return new Date(year, parseInt(month) - 1, parseInt(day));
  };
  return {
    startDate: format(start),
    endDate: format(end),
  };
}

function getResortPhoto(resortName) {
  const resortPhotos = {
    'Dolphin C': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop&q=80',
    'Dolphin Cove': 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400&h=250&fit=crop&q=80'
  };
  return resortPhotos[resortName?.trim()] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop&q=80';
}

function generateAirbnbLink(resortName, bookingCode) {
  const baseCode = (bookingCode || '').split(',')[0]?.trim() || 'airbnb';
  const cleanResort = (resortName || '').toLowerCase().replace(/\s+/g, '-');
  return `https://airbnb.com/${baseCode}-${cleanResort}`;
}

async function getSheetData() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: RANGE,
  });

  const rows = res.data.values || [];
  console.log("✅ Total rows fetched from Google Sheets:", rows.length);
  
  // Debug: Show first few rows
  console.log("🔍 First 3 rows from Google Sheets:");
  rows.slice(0, 3).forEach((row, index) => {
    console.log(`Row ${index}:`, row);
  });

  return rows
    .filter((r) => {
      const hasRequired = r[2] && r[3] && r[4] && r[4].includes("-");
      if (!hasRequired) {
        console.warn("❌ Skipping row (missing data or invalid date range):", r);
      }
      return hasRequired;
    })
    .map((r) => {
      try {
        console.log("⏳ Parsing row:", r[4]);
        const { startDate, endDate } = parseDateRange(r[4]);
        
        const parsedRow = {
          resort: r[2].trim(),
          unitType: r[3].trim(),
          dateRange: r[4].trim(),
          startDate,
          endDate,
          nights: parseInt(r[5]) || 0,
          bookDate: r[6]?.trim() || '',
          cost: r[7].trim(),
          pointsCosts: r[8]?.trim() || 'N/A',
          bookingCode: r[9]?.trim() || '',
          status: r[0]?.trim() || '',
          photo: getResortPhoto(r[2]),
          link: generateAirbnbLink(r[2], r[9]),
          usage: r[11]?.trim() || ''  // Try index 11 instead of 10
        };
        
        console.log("✅ Parsed row:", {
          resort: parsedRow.resort,
          unitType: parsedRow.unitType,
          dateRange: parsedRow.dateRange
        });
        
        return parsedRow;
      } catch (err) {
        console.warn("⚠️ Skipping bad row:", r[4], "| Error:", err.message);
        return null;
      }
    })
    .filter((row) => row !== null);
}

module.exports = { getSheetData };