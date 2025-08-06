import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Form from 'react-bootstrap/Form';
import Pagination from 'react-bootstrap/Pagination';
import { Link } from 'react-router-dom';
import '../../css/Reply.css';

const SupplierRFQList = () => {
    const [rfqs, setRfqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(8);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchSupplierRFQs = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const user = auth.currentUser;
                if (!user) {
                    throw new Error('Supplier not authenticated');
                }

                const rfqsRef = collection(db, 'supplier_replies');
                const q = query(
                    rfqsRef, 
                    where('supplier.id', '==', user.uid),
                    orderBy("submissionDate", "desc"),
                    limit(4)
                );

                const querySnapshot = await getDocs(q);

                const rfqData = await Promise.all(querySnapshot.docs.map(async (supplierReplyDoc) => {
                    const replyData = supplierReplyDoc.data();
                    let rfqDetails = {};
                    
                    if (replyData.rfqId) {
                        const rfqDocRef = doc(db, 'quotations', replyData.rfqId);
                        const rfqDoc = await getDoc(rfqDocRef);
                        if (rfqDoc.exists()) {
                            rfqDetails = rfqDoc.data();
                        }
                    }

                    return {
                        id: supplierReplyDoc.id,
                        ...replyData,
                        replyId: supplierReplyDoc.id,
                        rfqNumber: rfqDetails.rfqNumber || replyData.rfqNumber || 'N/A',
                        NoOfparts: rfqDetails.parts.length || 'N/A',
                        projectName: rfqDetails.projectName || 'N/A',
                        submissionDate: rfqDetails.submissionDate?.toDate 
                            ? rfqDetails.submissionDate.toDate() 
                            : new Date(replyData.submissionDate),
                        status: replyData.status || 'pending'
                    };
                }));

                setRfqs(rfqData);
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

    const getStatusVariant = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'submitted': return 'success';
            case 'approved': return 'primary';
            case 'rejected': return 'danger';
            default: return 'secondary';
        }
    };

    const filteredRfqs = rfqs.filter(rfq =>
        rfq.rfqNumber?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfq.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredRfqs.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredRfqs.length / itemsPerPage);

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
                    <i className="bi bi-list-check text-primary me-2"></i>
                    My Submitted RFQs
                </h2>
                <div className="d-flex align-items-center">
                    <Form.Control
                        type="search"
                        placeholder="Search RFQs..."
                        className="me-3"
                        style={{ width: '250px' }}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        value={searchTerm}
                    />
                    <Badge bg="light" text="dark" className="fs-6">
                        Total: {filteredRfqs.length}
                    </Badge>
                </div>
            </div>

            {filteredRfqs.length === 0 ? (
                <div className="dashboard-empty-state text-center py-5 rounded-3 bg-light">
                    <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                    <h5 className="mt-3">No RFQs found</h5>
                    <p className="text-muted">
                        {searchTerm ? 'No matches for your search' : 'You have not submitted any RFQs yet'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="row g-4 mb-4">
                        {currentItems.map((rfq) => (
                            <div className="col-12 col-md-6 col-xl-4" key={rfq.id}>
                                <div className="dashboard-card card h-100 border-0 shadow-sm hover-lift">
                                    <div className="card-body d-flex flex-column border border-1">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <Badge 
                                                    bg={getStatusVariant(rfq.status)} 
                                                    className="text-capitalize rounded-pill px-3 py-2"
                                                >
                                                    {rfq.status}
                                                </Badge>
                                            </div>
                                            <small className="text-muted fw-semibold">
                                                {rfq.rfqNumber || 'N/A'}
                                            </small>
                                        </div>
                                        
                                        <h5 className="card-title mb-3 text-truncate">
                                            {rfq.projectName || 'No description provided'}
                                        </h5>
                                        
                                        <div className="dashboard-card-details mb-4">
                                            <div className="detail-item">
                                                <i className="bi bi-box-seam text-muted"></i>
                                                <span>No Of Parts: {rfq.NoOfparts || 'N/A'}</span>
                                            </div>
                                            <div className="detail-item">
                                                <i className="bi bi-calendar text-muted"></i>
                                                <span>Submitted: {formatDate(rfq.submissionDate)}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-auto d-flex">
                                            <Link 
                                                to={`/offer_details/${rfq.replyId}`}
                                                className="btn btn-primary flex-grow-1 me-2 d-flex align-items-center justify-content-center py-2"
                                            >
                                                <i className="bi bi-eye-fill me-2"></i>
                                                View Details
                                            </Link>
                                            <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center py-2">
                                                <i className="bi bi-file-earmark-text me-2"></i>
                                                Docs
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="d-flex justify-content-center">
                            <Pagination>
                                <Pagination.Prev 
                                    disabled={currentPage === 1} 
                                    onClick={() => setCurrentPage(currentPage - 1)} 
                                />
                                
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <Pagination.Item
                                        key={i + 1}
                                        active={i + 1 === currentPage}
                                        onClick={() => setCurrentPage(i + 1)}
                                    >
                                        {i + 1}
                                    </Pagination.Item>
                                ))}
                                
                                <Pagination.Next 
                                    disabled={currentPage === totalPages} 
                                    onClick={() => setCurrentPage(currentPage + 1)} 
                                />
                            </Pagination>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SupplierRFQList;