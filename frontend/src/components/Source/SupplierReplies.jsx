import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { Card, ListGroup, Spinner, Alert, Badge, Button, Table, Accordion } from "react-bootstrap";
import Nav from '../../components/Source/Nav';
import { isAuthenticated } from '../../services/Auth';
import { Logout } from '../../services/Auth';
import { useAuth } from '../../services/AuthContext';
import Page404 from '../../pages/Landingpage/Page404';
import * as XLSX from 'xlsx';

const SupplierReplies = () => {
    const { rfqId } = useParams();
    const [replies, setReplies] = useState([]);
    const [rfqDetails, setRfqDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const { isUser, isAdmin } = useAuth();
    if (!(isUser || isAdmin)) {
        return <Page404 />;
    }
    const LogoutUser = () => {
        Logout();
        navigate('/login');
    }
    if (!isAuthenticated()) {
        return <Navigate to="/login" />;
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const rfqRef = doc(db, "quotations", rfqId);
                const rfqSnap = await getDoc(rfqRef);

                if (rfqSnap.exists()) {
                    const rfqData = rfqSnap.data();
                    let buyerDetails = {
                        name: "Unknown Buyer",
                        email: "unknown@example.com"
                    };

                    if (rfqData?.createdBy) {
                        try {
                            const buyerRef = doc(db, "users", rfqData.createdBy);
                            const buyerSnap = await getDoc(buyerRef);
                            if (buyerSnap.exists()) {
                                buyerDetails = {
                                    id: rfqData.createdBy,
                                    name: buyerSnap.data().name || "Unknown Buyer",
                                    email: buyerSnap.data().email || "unknown@example.com"
                                };
                            }
                        } catch (buyerError) {
                            console.error("Error loading buyer:", buyerError);
                        }
                    } else if (rfqData.buyer) {
                        buyerDetails = {
                            name: rfqData.buyer.name || "Unknown Buyer",
                            email: rfqData.buyer.email || "unknown@example.com"
                        };
                    }

                    setRfqDetails({
                        id: rfqSnap.id,
                        ...rfqData,
                        buyer: buyerDetails
                    });
                }

                const repliesQuery = query(
                    collection(db, "supplier_replies"),
                    where("rfqId", "==", rfqId)
                );
                const repliesSnapshot = await getDocs(repliesQuery);

                const repliesData = await Promise.all(
                    repliesSnapshot.docs.map(async (replyDoc) => {
                        const replyData = {
                            id: replyDoc.id,
                            ...replyDoc.data(),
                            requotes: replyDoc.data().requotes || []
                        };

                        if (replyData.supplier?.id) {
                            try {
                                const supplierRef = doc(db, "suppliers", replyData.supplier.id);
                                const supplierSnap = await getDoc(supplierRef);

                                if (supplierSnap.exists()) {
                                    replyData.supplierDetails = supplierSnap.data();
                                }
                            } catch (supplierError) {
                                console.error("Error loading supplier:", supplierError);
                            }
                        }

                        return replyData;
                    })
                );

                setReplies(repliesData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [rfqId]);

    const formatDate = (dateString) => {
        if (!dateString) return 'Date not available';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';

            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            };
            return date.toLocaleString('en-US', options);
        } catch {
            return 'Invalid date format';
        }
    };

    const formatCurrency = (value, currency = 'INR') => {
        if (typeof value === 'string') {
            value = parseFloat(value);
        }
        if (isNaN(value)) value = 0;
        
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            currencyDisplay: 'symbol'
        }).format(value || 0);
    };

    const generateExcelReport = () => {
        const wb = XLSX.utils.book_new();
        const reportData = [];

        reportData.push(
            ["RFQ DETAILS"],
            ["Project Name:", rfqDetails.projectName],
            ["RFQ Number:", rfqDetails.rfqNumber],
            ["Buyer:", rfqDetails.buyer?.name || "N/A"],
            ["Buyer Email:", rfqDetails.buyer?.email || "N/A"],
            ["Status:", rfqDetails.status],
            ["Submission Date:", formatDate(rfqDetails.submissionDate)],
            ["Number of Parts:", rfqDetails.parts?.length || 0],
            [""],
            
        );

    

        reportData.push([""], ["SUPPLIER QUOTATIONS"], [""]);

        const quoteHeaders = [
            "Supplier Name", "MSME Status", "Quote Type", "Status", 
            "Submitted Date", "Part No", "Description", "Quantity", 
            "Currency", "Unit Rate", "Total Cost", "Sample Lead Time", 
            "Production Lead Time", "Material Cost", "Process Cost", 
            "Overheads", "Packing", "Payment Terms", "Delivery Terms", 
            "Freight Terms", "Remarks", "Changes"
        ];
        reportData.push(quoteHeaders);

        replies.forEach(reply => {
            reply.parts?.forEach((part, partIndex) => {
                reportData.push([
                    partIndex === 0 ? reply.supplier.name : "",
                    partIndex === 0 ? reply.supplier?.msmeStatus || "N/A" : "",
                    "Original",
                    partIndex === 0 ? reply.status : "",
                    partIndex === 0 ? formatDate(reply.submissionDate) : "",
                    part.partNo,
                    part.partDescription,
                    part.quantity,
                    part.currency,
                    formatCurrency(part.unitRate, part.currency),
                    formatCurrency(part.totalCost, part.currency),
                    part.sampleLeadTime,
                    part.productionLeadTime,
                    formatCurrency(part.materialCost, part.currency),
                    formatCurrency(part.processCost, part.currency),
                    formatCurrency(part.overheadCost, part.currency) || "N/A",
                    formatCurrency(part.packingCost, part.currency) || "N/A",
                    partIndex === 0 ? reply.terms?.paymentTerms || "N/A" : "",
                    partIndex === 0 ? reply.terms?.deliveryTerms || "N/A" : "",
                    partIndex === 0 ? reply.terms?.freightTerms || "N/A" : "",
                    partIndex === 0 ? reply.terms?.remarks || "None" : "",
                    "N/A"
                ]);
            });

            reply.requotes?.forEach(requote => {
                requote.parts?.forEach((part, partIndex) => {
                    const changes = [];
                    if (part.changes) {
                        if (part.changes.unitRateChanged) changes.push("Price");
                        if (part.changes.materialCostChanged) changes.push("Material");
                        if (part.changes.processCostChanged) changes.push("Process");
                        if (part.changes.overheadCostChanged) changes.push("Overhead");
                        if (part.changes.packingCostChanged) changes.push("Packing");
                        if (part.changes.leadTimeChanged) changes.push("Lead Time");
                    }

                    reportData.push([
                        partIndex === 0 ? reply.supplier.name : "",
                        partIndex === 0 ? reply.supplier?.msmeStatus || "N/A" : "",
                        "Re-quote",
                        partIndex === 0 ? requote.status : "",
                        partIndex === 0 ? formatDate(requote.submittedAt || requote.requoteDate) : "",
                        part.partNo,
                        part.partDescription,
                        part.quantity,
                        part.currency,
                        formatCurrency(part.unitRate, part.currency),
                        formatCurrency(part.totalCost, part.currency),
                        part.sampleLeadTime,
                        part.productionLeadTime,
                        formatCurrency(part.materialCost, part.currency),
                        formatCurrency(part.processCost, part.currency),
                        formatCurrency(part.overheadCost, part.currency) || "N/A",
                        formatCurrency(part.packingCost, part.currency) || "N/A",
                        partIndex === 0 ? requote.terms?.paymentTerms || "N/A" : "",
                        partIndex === 0 ? requote.terms?.deliveryTerms || "N/A" : "",
                        partIndex === 0 ? requote.terms?.freightTerms || "N/A" : "",
                        partIndex === 0 ? requote.terms?.remarks || "None" : "",
                        changes.join(", ") || "N/A"
                    ]);
                });
            });

            reportData.push([""]);
        });

        const ws = XLSX.utils.aoa_to_sheet(reportData);
        ws['!cols'] = [
            { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, 
            { wch: 18 }, { wch: 10 }, { wch: 25 }, { wch: 10 }, 
            { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, 
            { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, 
            { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
            { wch: 30 }, { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Supplier Quotes");
        const safeRfqNumber = rfqDetails.rfqNumber.replace(/[^a-zA-Z0-9-_]/g, '');
        const fileName = `RFQ_${safeRfqNumber}_Quotes_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName, { bookType: 'xlsx', type: 'array' });
    };

    const requestRequote = async (supplierId) => {
        if (!window.confirm(`Are you sure you want to request a re-quote from this supplier?`)) {
            return;
        }

        try {
            const rfqRef = doc(db, "quotations", rfqId);
            const rfqSnap = await getDoc(rfqRef);
            const rfqData = rfqSnap.data();
            
            const updateData = {
                reqote: true,
            };
            
            if (rfqData.reqoteSuppliers) {
                if (!rfqData.reqoteSuppliers.includes(supplierId)) {
                    updateData.reqoteSuppliers = [...rfqData.reqoteSuppliers, supplierId];
                }
            } else {
                updateData.reqoteSuppliers = [supplierId];
            }
            
            await updateDoc(rfqRef, updateData);
            alert(`Re-quote requested successfully from supplier`);
            
            const updatedRfqSnap = await getDoc(rfqRef);
            setRfqDetails({
                id: updatedRfqSnap.id,
                ...updatedRfqSnap.data()
            });
        } catch (error) {
            console.error("Error requesting re-quote:", error);
            alert("Failed to request re-quote. Please try again.");
        }
    };

    const renderQuoteDetails = (quote, isRequote = false) => {
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

                <div className="mb-4">
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>Part No</th>
                                <th>Description</th>
                                <th>Quantity</th>
                                <th>Unit Rate</th>
                                <th>Total Cost</th>
                                <th>Sample Lead Time</th>
                                <th>Production Lead Time</th>
                                {isRequote && quote.parts?.[0]?.changes && <th>Changes</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {quote.parts?.map((part, index) => (
                                <tr key={index}>
                                    <td>{part.partNo}</td>
                                    <td>{part.partDescription}</td>
                                    <td>{part.quantity}</td>
                                    <td>{formatCurrency(part.unitRate, quote.currency)}</td>
                                    <td>{formatCurrency(part.totalCost, quote.currency)}</td>
                                    <td>{part.sampleLeadTime} days</td>
                                    <td>{part.productionLeadTime} days</td>
                                    {isRequote && part.changes && (
                                        <td>
                                            {part.changes.unitRateChanged && <Badge bg="warning" className="me-1">Price</Badge>}
                                            {part.changes.materialCostChanged && <Badge bg="warning" className="me-1">Material</Badge>}
                                            {part.changes.processCostChanged && <Badge bg="warning" className="me-1">Process</Badge>}
                                            {part.changes.leadTimeChanged && <Badge bg="warning" className="me-1">Lead Time</Badge>}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>

                <div className="mb-4">
                    <h5>Cost Breakdown</h5>
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>Part No</th>
                                <th>Material Cost</th>
                                <th>Process Cost</th>
                                <th>Overheads</th>
                                <th>Packing</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quote.parts?.map((part, index) => (
                                <tr key={index}>
                                    <td>{part.partNo}</td>
                                    <td>{formatCurrency(part.materialCost, quote.currency)}</td>
                                    <td>{formatCurrency(part.processCost, quote.currency)}</td>
                                    <td>{formatCurrency(part.overheadCost, quote.currency) || "N/A"}</td>
                                    <td>{formatCurrency(part.packingCost, quote.currency) || "N/A"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <Card className="mb-3">
                            <Card.Header>Terms & Conditions</Card.Header>
                            <Card.Body>
                                <ListGroup variant="flush">
                                    <ListGroup.Item>
                                        <strong>Payment Terms:</strong> {quote.terms?.paymentTerms}
                                        {isRequote && quote.terms?.changes?.paymentTermsChanged && (
                                            <Badge bg="warning" className="ms-2">Changed</Badge>
                                        )}
                                    </ListGroup.Item>
                                    <ListGroup.Item>
                                        <strong>Delivery Terms:</strong> {quote.terms?.deliveryTerms}
                                        {isRequote && quote.terms?.changes?.deliveryTermsChanged && (
                                            <Badge bg="warning" className="ms-2">Changed</Badge>
                                        )}
                                    </ListGroup.Item>
                                    <ListGroup.Item>
                                        <strong>Freight Terms:</strong> {quote.terms?.freightTerms}
                                        {isRequote && quote.terms?.changes?.freightTermsChanged && (
                                            <Badge bg="warning" className="ms-2">Changed</Badge>
                                        )}
                                    </ListGroup.Item>
                                </ListGroup>
                            </Card.Body>
                        </Card>
                    </div>

                    <div className="col-md-6">
                        <Card>
                            <Card.Header>Additional Information</Card.Header>
                            <Card.Body>
                                <ListGroup variant="flush">
                                    <ListGroup.Item>
                                        <strong>Remarks:</strong> {quote.terms?.remarks || 'None'}
                                    </ListGroup.Item>
                                    {isRequote && (
                                        <ListGroup.Item>
                                            <strong>Submitted By:</strong> {quote.submittedBy?.name || "N/A"} ({quote.submittedBy?.email || "N/A"})
                                        </ListGroup.Item>
                                    )}
                                </ListGroup>
                            </Card.Body>
                        </Card>
                    </div>
                </div>
            </div>
        );
    };


    if (loading) {
        return (
            <div className="d-flex justify-content-center mt-5">
                <Spinner animation="border" />
            </div>
        );
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    if (!rfqDetails) {
        return <Alert variant="warning">RFQ not found</Alert>;
    }

    return (
        <div className="">
            <Nav LogoutUser={LogoutUser} />
            <div className="container mt-4">
                <div className="d-flex justify-content-between">
                    <Button variant="outline-secondary" onClick={() => navigate(-1)} className="mb-3">
                        ← Back to RFQs
                    </Button>
                    {replies.length > 0 && (
                        <Button className="my-1 mb-3" variant="success" onClick={generateExcelReport}>
                            📊 Generate Excel Report
                        </Button>
                    )}
                </div>

                <Card className="mb-4">
                    <Card.Body>
                        <Card.Title>
                            {rfqDetails.projectName || 'RFQ Details'} - {rfqDetails.rfqNumber}
                        </Card.Title>
                        <Card.Subtitle className="mb-2 text-muted">
                            {rfqDetails.parts?.length || 0} Part(s) | Buyer: {rfqDetails.buyer?.name || "Unknown Buyer"}
                        </Card.Subtitle>
                        <div className="d-flex gap-3 flex-wrap">
                            <span>Status: <Badge bg={rfqDetails.status === 'open' ? 'success' : 'secondary'}>
                                {rfqDetails.status}
                            </Badge></span>
                            <span>Submission Date: {formatDate(rfqDetails.submissionDate)}</span>
                            {rfqDetails.reqote && (
                                <span>Re-quote: <Badge bg="warning" text="dark">Requested</Badge></span>
                            )}
                        </div>
                    </Card.Body>
                </Card>
                
                <h3 className="mb-3">Supplier Replies ({replies.length})</h3>

                {replies.length === 0 ? (
                    <Alert variant="info">No replies yet</Alert>
                ) : (
                    <ListGroup>
                        {replies.map(reply => (
                            <ListGroup.Item key={reply.id} className="mb-4">
                                <Card>
                                    <Card.Body>
                                        <div className="d-flex justify-content-between mb-3">
                                            <div>
                                                <Card.Title>{reply.supplier.name}</Card.Title>
                                                <div className="text-muted small">
                                                    <div>MSME Status: <Badge bg="secondary">{reply.supplier?.msmeStatus || "N/A"}</Badge></div>
                                                    {reply.supplierDetails && (
                                                        <>
                                                            <div>Email: {reply.supplierDetails.email || 'N/A'}</div>
                                                            <div>Phone: {reply.supplierDetails.phone || 'N/A'}</div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <div className="mx-4">
                                                    <strong>Submitted:</strong> {formatDate(reply.submissionDate)}
                                                </div>
                                                <Badge bg={
                                                    reply.status === 'accepted' ? 'success' :
                                                        reply.status === 'rejected' ? 'danger' :
                                                            'warning'
                                                }>
                                                    {reply.status || 'pending'}
                                                </Badge>
                                                {(
                                                    <Button 
                                                        variant="outline-primary" 
                                                        className="ms-3"
                                                        onClick={() => requestRequote(reply.supplier.id)}
                                                        disabled={rfqDetails.reqoteSuppliers?.includes(reply.supplier.id)}
                                                    >
                                                        {rfqDetails.reqoteSuppliers?.includes(reply.supplier.id) 
                                                            ? "Re-quote Requested" 
                                                            : "Request Re-quote"}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {renderQuoteDetails(reply)}

                                        {reply.requotes && reply.requotes.length > 0 && (
                                            <Accordion defaultActiveKey="0" className="mt-4">
                                                <Accordion.Item eventKey="0">
                                                    <Accordion.Header>
                                                        <h5 className="mb-0">
                                                            Re-quotes ({reply.requotes.length})
                                                        </h5>
                                                    </Accordion.Header>
                                                    <Accordion.Body>
                                                        {reply.requotes.map((requote, index) => (
                                                            <div key={index} className="mb-4">
                                                                {renderQuoteDetails(requote, true)}
                                                            </div>
                                                        ))}
                                                    </Accordion.Body>
                                                </Accordion.Item>
                                            </Accordion>
                                        )}
                                    </Card.Body>
                                </Card>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                )}
            </div>
        </div>
    );
};

export default SupplierReplies;