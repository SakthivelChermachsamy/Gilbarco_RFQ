import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import Nav from '../../components/Supplier/Nav';
import { Logout, isAuthenticated } from '../../services/Auth';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/AuthContext';
import Page404 from "../Landingpage/Page404";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SupplierRFQView = () => {
  const [rfqs, setRfqs] = useState([]);
  const [reqoteRfqs, setReqoteRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const LogoutUser = () => {
    Logout();
    navigate('/login');
  }

  const { role } = useAuth();
  if (role !== 'supplier') {
    return <Page404 />;
  }
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  useEffect(() => {
    const fetchSupplierRFQs = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('Supplier not authenticated');
        }

        const rfqsRef = collection(db, 'quotations');
        const rfqsQuery = query(
          rfqsRef,
          where('suppliers', 'array-contains', user.uid)
        );
        const rfqsSnapshot = await getDocs(rfqsQuery);

        const repliesRef = collection(db, 'supplier_replies');
        const repliesQuery = query(
          repliesRef,
          where('supplier.id', '==', user.uid),
        );
        const repliesSnapshot = await getDocs(repliesQuery);
        const repliesData = repliesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        const submittedRfqIds = repliesData.map(reply => reply.rfqId);

        const allRfqs = [];
        const reQuotes = [];

        rfqsSnapshot.forEach(doc => {
          const rfqData = doc.data();
          const rfq = {
            id: doc.id,
            ...rfqData
          };

          if (rfqData.reqote && rfqData.reqoteSuppliers?.includes(user.uid)) {
            const existingReply = repliesData.find(reply => reply.rfqId === doc.id);
            if (!existingReply.requotes) {
              reQuotes.push({
                ...rfq,
                replyId: existingReply?.id
              });
            }
          }
          else if (rfqData.status === 'pending') {
            allRfqs.push(rfq);
          }
        });

        const pendingRfqs = allRfqs.filter(rfq => !submittedRfqIds.includes(rfq.id));

        setRfqs(pendingRfqs);
        setReqoteRfqs(reQuotes);
      } catch (error) {
        console.error('Error fetching RFQs:', error);
        toast.error('Failed to load RFQs');
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierRFQs();
  }, []);

  const handleViewDetails = (rfqId, isReqote = false, replyId = null) => {
    if (isReqote && replyId) {
      navigate(`/supplier_requote/${rfqId}?replyId=${replyId}`);
    } else {
      navigate(isReqote ? `/supplier_requote/${rfqId}` : `/supplier_initial_offer/${rfqId}`);
    }
  };

  if (loading) {
    return (
      <div>
        <Nav LogoutUser={LogoutUser} />
        <div className="container mt-4 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading your RFQs...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Nav LogoutUser={LogoutUser} />
      <div className="container mt-4">
        {reqoteRfqs.length > 0 && (
          <>
            <h2 className="mb-4">Re-quote Requests ({reqoteRfqs.length})</h2>
            <div className="row mb-5">
              {reqoteRfqs.map((rfq) => (
                <div key={`reqote-${rfq.id}`} className="col-md-6 mb-4">
                  <div className="card h-100 shadow-sm border-warning">
                    <div className="card-header bg-warning bg-opacity-25">
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">{rfq.rfqNumber}</h5>
                        <span className="badge bg-warning text-dark">Re-quote Request</span>
                      </div>
                    </div>
                    <div className="card-body">
                      <p><strong>Project Name: </strong> {rfq.projectName}</p>
                      <p><strong>No of Parts:</strong> {rfq.parts?.length || 0}</p>
                      <p>
                        <strong>Status:</strong>
                        <span className="badge ms-2 bg-warning">
                          Re-quote Requested
                        </span>
                      </p>
                      <p><strong>Submission Deadline:</strong> {new Date(rfq.submissionDate).toLocaleDateString()}</p>
                      <div className="alert alert-warning mt-2 p-2">
                        <small>
                          <i className="bi bi-exclamation-triangle-fill me-2"></i>
                          The buyer has requested an updated quote for this RFQ.
                        </small>
                      </div>
                    </div>
                    <div className="card-footer bg-white">
                      <button
                        className="btn btn-warning btn-sm me-2"
                        onClick={() => handleViewDetails(rfq.id, true, rfq.replyId)}
                      >
                        Submit Re-quote
                      </button>
                      <button className="btn btn-outline-secondary btn-sm">
                        View Documents
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className="mb-4">New RFQs ({rfqs.length})</h2>
        {rfqs.length === 0 && reqoteRfqs.length === 0 ? (
          <div className="alert alert-info">
            You have no pending RFQs or re-quote requests at this time.
          </div>
        ) : rfqs.length === 0 ? (
          <div className="alert alert-info">
            You have no new RFQs at this time.
            {reqoteRfqs.length > 0 && ' You have re-quote requests above.'}
          </div>
        ) : (
          <div className="row">
            {rfqs.map((rfq) => (
              <div key={rfq.id} className="col-md-6 mb-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-header bg-light">
                    <h5 className="mb-0">{rfq.rfqNumber}</h5>
                  </div>
                  <div className="card-body">
                    <p><strong>Project Name: </strong> {rfq.projectName}</p>
                    <p><strong>No of Parts:</strong> {rfq.parts?.length || 0}</p>
                    <p>
                      <strong>Status:</strong>
                      <span className="badge ms-2 bg-primary">
                        Pending Submission
                      </span>
                    </p>
                    <p><strong>Submission Deadline:</strong> {new Date(rfq.submissionDate).toLocaleDateString()}</p>
                  </div>
                  <div className="card-footer bg-white">
                    <button
                      className="btn btn-primary btn-sm me-2"
                      onClick={() => handleViewDetails(rfq.id)}
                    >
                      Submit Offer
                    </button>
                    <button className="btn btn-outline-secondary btn-sm">
                      View Documents
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierRFQView;