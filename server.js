const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const FACILITIES_FILE = path.join(__dirname, 'facilities.json');
const REQUESTS_FILE = path.join(__dirname, 'urgent_requests.json');
const DONORS_FILE = path.join(__dirname, 'donors.json');

function readData(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8') || '[]');
  } catch (err) {
    return [];
  }
}

function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
}

function sanitizeFacility(fac) {
  if (!fac) return null;
  const { backendSecretApprovalCode, dispatchKeyHash, ...safe } = fac;
  return safe;
}

function sanitizeRequest(reqItem) {
  if (!reqItem) return null;
  const { backendVerificationSecret, ...safe } = reqItem;
  return safe;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'LifeLink Express Backend' });
});

app.listen(PORT, () => {
  console.log(`[LifeLink Express] Server running on port ${PORT}`);
});
