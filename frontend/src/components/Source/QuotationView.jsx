import { useState, useEffect } from "react";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import Nav from '../../components/Source/Nav';
import { isAuthenticated } from '../../services/Auth';
import { Logout } from '../../services/Auth';
import { useAuth } from '../../services/AuthContext';
import Page404 from '../../pages/Landingpage/Page404';

const QuotationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { isUser, isAdmin } = useAuth();
  if (!(isUser || isAdmin)) {
    return <Page404 />;
  }
  
  const LogoutUser = () => {
    Logout();
    navigate('/login');
  };
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }

 
  const [creatorDetails, setCreatorDetails] = useState(null);
  const [creatorLoading, setCreatorLoading] = useState(false);
  const [creatorError, setCreatorError] = useState(null);
  

  const [suppliersDetails, setSuppliersDetails] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [suppliersError, setSuppliersError] = useState(null);

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'quotations', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const quotationData = { id: docSnap.id, ...docSnap.data() };
          setQuotation(quotationData);
          
          
          if (quotationData.createdBy) {
            fetchCreatorDetails(quotationData.createdBy);
          }
          
        
          if (quotationData.suppliers && quotationData.suppliers.length > 0) {
            fetchSuppliersDetails(quotationData.suppliers);
          }
        } else {
          setError('Quotation not found');
        }
      } catch (err) {
        console.error("Error fetching quotation:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchCreatorDetails = async (userId) => {
      try {
        setCreatorLoading(true);
        setCreatorError(null);
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
          setCreatorDetails({
            id: userDoc.id,
            ...userDoc.data()
          });
        } else {
          setCreatorError('User not found');
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
        setCreatorError('Failed to load user details');
      } finally {
        setCreatorLoading(false);
      }
    };

    const fetchSuppliersDetails = async (supplierIds) => {
      try {
        setSuppliersLoading(true);
        setSuppliersError(null);
        
        const suppliersPromises = supplierIds.map(async (supplierId) => {
          const supplierDoc = await getDoc(doc(db, 'suppliers', supplierId));
          return {
            id: supplierId,
            ...(supplierDoc.exists() ? supplierDoc.data() : { name: 'Supplier not found' })
          };
        });

        const suppliersData = await Promise.all(suppliersPromises);
        setSuppliersDetails(suppliersData);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        setSuppliersError('Failed to load supplier details');
      } finally {
        setSuppliersLoading(false);
      }
    };

    fetchQuotation();
  }, [id]);

  const handleBack = () => {
    navigate(-1);
  };

  const renderCreatorInfo = () => {
    if (creatorLoading) {
      return <span className="text-muted"><small>Loading user info...</small></span>;
    }
    if (creatorError) {
      return <span className="text-muted"><small>{creatorError}</small></span>;
    }
    return creatorDetails?.name || creatorDetails?.email || `User ID: ${quotation?.createdBy || 'Unknown'}`;
  };

  const formatCreatedAt = (dateValue) => {
  if (!dateValue) return 'Not specified';
  
  try {
    if (dateValue.toDate) {
      const date = dateValue.toDate();
      return `${date.getDate()} ${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()} at ${date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Kolkata'
      })} `;
    }
    
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return `${date.getDate()} ${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()} at ${date.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Kolkata'
        })} IST`;
      }
    }
    
    if (typeof dateValue === 'string' && dateValue.includes(' at ')) {
      return dateValue;
    }
    
    return 'Invalid date format';
  } catch (error) {
    console.error('Error formatting createdAt:', error);
    return 'Invalid date';
  }
};

  const formatSubmissionDate = (dateString) => {
    if (!dateString) return 'Not specified';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      });
    } catch (error) {
      console.error('Error formatting submissionDate:', error);
      return dateString;
    }
  };


  if (loading) {
    return (
      <div className="rfq-details-container">
        <Nav LogoutUser={LogoutUser}/>
        <div className="container mt-4">
          <div className="text-center my-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading RFQ details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rfq-details-container">
        <Nav LogoutUser={LogoutUser}/>
        <div className="container mt-4">
          <div className="alert alert-danger">
            Error: {error}
            <button className="btn btn-sm btn-outline-danger ms-2" onClick={() => window.location.reload()}>
              Try Again
            </button>
            <button className="btn btn-sm btn-outline-secondary ms-2" onClick={handleBack}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="rfq-details-container">
        <Nav LogoutUser={LogoutUser}/>
        <div className="container mt-4">
          <div className="alert alert-warning">
            Quotation not found
            <button className="btn btn-sm btn-outline-secondary ms-2" onClick={handleBack}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rfq-details-container">
      <Nav LogoutUser={LogoutUser}/>
      
      <div className="container mt-4">
        <button className="btn btn-outline-secondary mb-3" onClick={handleBack}>
          &larr; Back to List
        </button>

        <div className="card">
          <div className="card-header">
            <div className="d-flex justify-content-between align-items-center">
              <h2 className="mb-0">RFQ Details</h2>
              <span className={`badge bg-${
                quotation.status === 'pending' ? 'warning' : 
                quotation.status === 'completed' ? 'success' : 'secondary'
              }`}>
                {quotation.status.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-md-6">
                <h5>RFQ Information</h5>
                <p><strong>RFQ Number:</strong> {quotation.rfqNumber}</p>
                {quotation.projectName && <p><strong>Project Name:</strong> {quotation.projectName}</p>}
                <p><strong>Created By:</strong> {renderCreatorInfo()}</p>
              </div>
              <div className="col-md-6">
                <h5>Dates</h5>
                <p><strong>Created At:</strong> {formatCreatedAt(quotation.createdAt)}</p>
                <p><strong>Submission Deadline:</strong> {formatSubmissionDate(quotation.submissionDate)}</p>
              </div>
            </div>

            <hr />

            <div className="mb-4">
              <h5>Parts List</h5>
              {quotation.parts && quotation.parts.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Part No</th>
                        <th>Description</th>
                        <th>Revision</th>
                        <th>Order Type</th>
                        <th>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.parts.map((part, index) => (
                        <tr key={index}>
                          <td>{part.partNo}</td>
                          <td>{part.partDescription || '-'}</td>
                          <td>{part.drawRevision || '-'}</td>
                          <td className="text-capitalize">{part.orderType}</td>
                          <td>{part.partQuantity || part.Quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="alert alert-info">
                  No parts information available
                </div>
              )}
            </div>

            <hr />

            <div className="row">
              <div className="col-md-6">
                <h5>Suppliers</h5>
                {suppliersLoading ? (
                  <div className="d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <span>Loading suppliers...</span>
                  </div>
                ) : suppliersError ? (
                  <div className="alert alert-warning py-2">
                    <small>{suppliersError}</small>
                  </div>
                ) : quotation.suppliers && quotation.suppliers.length > 0 ? (
                  <ul className="list-group">
                    {quotation.suppliers.map((supplierId, index) => {
                      const supplier = suppliersDetails.find(s => s.id === supplierId);
                      return (
                        <li key={index} className="list-group-item">
                          <div>
                            <strong>{supplier?.name || 'Unknown Supplier'}</strong>
                            {supplier?.email && (
                              <div className="small">Email: {supplier.email}</div>
                            )}
                            {supplier?.vendorId && (
                              <div className="small">Vendor ID: {supplier.vendorId}</div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p>No suppliers selected</p>
                )}
              </div>

              <div className="col-md-6">
                <h5>Additional Information</h5>
                {quotation.drawingFileName && (
                  <p>
                    <strong>Drawing File:</strong> {quotation.drawingFileName}
                  </p>
                )}
                <p>
                  <strong>Total Parts:</strong> {quotation.parts?.length || 0}
                </p>
                <p>
                  <strong>Total Suppliers:</strong> {quotation.suppliers?.length || 0}
                </p>
                <p>
                  <strong>Comments:</strong> {quotation.comments || "Nil"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationView;