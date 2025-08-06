const express = require("express");
const admin = require("firebase-admin");
const rfqRoutes = require('./RFQ');
const rfqreplies = require('./rfqreply');
const supplierRoutes = require('./supplier');
const cors = require("cors");
const { body, validationResult } = require("express-validator");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: true }));

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "your-firebase-db-url"
});

const db = admin.firestore();

async function authenticateAndAuthorize(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const idToken = authHeader.split(" ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;

    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({
      error: "Unauthorized",
      details: error.code === 'auth/id-token-expired' ? 'Token expired' : 'Invalid token'
    });
  }
}

app.post('/create-user', authenticateAndAuthorize, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').notEmpty().trim().escape(),
  body('role').isIn(['admin', 'user'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name, role } = req.body;

  try {
    try {
      await admin.auth().getUserByEmail(email);
      return res.status(400).json({ error: "User already exists" });
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: false
    });

    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(201).json({
      message: 'User created successfully',
      uid: userRecord.uid
    });
  } catch (error) {
    console.error("Create user error:", error);
    return res.status(500).json({
      error: "Failed to create user",
      details: error.message
    });
  }
});

app.patch("/update-user", authenticateAndAuthorize, [
  body('uid').notEmpty(),
  body('name').optional().trim().escape(),
  body('role').optional().isIn(['admin', 'user'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { uid, name, role } = req.body;

  try {
    const updateData = {};
    if (name) updateData.displayName = name;

    await admin.auth().updateUser(uid, updateData);

    const userUpdate = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (role) userUpdate.role = role;

    await db.collection('users').doc(uid).update(userUpdate);

    return res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Update user error:", error);
    const status = error.code === 'auth/user-not-found' ? 404 : 500;
    return res.status(status).json({
      error: "Failed to update user",
      details: error.message
    });
  }
});

app.delete("/delete-user", authenticateAndAuthorize, [
  body('uid').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { uid } = req.body;

  try {
    if (uid === req.user.uid) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }

    await admin.auth().deleteUser(uid);
    await db.collection('users').doc(uid).delete();

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    const status = error.code === 'auth/user-not-found' ? 404 : 500;
    return res.status(status).json({
      error: "Failed to delete user",
      details: error.message
    });
  }
});

app.get("/users", async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      error: "Failed to get users",
      details: error.message
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});


app.post('/create-supplier', async (req, res) => {
    try {
        const { email, password, name, vendorId, phone, location, category } = req.body;
        
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: name
        });

        await admin.firestore().collection('suppliers').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            name,
            role: 'supplier',
            vendorId,
            phone,
            location,
            category,
            supplierType,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({ message: 'Supplier created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



app.use('/api', rfqRoutes);
app.use('/api', authenticateAndAuthorize, rfqreplies);
app.use('/supplier', supplierRoutes);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});