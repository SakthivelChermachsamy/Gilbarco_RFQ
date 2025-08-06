import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import axios from "axios";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import "../../css/Reply.css";

const Reply = () => {
    const [recentReplies, setRecentReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const repliesQuery = query(
                    collection(db, "supplier_replies"),
                    orderBy("submissionDate", "desc"),
                    limit(3) 
                );
                const repliesSnapshot = await getDocs(repliesQuery);
                const repliesData = repliesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                const user = auth.currentUser;
                if (!user) throw new Error("User not authenticated");
                const token = await user.getIdToken();
                
                const response = await axios.get("http://localhost:3000/api/quotations", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!Array.isArray(response.data)) {
                    throw new Error("Invalid quotations data format");
                }

             
                const seenRfqIds = new Set();
                const combinedData = repliesData
                    .map(reply => {
                        const matchingQuotation = response.data.find(
                            q => q.id === reply.rfqId
                        );
                        return {
                            reply,
                            replyDate: reply.submissionDate?.toDate 
                                ? reply.submissionDate.toDate() 
                                : new Date(reply.submissionDate),
                            rfq: matchingQuotation || { id: reply.rfqId }
                        };
                    })
                    .filter(item => item.rfq)
                    .filter(item => {
                        if (seenRfqIds.has(item.rfq.id)) {
                            return false;
                        }
                        seenRfqIds.add(item.rfq.id);
                        return true;
                    })
                    .slice(0, 3);

                setRecentReplies(combinedData);
            } catch (err) {
                setError(err.message);
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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
            case 'completed': return 'success';
            case 'approved': return 'primary';
            case 'rejected': return 'danger';
            default: return 'secondary';
        }
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
                    <i className="bi bi-inbox-fill text-primary me-2"></i>
                    Recent Supplier Replies
                </h2>
                <Link to="/suppliers-reply" className="btn btn-sm btn-outline-primary">
                    View All <i className="bi bi-arrow-right ms-1"></i>
                </Link>
            </div>
            
            {recentReplies.length === 0 ? (
                <div className="dashboard-empty-state text-center py-5 rounded-3 bg-light">
                    <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                    <h5 className="mt-3">No replies found</h5>
                    <p className="text-muted">Supplier replies will appear here when available</p>
                </div>
            ) : (
                <div className="row g-4">
                    {recentReplies.map((item, index) => (
                        <div className="col-12 col-md-6 col-xl-4" key={`${item.reply.id}-${index}`}>
                            <div className="dashboard-card card h-100 border-0 shadow-sm hover-lift">
                                <div className="card-body d-flex flex-column border border-1">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <Badge 
                                                bg={getStatusVariant(item.rfq.status)} 
                                                className="text-capitalize rounded-pill px-3 py-2"
                                            >
                                                {item.rfq.status || 'N/A'}
                                            </Badge>
                                        </div>
                                        <small className="text-muted fw-semibold">
                                            #{item.rfq.rfqNumber || index + 1}
                                        </small>
                                    </div>
                                    
                                    <h5 className="card-title mb-3 text-truncate">
                                        {item.rfq.projectName || 'No description provided'}
                                    </h5>
                                    
                                    <div className="dashboard-card-details mb-4">
                                        <div className="detail-item">
                                            <i className="bi bi-box-seam text-muted"></i>
                                            <span>No of Parts: {item.rfq.parts.length || 'N/A'}</span>
                                        </div>
                                        
                                        <div className="detail-item">
                                            <i className="bi bi-calendar text-muted"></i>
                                            <span>{formatDate(item.replyDate)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto">
                                        <Link 
                                            to={`/supplier-replies/${item.rfq.id}`}
                                            className="btn btn-primary w-100 d-flex align-items-center justify-content-center py-2"
                                        >
                                            <i className="bi bi-eye-fill me-2"></i>
                                            View Details
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

export default Reply;