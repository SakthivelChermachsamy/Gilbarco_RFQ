require('dotenv').config();
const express = require('express');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const sgMail = require('@sendgrid/mail');

const router = express.Router();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/quotations', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let query = admin.firestore().collection('quotations');

    if (status && ['pending', 'completed', 'expired'].includes(status)) {
      query = query.where('status', '==', status);
    }

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const snapshot = await query.get();

    const quotations = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();

      // Check if RFQ is expired
      if (data.status === 'pending' && new Date(data.submissionDate) < yesterday) {
        await doc.ref.update({ status: 'expired' });
        return { ...data, status: 'expired', id: doc.id };
      }

      return { ...data, id: doc.id };
    }));

    res.json(quotations);
  } catch (error) {
    console.error('Error fetching quotations:', error);
    res.status(500).json({ message: 'Error fetching quotations' });
  }
});

router.post('/quotations', authenticate, async (req, res) => {
  try {
    const {
      projectName,
      parts,
      suppliers,
      submissionDate,
      drawingFileName,
      comments,
    } = req.body;

    if (!projectName || typeof projectName !== 'string' || projectName.trim() === '') {
      return res.status(400).json({ message: 'Project name is required' });
    }

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ message: 'At least one part is required' });
    }

    if (!suppliers || !Array.isArray(suppliers) || suppliers.length === 0) {
      return res.status(400).json({ message: 'At least one supplier is required' });
    }

    if (!submissionDate) {
      return res.status(400).json({ message: 'Submission date is required' });
    }

    const { rfqNumber, sequence } = await generateRfqNumber();

    const quotationData = {
      projectName: projectName.trim(),
      rfqNumber,
      parts,
      suppliers,
      submissionDate,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      createdBy: req.user.uid,
      comments: comments ? comments.trim() : '',
      sequence 
    };

    if (drawingFileName) {
      quotationData.drawingFileName = drawingFileName;
    }

    const docRef = await admin.firestore().collection('quotations').add(quotationData);

    sendEmailsToSuppliers(suppliers, rfqNumber, quotationData)
      .catch(error => console.error('Email sending error:', error));

    res.status(201).json({
      message: 'Quotation created successfully',
      id: docRef.id,
      rfqNumber
    });

  } catch (error) {
    console.error('Error creating quotation:', error);
    res.status(500).json({ message: 'Error creating quotation' });
  }
});

router.put('/quotations/:id/parts', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { parts } = req.body;

    if (!parts || !Array.isArray(parts)) {
      return res.status(400).json({ message: 'Invalid parts data' });
    }

    const docRef = admin.firestore().collection('quotations').doc(id);
    await docRef.update({ parts });

    res.json({ message: 'Parts updated successfully' });
  } catch (error) {
    console.error('Error updating parts:', error);
    res.status(500).json({ message: 'Error updating parts' });
  }
});
async function generateRfqNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `RFQ-${year}${month}`;

  const counterRef = admin.firestore().collection('counters').doc(prefix);

  const sequence = await admin.firestore().runTransaction(async (transaction) => {
    const doc = await transaction.get(counterRef);
    let newSequence = 1;

    if (doc.exists) {
      newSequence = doc.data().sequence + 1;
    }

    transaction.set(counterRef, { sequence: newSequence }, { merge: true });
    return newSequence;
  });

  return {
    rfqNumber: `${prefix}-${String(sequence).padStart(3, '0')}`,
    sequence
  };
}

async function sendEmailsToSuppliers(suppliers, rfqNumber, quotationData) {
  try {

    const supplierDocs = await admin.firestore()
      .collection('suppliers')
      .where(admin.firestore.FieldPath.documentId(), 'in', suppliers)
      .get();

    if (supplierDocs.empty) {
      console.log('No suppliers found for email notification');
      return;
    }

    const emailPromises = supplierDocs.docs.map(async (doc) => {
      const supplier = doc.data();
      if (!supplier.email) {
        console.log(`No email found for supplier ${supplier.name || doc.id}`);
        return;
      }

      try {
        const emailSubject = `New RFQ: ${rfqNumber}`;
        const submissionDate = new Date(quotationData.submissionDate).toLocaleDateString();

        const emailHtml = `
        <h1 style="color: #2c3e50; font-family: Arial, sans-serif; font-size: 24px; font-weight: bold; margin-bottom: 20px;">New Request for Quotation (RFQ: ${rfqNumber})</h1>

<p style="color: #34495e; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; margin-bottom: 15px;">Dear ${supplier.name || 'Vendor'},</p>

<p style="color: #34495e; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">You have received a new RFQ with the following details:</p>

<div style="background-color: #f8f9fa; border-left: 4px solid #3498db; padding: 15px; margin-bottom: 25px;">
  <h3 style="color: #2c3e50; font-family: Arial, sans-serif; font-size: 18px; margin-top: 0; margin-bottom: 15px;">RFQ Summary</h3>
  <p style="color: #34495e; font-family: Arial, sans-serif; font-size: 14px; margin: 5px 0;"><strong style="color: #2c3e50;">Project:</strong> ${quotationData.projectName}</p>
  <p style="color: #34495e; font-family: Arial, sans-serif; font-size: 14px; margin: 5px 0;"><strong style="color: #2c3e50;">Submission Deadline:</strong> <span style="color: #e74c3c; font-weight: bold;">${submissionDate}</span></p>
  ${quotationData.drawingFileName ? `<p style="color: #34495e; font-family: Arial, sans-serif; font-size: 14px; margin: 5px 0;"><strong style="color: #2c3e50;">Drawing File:</strong> ${quotationData.drawingFileName}</p>` : ''}
</div>

<h3 style="color: #2c3e50; font-family: Arial, sans-serif; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #3498db; padding-bottom: 5px;">Parts List</h3>

<table border="0" cellpadding="8" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 25px; font-family: Arial, sans-serif;">
  <thead>
    <tr style="background-color: #3498db; color: white;">
      <th align="left" style="padding: 12px; font-weight: bold;">Part No</th>
      <th align="left" style="padding: 12px; font-weight: bold;">Description</th>
      <th align="left" style="padding: 12px; font-weight: bold;">Revision</th>
      <th align="left" style="padding: 12px; font-weight: bold;">Order Type</th>
      <th align="left" style="padding: 12px; font-weight: bold;">Quantity</th>
    </tr>
  </thead>
  <tbody>
    ${quotationData.parts.map((part, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'}; border-bottom: 1px solid #e0e0e0;">
      <td style="padding: 10px; color: #2c3e50;">${part.partNo}</td>
      <td style="padding: 10px; color: #2c3e50;">${part.partDescription || 'N/A'}</td>
      <td style="padding: 10px; color: #2c3e50;">${part.drawRevision || 'N/A'}</td>
      <td style="padding: 10px; color: #2c3e50;">${part.orderType}</td>
      <td style="padding: 10px; color: #2c3e50; font-weight: bold;">${part.partQuantity}</td>
    </tr>
    `).join('')}
  </tbody>
</table>

<div style="background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin-bottom: 25px; text-align: center;">
  <p style="color: #34495e; font-family: Arial, sans-serif; font-size: 16px; margin-bottom: 15px;">Please log in to the vendor portal to submit your quotation.</p>
  <a href="http://localhost:5173" style="background-color: #3498db; color: white; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; display: inline-block; font-family: Arial, sans-serif;">Access Vendor Portal</a>
</div>

<p style="color: #7f8c8d; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; margin-bottom: 5px;">If you have any questions, please contact our purchasing department at <a href="mailto:sourcing@gilbarco.com" style="color: #3498db; text-decoration: none;">sourcing@gilbarco.com</a>.</p>

<p style="color: #2c3e50; font-family: Arial, sans-serif; font-size: 14px; margin-top: 20px;">Best regards,<br><strong style="color: #3498db;">GILBARCO VEEDER ROOT INDIA</strong></p>

<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ecf0f1; color: #95a5a6; font-family: Arial, sans-serif; font-size: 12px;">
  <p>This is an automated message. Please do not reply to this email.</p>
</div>
      `;

        const msg = {
          to: supplier.email,
          from: {
            email: 'peace_man002@outlook.com', 
            name: 'GILBARCO VEEDER ROOT INDIA'
          },
          subject: `New RFQ: ${rfqNumber}`,
          html: emailHtml, 
          text: `New RFQ ${rfqNumber} received. Please log in to the vendor portal for details.`
        };

        await sgMail.send(msg);
        console.log(`Email successfully sent to ${supplier.email}`);
      } catch (error) {
        if (error.response) {
          console.error(`SendGrid API Error for ${supplier.email}:`, {
            status: error.response.status,
            body: error.response.body,
            headers: error.response.headers
          });
        } else if (error.request) {
          console.error(`No response from SendGrid for ${supplier.email}:`, error.message);
        } else {
          console.error(`Error setting up email to ${supplier.email}:`, error.message);
        }
      }
    });

    await Promise.all(emailPromises);
    console.log(`Email sending process completed for RFQ ${rfqNumber}`);
  } catch (error) {
    console.error('Error in sendEmailsToSuppliers:', {
      message: error.message,
      stack: error.stack,
      ...(error.response ? {
        status: error.response.status,
        data: error.response.data
      } : {})
    });
  }
}
module.exports = router;