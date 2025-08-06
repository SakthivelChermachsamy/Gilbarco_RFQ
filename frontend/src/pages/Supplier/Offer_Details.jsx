import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import Nav from '../../components/Supplier/Nav';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from '../../services/AuthContext';
import { Logout, isAuthenticated } from '../../services/Auth';
import { Accordion, Badge } from 'react-bootstrap';

const SupplierOfferDetails = () => {
    const { vendorId, role } = useAuth();
    const { replyId } = useParams();
    const navigate = useNavigate();
    const [rfqDetails, setRfqDetails] = useState(null);
    const [offerDetails, setOfferDetails] = useState(null);
    const [buyer, setBuyer] = useState(null);
    const [loading, setLoading] = useState(true);

    const getCurrencySymbol = (currencyCode) => {
        switch (currencyCode) {
            case 'INR': return '₹';
            case 'USD': return '$';
            case 'EUR': return '€';
            case 'AUD': return 'A$';
            default: return '₹';
        }
    };

    const formatCurrency = (value, currencyCode = 'INR') => {
        if (value === null || value === undefined || value === '') {
            return `${getCurrencySymbol(currencyCode)}0.00`;
        }

        const numericValue = typeof value === 'string' ? parseFloat(value) : Number(value);
        if (isNaN(numericValue)) {
            return `${getCurrencySymbol(currencyCode)}0.00`;
        }

        if (currencyCode === 'INR') {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
                currencyDisplay: 'symbol'
            }).format(numericValue).replace('₹', getCurrencySymbol(currencyCode));
        }

        return `${getCurrencySymbol(currencyCode)}${numericValue.toFixed(2)}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';

            return date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Invalid date';
        }
    };

    const LogoutUser = () => {
        Logout();
        navigate('/login');
    };

    if (role !== 'supplier') {
        return <Navigate to="/404" />;
    }

    if (!isAuthenticated()) {
        return <Navigate to="/login" />;
    }

    useEffect(() => {
        const fetchOfferDetails = async () => {
            try {
                const replyDoc = await getDoc(doc(db, 'supplier_replies', replyId));
                if (!replyDoc.exists()) {
                    toast.error('Offer not found');
                    navigate('/supplier/rfqs');
                    return;
                }

                const replyData = replyDoc.data();
                setOfferDetails(replyData);

                const rfqDoc = await getDoc(doc(db, 'quotations', replyData.rfqId));
                if (!rfqDoc.exists()) {
                    toast.error('RFQ not found');
                    return;
                }

                const rfqData = rfqDoc.data();
                setRfqDetails(rfqData);

                const buyerDoc = await getDoc(doc(db, 'users', rfqData.createdBy));
                if (buyerDoc.exists()) {
                    setBuyer(buyerDoc.data());
                }

            } catch (error) {
                toast.error('Failed to load offer details');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchOfferDetails();
    }, [replyId, navigate]);

    const getOrderTypeForPart = (partNo) => {
        const rfqPart = rfqDetails?.parts?.find(p => p.partNo === partNo);
        return rfqPart?.orderType || 'Not specified';
    };

    const renderQuoteDetails = (quote, isRequote = false) => {
        const currency = quote.currency || 'INR';
        
        return (
            <div className={isRequote ? "mt-4 border-top pt-3" : ""}>
                {isRequote && (
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="text-primary">Re-quote Submission</h5>
                        <div>
                            <Badge bg="info" className="me-2">
                                Submitted: {formatDate(quote.submittedAt || quote.requoteDate)}
                            </Badge>
                            <Badge bg="warning">
                                {quote.status.replace('_', ' ')}
                            </Badge>
                        </div>
                    </div>
                )}

                <div className="card mb-4">
                    <div className="card-header bg-light">
                        <h5 className="mb-0">Part Details</h5>
                    </div>
                    <div className="card-body">
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover">
                                <thead className="table-light">
                                    <tr>
                                        <th>Part No</th>
                                        <th>Description</th>
                                        <th>Order Type</th>
                                        <th>Quantity</th>
                                        <th>Unit Rate</th>
                                        <th>Total Cost</th>
                                        {isRequote && quote.parts?.[0]?.changes && <th>Changes</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {quote.parts?.map((part, index) => (
                                        <tr key={index}>
                                            <td>{part.partNo}</td>
                                            <td>{part.partDescription}</td>
                                            <td>{getOrderTypeForPart(part.partNo)}</td>
                                            <td>{part.quantity}</td>
                                            <td>{formatCurrency(part.unitRate, part.currency || currency)}</td>
                                            <td>{formatCurrency(part.totalCost, part.currency || currency)}</td>
                                            {isRequote && part.changes && (
                                                <td>
                                                    {part.changes.unitRateChanged && <Badge bg="warning" className="me-1">Price</Badge>}
                                                    {part.changes.materialCostChanged && <Badge bg="warning" className="me-1">Material</Badge>}
                                                    {part.changes.processCostChanged && <Badge bg="warning" className="me-1">Process</Badge>}
                                                    {part.changes.packingCostChanged && <Badge bg="warning" className="me-1">Packing</Badge>}
                                                    {part.changes.overheadCostChanged && <Badge bg="warning" className="me-1">Overhead</Badge>}
                                                    {part.changes.leadTimeChanged && <Badge bg="warning" className="me-1">Lead Time</Badge>}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="card mb-4">
                    <div className="card-header bg-light">
                        <h5 className="mb-0">Cost Breakdown</h5>
                    </div>
                    <div className="card-body">
                        <div className="table-responsive">
                            <table className="table table-bordered">
                                <thead className="table-light">
                                    <tr>
                                        <th>Part No</th>
                                        <th>Material Cost</th>
                                        <th>Process Cost</th>
                                        <th>Overhead</th>
                                        <th>Packing</th>
                                        <th>Sample LT (Days)</th>
                                        <th>Production LT (Days)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quote.parts?.map((part, index) => (
                                        <tr key={index}>
                                            <td>{part.partNo}</td>
                                            <td>{formatCurrency(part.materialCost, part.currency || currency)}</td>
                                            <td>{formatCurrency(part.processCost, part.currency || currency)}</td>
                                            <td>{formatCurrency(part.overheadCost, part.currency || currency)}</td>
                                            <td>{formatCurrency(part.packingCost, part.currency || currency)}</td>
                                            <td>{part.sampleLeadTime}</td>
                                            <td>{part.productionLeadTime}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                {quote.parts.some(part => part.toolCost) && (
                    <div className="card mb-4">
                        <div className="card-header bg-light">
                            <h5 className="mb-0">Tooling Details</h5>
                        </div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-bordered">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Part No</th>
                                            <th>Tool Cost</th>
                                            <th>Tool Lead Time</th>
                                            <th>Tool Cavity</th>
                                            <th>Tool Life (Shots)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quote.parts.map((part, index) => (
                                            part.toolCost ? (
                                                <tr key={index}>
                                                    <td>{part.partNo}</td>
                                                    <td>{formatCurrency(part.toolCost, part.currency || currency)}</td>
                                                    <td>{part.toolLeadTime} days</td>
                                                    <td>{part.toolCavity}</td>
                                                    <td>{part.toolLife}</td>
                                                </tr>
                                            ) : null
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                <div className="row">
                    <div className="col-md-6">
                        <div className="card mb-4">
                            <div className="card-header bg-light">
                                <h5 className="mb-0">Terms & Conditions</h5>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-12 mb-3">
                                        {!isRequote && <p><strong>MSME Status:</strong> {quote.supplier?.msmeStatus}</p>}
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <p>
                                            <strong>Payment Terms:</strong> {quote.terms?.paymentTerms}
                                            {isRequote && quote.terms?.changes?.paymentTermsChanged && (
                                                <Badge bg="warning" className="ms-2">Changed</Badge>
                                            )}
                                        </p>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <p>
                                            <strong>Delivery Terms:</strong> {quote.terms?.deliveryTerms}
                                            {isRequote && quote.terms?.changes?.deliveryTermsChanged && (
                                                <Badge bg="warning" className="ms-2">Changed</Badge>
                                            )}
                                        </p>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <p>
                                            <strong>Freight Terms:</strong> {quote.terms?.freightTerms}
                                            {isRequote && quote.terms?.changes?.freightTermsChanged && (
                                                <Badge bg="warning" className="ms-2">Changed</Badge>
                                            )}
                                        </p>
                                    </div>
                                    <div className="col-12">
                                        <p><strong>Remarks:</strong> {quote.terms?.remarks || 'None'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-header bg-light">
                                <h5 className="mb-0">Attachments</h5>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-12 mb-3">
                                        <p><strong>Drawing File:</strong></p>
                                        {rfqDetails.drawingFile ? (
                                            <a
                                                href={rfqDetails.drawingFile}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-outline-primary btn-sm"
                                            >
                                                <i className="bi bi-download me-2"></i>Download Drawing
                                            </a>
                                        ) : (
                                            <span className="text-muted">No drawing file available</span>
                                        )}
                                    </div>
                                    <div className="col-12 mb-3">
                                        <p><strong>Cost Breakup File:</strong></p>
                                        {quote.attachments?.breakupFile ? (
                                            <a
                                                href={quote.attachments.breakupFile}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-outline-primary btn-sm"
                                            >
                                                <i className="bi bi-download me-2"></i>Download Breakup
                                            </a>
                                        ) : (
                                            <span className="text-muted">No breakup file provided</span>
                                        )}
                                    </div>
                                    <div className="col-12">
                                        <p><strong>Note from Sourcing:</strong> {rfqDetails.comments || 'Nil'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!rfqDetails || !offerDetails) {
        return <div className="alert alert-danger">Offer details not found</div>;
    }

    const currency = offerDetails.currency || 'INR';
    const currencySymbol = getCurrencySymbol(currency);

    return (
        <>
            <Nav LogoutUser={LogoutUser} />
            <div className="container pb-4">
                <div className="d-flex justify-content-between align-items-center p-3">
                    <h3>Offer Details</h3>
                    <div>
                        <span className="me-3"><strong>Currency:</strong> {currency} ({currencySymbol})</span>
                        <button
                            className="btn btn-outline-secondary"
                            onClick={() => navigate('/allrfq')}
                        >
                            <i className="bi bi-arrow-left me-2"></i>Back to RFQs
                        </button>
                    </div>
                </div>
                <div className="card mb-4">
                    <div className="card-body">
                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <p><strong>RFQ Number:</strong> {rfqDetails.rfqNumber}</p>
                                <p><strong>Vendor Code:</strong> {vendorId || 'N/A'}</p>
                            </div>
                            <div className="col-md-4 mb-3">
                                <p><strong>Submission Date:</strong> {formatDate(offerDetails.submissionDate)}</p>
                                <p>
                                    <strong>Status:</strong>
                                    <span className={`badge ms-2 ${offerDetails.status === 'submitted' ? 'bg-success' :
                                        offerDetails.status === 'rejected' ? 'bg-danger' :
                                            'bg-warning'
                                        }`}>
                                        {offerDetails.status}
                                    </span>
                                </p>
                            </div>
                            <div className="col-md-4 mb-3">
                                <p><strong>Buyer Name:</strong> {buyer?.name || 'N/A'}</p>
                                <p><strong>Buyer Email:</strong> {buyer?.email || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                {renderQuoteDetails(offerDetails)}
                {offerDetails.requotes && offerDetails.requotes.length > 0 && (
                    <Accordion defaultActiveKey="0" className="mt-4">
                        <Accordion.Item eventKey="0">
                            <Accordion.Header>
                                <h5 className="mb-0">
                                    Re-quotes ({offerDetails.requotes.length})
                                </h5>
                            </Accordion.Header>
                            <Accordion.Body>
                                {offerDetails.requotes.map((requote, index) => (
                                    <div key={index} className="mb-4">
                                        {renderQuoteDetails(requote, true)}
                                    </div>
                                ))}
                            </Accordion.Body>
                        </Accordion.Item>
                    </Accordion>
                )}
            </div>
        </>
    );
};

export default SupplierOfferDetails;