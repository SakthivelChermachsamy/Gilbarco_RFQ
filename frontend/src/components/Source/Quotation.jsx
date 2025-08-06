import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import "../../css/Quotations.css";

export default function Quotations() {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchQuotations = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const q = query(
                    collection(db, "quotations"),
                    orderBy("createdAt", "desc"),
                    limit(3) 
                );
                
                const querySnapshot = await getDocs(q);
                const latestQuotations = querySnapshot.docs.map((doc, index) => ({
                    id: doc.id,
                    sno: index + 1,
                    noparts:doc.data().parts?.length || 0,
                    nosuppliers:doc.data().suppliers?.length || 0,
                    projectName: doc.data().projectName,
                    submissionDate: doc.data().submissionDate?.toDate 
                        ? doc.data().submissionDate.toDate() 
                        : new Date(doc.data().submissionDate),
                    rfqNumber: doc.data().rfqNumber,
                    status: doc.data().status || 'pending'
                }));
                
                setQuotations(latestQuotations);
            } catch (error) {
                console.error("Error fetching quotations:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchQuotations();
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
        <div className="dashboard-quotations-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="dashboard-section-title mb-0">
                    <i className="bi bi-file-earmark-text-fill text-primary me-2"></i>
                    Recent Quotations
                </h2>
                <Link to="/quotations" className="btn btn-sm btn-outline-primary">
                    View All <i className="bi bi-arrow-right ms-1"></i>
                </Link>
            </div>
            
            {quotations.length === 0 ? (
                <div className="dashboard-empty-state text-center py-5 rounded-3 bg-light">
                    <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                    <h5 className="mt-3">No quotations found</h5>
                    <p className="text-muted">Quotations will appear here when available</p>
                </div>
            ) : (
                <div className="row g-4">
                    {quotations.map((item) => (
                        <div className="col-12 col-md-6 col-xl-4" key={item.id}>
                            <div className="dashboard-card card h-100 border-0 shadow-sm hover-lift">
                                <div className="card-body d-flex flex-column border border-1">
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                            <Badge 
                                                bg={getStatusVariant(item.status)} 
                                                className="text-capitalize rounded-pill px-3 py-2"
                                            >
                                                {item.status}
                                            </Badge>
                                        </div>
                                        <small className="text-muted fw-semibold">
                                            {item.rfqNumber || item.sno}
                                        </small>
                                    </div>
                                    
                                    <h5 className="card-title mb-3 text-truncate">
                                        Project Name : {item.projectName || 'No project name provided'}
                                    </h5>
                                    
                                    <div className="dashboard-card-details mb-4">
                                        <div className="detail-item">
                                            <i className="bi bi-box-seam  text-muted"></i>
                                            <span>No of Parts: {item.noparts || 'N/A'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <i className="bi bi-tag text-muted"></i>
                                            <span>No of Suppliers: {item.nosuppliers || 'N/A'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <i className="bi bi-calendar text-muted"></i>
                                            <span>{formatDate(item.submissionDate)}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-auto">
                                        <Link 
                                            to={`/quotations/${item.id}`}
                                            className="btn btn-primary w-100 d-flex align-items-center justify-content-center py-2"
                                        >
                                            <i className="bi bi-eye-fill me-2"></i>
                                            View Document
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
}