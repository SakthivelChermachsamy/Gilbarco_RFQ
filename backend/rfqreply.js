const express = require('express');
const admin = require('firebase-admin');
const multer = require('multer');
const path = require('path');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/supplier/reply', upload.fields([
  { name: 'breakupFile', maxCount: 1 },
  { name: 'drawingFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { rfqId, quoteDetails, terms } = req.body;
    const supplierId = req.user.uid; 

    const rfqDoc = await admin.firestore().collection('quotations').doc(rfqId).get();
    if (!rfqDoc.exists || !rfqDoc.data().suppliers.includes(supplierId)) {
      return res.status(400).json({ error: 'Invalid RFQ or supplier not authorized' });
    }

    const fileUrls = {};
    if (req.files) {
      const bucket = admin.storage().bucket();
      for (const [fieldName, file] of Object.entries(req.files)) {
        const filePath = `supplier_replies/${rfqId}/${fieldName}_${Date.now()}${path.extname(file[0].originalname)}`;
        await bucket.file(filePath).save(file[0].buffer);
        fileUrls[fieldName] = await bucket.file(filePath).getSignedUrl({
          action: 'read',
          expires: '03-01-2500'
        });
      }
    }

    const replyData = {
      rfqId,
      rfqNumber: rfqDoc.data().rfqNumber,
      supplierId,
      supplierName: req.user.name || 'Unknown Supplier',
      submissionDate: admin.firestore.FieldValue.serverTimestamp(),
      status: 'submitted',
      quoteDetails: JSON.parse(quoteDetails),
      terms: JSON.parse(terms),
      attachments: fileUrls
    };

    const replyRef = await admin.firestore().collection('supplier_replies').add(replyData);

    res.status(201).json({ 
      message: 'Quotation submitted successfully',
      replyId: replyRef.id
    });
  } catch (error) {
    console.error('Error submitting quotation:', error);
    res.status(500).json({ error: 'Failed to submit quotation' });
  }
});

module.exports = router;
