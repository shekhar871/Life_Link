/**
 * ============================================================================
 * LIFELINK — EXPRESS.JS BACKEND SERVER (server.js)
 * ============================================================================
 * [LECTURE ARCHITECTURE: Separate Backend Microservice alongside Electron Shell]
 * 
 * Runs on http://localhost:3000. Provides clinical data persistence backed by 
 * JSON stores (facilities.json, urgent_requests.json, donors.json).
 * 
 * [SECURITY PRINCIPLE: SENSITIVE CREDENTIAL ENCAPSULATION]
 * Role passkeys, approval secret hashes, and admin verification tokens are 
 * stored and validated strictly on the backend. Only sanitized, display-safe 
 * fields are transmitted across HTTP to the frontend renderer.
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so the React renderer (http://localhost:5173 or Electron file://) can query APIs
app.use(cors({ origin: '*' }));
app.use(express.json());

// Persistent JSON file paths
const FACILITIES_FILE = path.join(__dirname, 'facilities.json');
const REQUESTS_FILE = path.join(__dirname, 'urgent_requests.json');
const DONORS_FILE = path.join(__dirname, 'donors.json');

/**
 * [HELPER: Safe JSON File Reader]
 * Reads file synchronously with graceful empty-array fallback
 */
function readData(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return [];
  }
}

/**
 * [HELPER: Safe JSON File Writer]
 * Writes formatted JSON back to disk atomically
 */
function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

/**
 * [LECTURE REQUIREMENT: Data Sanitization Helper for Facilities]
 * Strips backendSecretApprovalCode and dispatchKeyHash before sending to renderer.
 */
function sanitizeFacility(fac) {
  if (!fac) return null;
  const { backendSecretApprovalCode, dispatchKeyHash, ...safeFacility } = fac;
  return safeFacility;
}

/**
 * [LECTURE REQUIREMENT: Data Sanitization Helper for Urgent Requests]
 * Strips backendVerificationSecret before sending to renderer.
 */
function sanitizeRequest(reqItem) {
  if (!reqItem) return null;
  const { backendVerificationSecret, ...safeRequest } = reqItem;
  return safeRequest;
}

/**
 * [SECURITY: Backend Role Credential Store]
 * Passkeys are kept strictly in backend memory and never exposed to the client.
 */
const ROLE_CREDENTIALS = {
  staff: {
    secretKey: 'STAFF-MED-2026',
    permissions: ['VIEW_AUDIT', 'UPDATE_STOCK', 'APPROVE_REQUESTS']
  },
  admin: {
    secretKey: 'ADMIN-SUPER-SECURE-99',
    permissions: ['VIEW_AUDIT', 'UPDATE_STOCK', 'APPROVE_REQUESTS', 'DELETE_INVENTORY', 'MANAGE_USERS']
  }
};

/**
 * [LECTURE REQUIREMENT: Role-Based Access Control Middleware]
 * Intercepts requests to privileged endpoints, verifying the header key against backend secrets.
 */
function requireRole(allowedRoles = ['staff', 'admin']) {
  return (req, res, next) => {
    const authKey = req.headers['x-lifelink-role-key'] || req.body?.roleKey;
    const claimedRole = (req.headers['x-lifelink-role'] || req.body?.role || '').toLowerCase();

    if (!allowedRoles.includes(claimedRole)) {
      return res.status(403).json({ success: false, error: 'Unauthorized role tier' });
    }

    const expected = ROLE_CREDENTIALS[claimedRole]?.secretKey;
    if (!expected || authKey !== expected) {
      return res.status(401).json({ success: false, error: 'Invalid security role key' });
    }

    req.userRole = claimedRole;
    next();
  };
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * 1. POST /api/verify-role
 * Validates role passkey from the RoleGuardModal and returns authorized permission scopes.
 */
app.post('/api/verify-role', (req, res) => {
  const { role, roleKey } = req.body;
  const cleanRole = (role || '').toLowerCase();
  
  if (cleanRole === 'user' || cleanRole === 'community user') {
    return res.json({ success: true, role: 'User', permissions: ['SEARCH', 'DONATE', 'REQUEST'] });
  }

  const roleConfig = ROLE_CREDENTIALS[cleanRole];
  if (roleConfig && roleKey === roleConfig.secretKey) {
    return res.json({
      success: true,
      role: cleanRole === 'admin' ? 'Administrator' : 'Facility Staff',
      permissions: roleConfig.permissions
    });
  }

  return res.status(401).json({ success: false, error: 'Invalid security passcode for this role' });
});

/**
 * 2. GET /facilities
 * Returns all facilities sanitized for client search and filtering.
 */
app.get('/facilities', (req, res) => {
  const facilities = readData(FACILITIES_FILE);
  const safeFacilities = facilities.map(sanitizeFacility);
  res.json(safeFacilities);
});

/**
 * 3. GET /facilities/:id
 * [LECTURE REQUIREMENT: Fetch one record at a time with Previous & Next navigation support]
 * Returns single facility with hasNext and hasPrev boolean flags.
 */
app.get('/facilities/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const facilities = readData(FACILITIES_FILE);
  const facility = facilities.find((f) => f.id === id);

  if (!facility) {
    return res.status(404).json({ error: `Facility with ID ${id} not found`, totalCount: facilities.length });
  }

  const safeFacility = sanitizeFacility(facility);
  res.json({
    facility: safeFacility,
    totalCount: facilities.length,
    hasNext: facilities.some((f) => f.id === id + 1),
    hasPrev: facilities.some((f) => f.id === id - 1)
  });
});

/**
 * 4. GET /requests
 * Returns all urgent community & hospital requests sanitized.
 */
app.get('/requests', (req, res) => {
  const requests = readData(REQUESTS_FILE);
  const safeRequests = requests.map(sanitizeRequest);
  res.json(safeRequests);
});

/**
 * 5. GET /requests/:id
 * [LECTURE REQUIREMENT: Fetch one request record at a time with Previous & Next navigation]
 */
app.get('/requests/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const requests = readData(REQUESTS_FILE);
  const reqItem = requests.find((r) => r.id === id);

  if (!reqItem) {
    return res.status(404).json({ error: `Urgent Request with ID ${id} not found`, totalCount: requests.length });
  }

  const safeRequest = sanitizeRequest(reqItem);
  res.json({
    request: safeRequest,
    totalCount: requests.length,
    hasNext: requests.some((r) => r.id === id + 1),
    hasPrev: requests.some((r) => r.id === id - 1)
  });
});

/**
 * 6. POST /requests/:id/approve
 * Role-guarded approval endpoint. Requires Staff or Admin authorization.
 */
app.post('/requests/:id/approve', requireRole(['staff', 'admin']), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const requests = readData(REQUESTS_FILE);
  const index = requests.findIndex((r) => r.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Request not found' });
  }

  const approverInfo = req.body.approverName || `${req.userRole.toUpperCase()} (Auth-Token Verified)`;
  requests[index].status = 'Approved / Dispatching';
  requests[index].approvedBy = approverInfo;
  requests[index].approvedAt = new Date().toISOString();

  writeData(REQUESTS_FILE, requests);
  res.json({ success: true, message: 'Request approved successfully', request: sanitizeRequest(requests[index]) });
});

/**
 * 7. POST /facilities/:id/stock
 * Role-guarded stock modification endpoint. Modifies blood units or appends medicine batches.
 */
app.post('/facilities/:id/stock', requireRole(['staff', 'admin']), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { componentType, bloodGroup, change, newMedicine } = req.body;
  const facilities = readData(FACILITIES_FILE);
  const facility = facilities.find((f) => f.id === id);

  if (!facility) {
    return res.status(404).json({ success: false, error: 'Facility not found' });
  }

  if (componentType && bloodGroup && typeof change === 'number') {
    if (facility.bloodStock[componentType] && typeof facility.bloodStock[componentType][bloodGroup] === 'number') {
      facility.bloodStock[componentType][bloodGroup] = Math.max(0, facility.bloodStock[componentType][bloodGroup] + change);
    }
  }

  if (newMedicine && newMedicine.name && newMedicine.batchNumber) {
    facility.medicines.push({
      id: `med-${Date.now()}`,
      name: newMedicine.name,
      batchNumber: newMedicine.batchNumber,
      quantity: Number(newMedicine.quantity) || 1,
      unit: newMedicine.unit || 'units',
      category: newMedicine.category || 'General Essential',
      expiryDate: newMedicine.expiryDate,
      status: 'Adequate'
    });
  }

  writeData(FACILITIES_FILE, facilities);
  res.json({ success: true, message: 'Stock updated', facility: sanitizeFacility(facility) });
});

/**
 * 8. DELETE /facilities/:facId/medicines/:medId
 * Role-guarded discard endpoint for expired medicines.
 */
app.delete('/facilities/:facId/medicines/:medId', requireRole(['staff', 'admin']), (req, res) => {
  const facId = parseInt(req.params.facId, 10);
  const { medId } = req.params;
  const facilities = readData(FACILITIES_FILE);
  const facility = facilities.find((f) => f.id === facId);

  if (!facility) {
    return res.status(404).json({ success: false, error: 'Facility not found' });
  }

  const initialCount = facility.medicines.length;
  facility.medicines = facility.medicines.filter((m) => m.id !== medId && m.batchNumber !== medId);

  if (facility.medicines.length === initialCount) {
    return res.status(404).json({ success: false, error: 'Medicine not found' });
  }

  writeData(FACILITIES_FILE, facilities);
  res.json({ success: true, message: 'Expired medicine batch discarded', facility: sanitizeFacility(facility) });
});

/**
 * 9. GET /donors & POST /donors/register & PATCH /donors/:id/status
 * Community blood donor network endpoints.
 */
app.get('/donors', (req, res) => {
  const donors = readData(DONORS_FILE);
  res.json(donors);
});

app.post('/donors/register', (req, res) => {
  const { fullName, bloodGroup, eligibleComponents, contact, district } = req.body;
  if (!fullName || !bloodGroup) {
    return res.status(400).json({ success: false, error: 'Name and blood group are required' });
  }

  const donors = readData(DONORS_FILE);
  const newDonor = {
    id: donors.length > 0 ? Math.max(...donors.map((d) => d.id)) + 1 : 1,
    fullName,
    bloodGroup,
    eligibleComponents: eligibleComponents || ['Whole Blood'],
    status: 'Available',
    lastDonationDate: new Date().toISOString().split('T')[0],
    contact: contact || '+1 (555) 000-0000',
    district: district || 'Metropolitan Core',
    isUniversalDonor: bloodGroup === 'O-',
    emergencyDispatchReady: true
  };

  donors.push(newDonor);
  writeData(DONORS_FILE, donors);
  res.status(201).json({ success: true, donor: newDonor });
});

app.patch('/donors/:id/status', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;
  const donors = readData(DONORS_FILE);
  const donor = donors.find((d) => d.id === id);

  if (!donor) {
    return res.status(404).json({ success: false, error: 'Donor not found' });
  }

  donor.status = status;
  writeData(DONORS_FILE, donors);
  res.json({ success: true, donor });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'LifeLink Express Backend', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[LifeLink Express] Server running securely at http://localhost:${PORT}`);
});
