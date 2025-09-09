console.log("✅ sheets.js loaded");

const { google } = require("googleapis");

// Use environment variables in production, fallback to credentials.json in development
let credentials;
if (process.env.GOOGLE_PRIVATE_KEY) {
  // Production: use environment variables (Railway)
  console.log("🌐 Using environment variables for Google credentials");
  credentials = {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
  };
} else {
  // Development: use credentials.json (if it exists)
  console.log("📁 Trying to use local credentials.json");
  try {
    credentials = require("./credentials.json");
  } catch (error) {
    console.error("❌ No credentials found. Please set environment variables or add credentials.json");
    throw new Error("No credentials found. Please set environment variables or add credentials.json");
  }
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});

const sheets = google.sheets({ version: "v4", auth });

// Use environment variable in production, fallback to your spreadsheet ID
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "1-geh1K6OxDVs97XZaoZ4DIdA6maC-FNpoX3vlwSHxb0";
const RANGE = "Sheet1!A2:M";

function getResortPhoto(resortName) {
  const resortPhotos = {
    'Dolphin C': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop&q=80',
    'Dolphin Cove': 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400&h=250&fit=crop&q=80',
    'Yellowstone': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=250&fit=crop&q=80'
  };
  return resortPhotos[resortName?.trim()] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop&q=80';
}

function generateAirbnbLink(resortName, bookingCode) {
  const baseCode = (bookingCode || '').split(',')[0]?.trim() || 'airbnb';
  const cleanResort = (resortName || '').toLowerCase().replace(/\s+/g, '-');
  return `https://airbnb.com/${baseCode}-${cleanResort}`;
}

function extractMinStayDays(usage) {
  if (!usage) return 1;
  const match = usage.match(/(\d+)D/i);
  return match ? parseInt(match[1]) : 1;
}

async function getSheetData() {
  try {
    console.log(`📊 Fetching data from spreadsheet: ${SPREADSHEET_ID}`);
    console.log(`📋 Range: ${RANGE}`);
    
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const rows = res.data.values || [];
    console.log("✅ Total rows fetched from Google Sheets:", rows.length);

    return rows
      .filter((r) => {
        // Based on your spreadsheet: [Cancel-By Date, Account, Resort, Bdrm, Date Range, ...]
        const hasRequired = r[0] && r[1] && r[2] && r[3] && r[4] && r[4].includes("-");
        if (!hasRequired) {
          console.warn("❌ Skipping row (missing data or invalid date range):", r);
        }
        return hasRequired;
      })
      .map((r, index) => {
        try {
          // NO DATE PARSING - just use raw string values
          const parsedRow = {
            // Column mapping based on your spreadsheet structure:
            cancelByDate: r[0]?.trim() || '',        // A: Cancel-By Date
            account: r[1]?.trim() || '',             // B: Account (A, A2, Q, New, JA, V)
            resort: r[2]?.trim() || '',              // C: Resort (Dolphin Cove)
            unitType: r[3]?.trim() || '',            // D: Bdrm (3 bedroom, 2 bedroom 1 bath, etc.)
            dateRange: r[4]?.trim() || '',           // E: Date Range (9/23-9/25) - RAW STRING ONLY
            nights: parseInt(r[5]) || 0,             // F: # of days
            bookDate: r[6]?.trim() || '',            // G: Book Date
            cost: r[7]?.trim() || '',                // H: Cash Costs ($366.60)
            pointsCosts: r[8]?.trim() || 'N/A',      // I: Points Costs (MM, IS)
            bookingCode: r[9]?.trim() || '',         // J: Booking Code
            hk: r[10]?.trim() || '',                 // K: HK
            usage: r[11]?.trim() || '',              // L: Usage (airbnb1, $179, 3D, 6/1)
            
            // Additional fields for the frontend
            status: r[1]?.trim() || '',              // Use Account as status
            photo: getResortPhoto(r[2]),
            link: generateAirbnbLink(r[2], r[9]),
            minStayDays: extractMinStayDays(r[11])   // Extract from Usage column
            // NO startDate or endDate fields - frontend will parse dateRange when needed
          };
          
          return parsedRow;
        } catch (err) {
          console.warn(`⚠️ Skipping bad row ${index + 2}:`, r[4], "| Error:", err.message);
          return null;
        }
      })
      .filter((row) => row !== null);
  } catch (error) {
    console.error("💥 Error fetching sheet data:", error);
    throw error;
  }
}

module.exports = { getSheetData };