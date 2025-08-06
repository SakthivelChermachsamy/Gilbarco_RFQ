import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { Link } from 'react-router-dom';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import '../../css/Reply.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const PendingEnquiry = () => {
    const [rfqs, setRfqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentSupplierId, setCurrentSupplierId] = useState('');

    useEffect(() => {
        const fetchSupplierRFQs = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('Supplier not authenticated');
                }
                setCurrentSupplierId(user.uid);

                const rfqsRef = collection(db, 'quotations');
                const rfqsQuery = query(
                    rfqsRef,
                    where('suppliers', 'array-contains', user.uid),
                    where('status', '==', 'pending')
                );
                const rfqsSnapshot = await getDocs(rfqsQuery);

                const repliesRef = collection(db, 'supplier_replies');
                const repliesQuery = query(
                    repliesRef,
                    where('supplier.id', '==', user.uid),
                );
                const repliesSnapshot = await getDocs(repliesQuery);

                const submittedRfqIds = repliesSnapshot.docs.map(doc => doc.data().rfqId);

                const filteredRfqs = rfqsSnapshot.docs
                    .filter(doc => !submittedRfqIds.includes(doc.id))
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        submissionDate: doc.data().submissionDate?.toDate 
                            ? doc.data().submissionDate.toDate() 
                            : new Date(doc.data().submissionDate)
                    }));

                setRfqs(filteredRfqs);
            } catch (err) {
                setError(err.message);
                console.error('Error fetching RFQs:', err);
                toast.error('Failed to load RFQs');
            } finally {
                setLoading(false);
            }
        };

        fetchSupplierRFQs();
    }, []);

    const formatDate = (date) => {
        if (!date || isNaN(date.getTime())) return '--/--/----';
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
                <Spinner animation="border" variant="primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className="my-3 rounded-3 shadow-sm">
                <Alert.Heading className="d-flex align-items-center">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Error Loading Data
                </Alert.Heading>
                <p className="mb-0">{error}</p>
            </Alert>
        );
    }

    return (
        <div className="dashboard-reply-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="dashboard-section-title mb-0">
                    <i className="bi bi-hourglass-split text-warning me-2"></i>
                    Pending RFQs ({rfqs.length})
                </h2>
            </div>
            
            {rfqs.length === 0 ? (
                <div className="dashboard-empty-state text-center py-5 rounded-3 bg-light">
                    <i className="bi bi-check-circle text-success" style={{ fontSize: '3rem' }}></i>
                    <h5 className="mt-3">No pending RFQs</h5>
                    <p className="text-muted">All assigned RFQs have been submitted</p>
                </div>
            ) : (
                <div className="row g-4">
                    {rfqs.map((rfq, index) => (
                        <div className="col-12 col-md-6 col-xl-4" key={rfq.id}>
                            <div className="dashboard-card card h-100 border-0 shadow-sm hover-lift">
                                <div className="card-body d-flex flex-column border border-1">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <Badge 
                                                bg="warning" 
                                                className="text-capitalize rounded-pill px-3 py-2"
                                            >
                                                Pending Submission
                                            </Badge>
                                        </div>
                                        <small className="text-muted fw-semibold">
                                            {rfq.rfqNumber || index + 1}
                                        </small>
                                    </div>
                                    
                                    <h5 className="card-title mb-3 text-truncate">
                                        Project Name : {rfq.projectName || 'No description provided'}
                                    </h5>
                                    
                                    <div className="dashboard-card-details mb-4">
                                        <div className="detail-item">
                                            <i className="bi bi-box-seam text-muted"></i>
                                            <span>No of Parts: {rfq.parts?.length || 'N/A'}</span>
                                        </div>
                                        
                                        <div className="detail-item">
                                            <i className="bi bi-calendar text-muted"></i>
                                            <span>Due: {formatDate(rfq.submissionDate)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto">
                                        <Link 
                                            to={`/supplier_initial_offer/${rfq.id}`}
                                            className="btn btn-primary w-100 d-flex align-items-center justify-content-center py-2"
                                        >
                                            <i className="bi bi-pencil-square me-2"></i>
                                            Submit Offer
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PendingEnquiry;