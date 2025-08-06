const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized - No token provided' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    const status = error.code === 'auth/id-token-expired' ? 401 : 500;
    res.status(status).json({ 
      message: error.code === 'auth/id-token-expired' ? 'Token expired' : 'Authentication failed',
      error: error.message 
    });
  }
};

const supplierValidationRules = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('supplierData.name').notEmpty().trim().escape().withMessage('Name is required'),
  body('supplierData.vendorId').notEmpty().trim().escape().withMessage('Vendor ID is required'),
  body('supplierData.phone').optional().trim().escape(),
  body('supplierData.country').optional().trim().escape(),
  body('supplierData.location').optional().trim().escape(),
  body('supplierData.category').optional().trim().escape(),
  body('supplierData.subCategory').optional().trim().escape(),
  body('supplierData.supplierType').optional().isIn(['Regular', 'OEM']).withMessage('Invalid supplier type')
];

router.post('/create-supplier', authenticate, supplierValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password, supplierData } = req.body;

    try {
      await admin.auth().getUserByEmail(email);
      return res.status(400).json({ message: 'User with this email already exists' });
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: supplierData.name,
      emailVerified: false,
      disabled: false,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'supplier'
    });


    const supplierDoc = {
      uid: userRecord.uid,
      email,
      ...supplierData,
      role: 'supplier',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await admin.firestore()
      .collection('suppliers')
      .doc(userRecord.uid)
      .set(supplierDoc);

    res.status(201).json({
      message: 'Supplier created successfully',
      supplierId: userRecord.uid
    });

  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ 
      message: 'Error creating supplier',
      error: error.message 
    });
  }
});

router.put('/update-supplier/:uid', authenticate, [
  body('name').optional().trim().escape(),
  body('vendorId').optional().trim().escape(),
  body('phone').optional().trim().escape(),
  body('country').optional().trim().escape(),
  body('location').optional().trim().escape(),
  body('category').optional().trim().escape(),
  body('subCategory').optional().trim().escape(),
  body('supplierType').optional().isIn(['Regular', 'OEM'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { uid } = req.params;
    const updateData = req.body;

    if (updateData.name) {
      await admin.auth().updateUser(uid, {
        displayName: updateData.name
      });
    }

    await admin.firestore()
      .collection('suppliers')
      .doc(uid)
      .update({
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    res.status(200).json({
      message: 'Supplier updated successfully'
    });

  } catch (error) {
    console.error('Error updating supplier:', error);
    const status = error.code === 'auth/user-not-found' ? 404 : 500;
    res.status(status).json({ 
      message: 'Error updating supplier',
      error: error.message 
    });
  }
});

router.get('/supplierdetails', authenticate, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('suppliers').get();
    const suppliers = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()?.toISOString(),
      updatedAt: doc.data().updatedAt?.toDate()?.toISOString()
    }));
    
    res.status(200).json(suppliers);
  } catch (error) {
    console.error('Error getting suppliers:', error);
    res.status(500).json({ 
      message: 'Error getting suppliers',
      error: error.message 
    });
  }
});

router.delete('/delete-supplier/:uid', authenticate, async (req, res) => {
  try {
    const { uid } = req.params;
    if (uid === req.user.uid) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    await admin.auth().deleteUser(uid);
    await admin.firestore()
      .collection('suppliers')
      .doc(uid)
      .delete();

    res.status(200).json({
      message: 'Supplier deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting supplier:', error);
    const status = error.code === 'auth/user-not-found' ? 404 : 500;
    res.status(status).json({ 
      message: 'Error deleting supplier',
      error: error.message 
    });
  }
});

module.exports = router;