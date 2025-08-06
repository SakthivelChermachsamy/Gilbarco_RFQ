import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
    Card,
    Spinner,
    Alert,
    Badge,
    Form,
    InputGroup,
    Container,
    Row,
    Col,
    Pagination,
    Button,
    Dropdown
} from "react-bootstrap";
import {
    FiSearch,
    FiClock,
    FiCheckCircle,
    FiDollarSign,
    FiPackage,
    FiFilter,
    FiChevronRight,
    FiChevronLeft,
    FiDownload,
    FiFileText
} from "react-icons/fi";
import { Navigate, useNavigate } from 'react-router-dom';
import Nav from '../../components/Source/Nav';
import { isAuthenticated } from '../../services/Auth';
import { Logout } from '../../services/Auth';
import { useAuth } from '../../services/AuthContext';
import Page404 from '../Landingpage/Page404';
import * as XLSX from 'xlsx';

const RFQRepliesPage = () => {
    const [rfqs, setRfqs] = useState([]);
    const [filteredRfqs, setFilteredRfqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(8);
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");
    const [generatingReport, setGeneratingReport] = useState(false);
    const navigate = useNavigate();

    const { isUser, isAdmin } = useAuth();
    if (!(isUser || isAdmin)) {
        return <Page404 />
    }
    const LogoutUser = () => {
        Logout();
        navigate('/login');
    }
    if (!isAuthenticated()) {
        return <Navigate to="/login" />
    }

    useEffect(() => {
        const fetchRFQs = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "quotations"));
                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setRfqs(data);
                setFilteredRfqs(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchRFQs();
    }, []);

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
    useEffect(() => {
        let result = rfqs;

        if (searchTerm.trim() !== "") {
            const lowercasedSearch = searchTerm.toLowerCase();
            result = result.filter(rfq =>
                rfq.id.toLowerCase().includes(lowercasedSearch) ||
                rfq.partDescription?.toLowerCase().includes(lowercasedSearch) ||
                rfq.partNo?.toLowerCase().includes(lowercasedSearch) ||
                rfq.rfqNumber?.toLowerCase().includes(lowercasedSearch)
            );
        }

        if (statusFilter !== "all") {
            result = result.filter(rfq =>
                rfq.status?.toLowerCase() === statusFilter.toLowerCase()
            );
        }

        setFilteredRfqs(result);
        setCurrentPage(1);
    }, [searchTerm, rfqs, statusFilter]);

    const fetchSupplierReplies = async (rfqId) => {
        try {
            const repliesQuery = query(
                collection(db, "supplier_replies"),
                where("rfqId", "==", rfqId)
            );
            const repliesSnapshot = await getDocs(repliesQuery);
            return repliesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (err) {
            console.error("Error fetching replies for RFQ:", rfqId, err);
            return [];
        }
    };

    const fetchSupplierDetails = async (supplierId) => {
        try {
            if (!supplierId) return null;
            const supplierQuery = query(collection(db, "suppliers"), where("__name__", "==", supplierId));
            const supplierSnapshot = await getDocs(supplierQuery);
            if (!supplierSnapshot.empty) {
                return {
                    id: supplierSnapshot.docs[0].id,
                    ...supplierSnapshot.docs[0].data()
                };
            }
            return null;
        } catch (err) {
            console.error("Error fetching supplier details:", err);
            return null;
        }
    };
    const fetchUserDetails = async (userId) => {
        try {
            if (!userId) return null;
            const userQuery = query(collection(db, "users"), where("__name__", "==", userId));
            const userSnapshot = await getDocs(userQuery);
            if (!userSnapshot.empty) {
                return {
                    id: userSnapshot.docs[0].id,
                    ...userSnapshot.docs[0].data()
                };
            }
            return null;
        } catch (err) {
            console.error("Error fetching user details:", err);
            return null;
        }
    };
    const generateExcelReport = async () => {
        setGeneratingReport(true);
        setError(null);

        try {
            
            const rfqsWithReplies = await Promise.all(
                filteredRfqs.map(async (rfq) => {
                    const replies = await fetchSupplierReplies(rfq.id);
                    const repliesWithSupplierDetails = await Promise.all(
                        replies.map(async (reply) => {
                            const supplierDetails = await fetchSupplierDetails(reply.supplier?.id);
                            return {
                                ...reply,
                                supplierDetails
                            };
                        })
                    );
                    const creatorDetails = await fetchUserDetails(rfq.createdBy);
                    return {
                        ...rfq,
                        replies: repliesWithSupplierDetails,
                        creatorDetails
                    };
                })
            );

           
            const reportData = rfqsWithReplies.flatMap(rfq => {
                const cleanData = (value) => {
                    if (value === undefined || value === null) return 'N/A';
                    if (typeof value === 'string') return value.trim();
                    if (value instanceof Date) return value.toISOString().split('T')[0];
                    return value;
                };

                if (rfq.replies && rfq.replies.length > 0) {
                    return rfq.replies.flatMap(reply => {
                        return reply.parts?.map(part => ({
                            'RFQ Number': cleanData(rfq.rfqNumber),
                            'Project Name': cleanData(rfq.projectName),
                            'RFQ Status': cleanData(rfq.status),
                            'RFQ Submission Date': cleanData(rfq.submissionDate),

                            'Creator Name': cleanData(rfq.creatorDetails?.name),
                            'Creator Email': cleanData(rfq.creatorDetails?.email),

                            'Supplier ID': cleanData(reply.supplierDetails?.vendorId),
                            'Supplier Name': cleanData(reply.supplier?.name),
                            'Supplier Email': cleanData(reply.supplierDetails?.email),
                            'Supplier Phone': cleanData(reply.supplierDetails?.phone),
                            'Supplier MSME Status': cleanData(reply.supplier?.msmeStatus),

                            'Part No': cleanData(part.partNo),
                            'Part Description': cleanData(part.partDescription),
                            'Part Qty': cleanData(part.quantity),
                            'Order Type': cleanData(part.orderType),

                            'Unit Rate': cleanData(part.unitRate),
                            'Total Cost': cleanData(part.totalCost),
                            'Currency': cleanData(reply.currency || rfq.currency),

                            'Sample Lead Time (Days)': cleanData(part.sampleLeadTime),
                            'Production Lead Time (Days)': cleanData(part.productionLeadTime),

                            'Material Cost': cleanData(part.materialCost || 'NA'),
                            'Process Cost': cleanData(part.processCost || 'NA'),
                            'Overheads': cleanData(part.overheadCost || 'NA'),
                            'Packing Cost': cleanData(part.packingCost || 'NA'),

                            'Tooling Cost': cleanData(part.toolCost || 'NA'),
                            'Tool Lead Time (Days)': cleanData(part.toolLeadTime || 'NA'),
                            'Tool Cavity': cleanData(part.toolCavity || 'NA'),
                            'Tool Life (Shots)': cleanData(part.toolLife || 'NA'),

                            'Payment Terms': cleanData(reply.terms?.paymentTerms),
                            'Delivery Terms': cleanData(reply.terms?.deliveryTerms),
                            'Freight Terms': cleanData(reply.terms?.freightTerms),

                            'Reply Status': cleanData(reply.status),
                            'Reply Submission Date': cleanData(formatDate(reply.submissionDate)),
                            'Supplier Remarks': cleanData(reply.terms?.remarks)
                        })) || [];
                    });
                }

               
                return {
                    'RFQ Number': cleanData(rfq.rfqNumber),
                    'Project Name': cleanData(rfq.projectName),
                    'RFQ Status': cleanData(rfq.status),
                    'RFQ Submission Date': cleanData(rfq.submissionDate),
                    'Creator Name': cleanData(rfq.creatorDetails?.name),
                    'Creator Email': cleanData(rfq.creatorDetails?.email),
                    'Part No': cleanData(rfq.partNo),
                    'Part Description': cleanData(rfq.partDescription),
                    'Part Qty': cleanData(rfq.quantity),
                    'Order Type': cleanData(rfq.orderType),
                    'Supplier ID': 'N/A',
                    'Supplier Name': 'N/A',
                    'Supplier Email': 'N/A',
                    'Supplier Phone': 'N/A',
                    'Supplier MSME Status': 'N/A',
                    'Unit Rate': 'N/A',
                    'Total Cost': 'N/A',
                    'Currency': cleanData(rfq.currency),
                    'Sample Lead Time (Days)': 'N/A',
                    'Production Lead Time (Days)': 'N/A',
                    'Material Cost': 'N/A',
                    'Process Cost': 'N/A',
                    'Overheads': 'N/A',
                    'Packing Cost': 'N/A',
                    'Tooling Cost': 'N/A',
                    'Tool Lead Time (Days)': 'N/A',
                    'Tool Cavity': 'N/A',
                    'Tool Life (Shots)': 'N/A',
                    'Payment Terms': 'N/A',
                    'Delivery Terms': 'N/A',
                    'Freight Terms': 'N/A',
                    'Reply Status': 'N/A',
                    'Reply Submission Date': 'N/A',
                    'Supplier Remarks': 'N/A'
                };
            });

            const ws = XLSX.utils.json_to_sheet(reportData);

            const wscols = [
                { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
                { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
                { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
                { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 12 },
                { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 20 },
                { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
                { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
                { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
                { wch: 20 }, { wch: 30 }
            ];
            ws['!cols'] = wscols;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "RFQ Replies Report");

            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            const date = new Date().toISOString().split('T')[0];
            link.download = `RFQ_Replies_Report_${date}.xlsx`;

            document.body.appendChild(link);
            link.click();

            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);

        } catch (err) {
            console.error("Error generating report:", err);
            setError("Failed to generate report. Please try again.");
        } finally {
            setGeneratingReport(false);
        }
    };
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredRfqs.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredRfqs.length / itemsPerPage);

    const handleRFQClick = (rfqId) => {
        navigate(`/supplier-replies/${rfqId}`);
    };

    const getStatusVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'warning';
            case 'completed': return 'success';
            case 'rejected': return 'danger';
            case 'approved': return 'primary';
            case 'urgent': return 'danger';
            default: return 'secondary';
        }
    };

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const renderPagination = () => {
        let items = [];
        const maxVisiblePages = 5;
        let startPage, endPage;

        if (totalPages <= maxVisiblePages) {
            startPage = 1;
            endPage = totalPages;
        } else {
            const maxPagesBeforeCurrent = Math.floor(maxVisiblePages / 2);
            const maxPagesAfterCurrent = Math.ceil(maxVisiblePages / 2) - 1;

            if (currentPage <= maxPagesBeforeCurrent) {
                startPage = 1;
                endPage = maxVisiblePages;
            } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
                startPage = totalPages - maxVisiblePages + 1;
                endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrent;
                endPage = currentPage + maxPagesAfterCurrent;
            }
        }

        items.push(
            <Pagination.Item
                key="prev"
                onClick={() => paginate(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
            >
                <FiChevronLeft />
            </Pagination.Item>
        );

        for (let number = startPage; number <= endPage; number++) {
            items.push(
                <Pagination.Item
                    key={number}
                    active={number === currentPage}
                    onClick={() => paginate(number)}
                >
                    {number}
                </Pagination.Item>
            );
        }

        items.push(
            <Pagination.Item
                key="next"
                onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
            >
                <FiChevronRight />
            </Pagination.Item>
        );

        return items;
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (error) {
        return (
            <Container className="mt-4">
                <Alert variant="danger" className="shadow-sm">
                    <Alert.Heading>Error Loading RFQs</Alert.Heading>
                    <p>{error}</p>
                </Alert>
            </Container>
        );
    }

    return (
        <div className="bg-light" style={{ minHeight: '100vh' }}>
            <Nav LogoutUser={LogoutUser} />
            <Container fluid="lg" className="py-4">
                <Row className="mb-4 align-items-end">
                    <Col md={6}>
                        <h2 className="fw-bold text-primary mb-1">Supplier Replies</h2>
                        <p className="text-muted mb-0">Review and manage all supplier responses to your RFQs</p>
                    </Col>
                    <Col md={6} className="d-flex justify-content-md-end align-items-center gap-3 mt-2 mt-md-0">
                        <Badge pill bg="light" className="text-dark border border-primary px-3 py-2">
                            Showing {filteredRfqs.length} {filteredRfqs.length === 1 ? 'RFQ' : 'RFQs'}
                        </Badge>

                        <Dropdown>
                            <Dropdown.Toggle
                                variant="primary"
                                className="d-flex align-items-center gap-2 rounded-pill"
                                disabled={generatingReport || filteredRfqs.length === 0}
                            >
                                {generatingReport ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <FiDownload />
                                        Generate Report
                                    </>
                                )}
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item onClick={generateExcelReport}>
                                    <div className="d-flex align-items-center gap-2">
                                        <FiFileText />
                                        <div>
                                            <div>Detailed Excel Report</div>
                                            <small className="text-muted">Export all data with supplier replies</small>
                                        </div>
                                    </div>
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </Col>
                </Row>

                <Row className="mb-4 g-3">
                    <Col md={8} lg={6}>
                        <InputGroup className="shadow-sm rounded-pill">
                            <InputGroup.Text className="bg-white border-end-0 rounded-pill ps-3">
                                <FiSearch className="text-muted" />
                            </InputGroup.Text>
                            <Form.Control
                                type="search"
                                placeholder="Search RFQs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="border-start-0 py-2 rounded-pill"
                            />
                        </InputGroup>
                    </Col>
                    <Col md={4} lg={6} className="d-flex justify-content-md-end">
                        <Button
                            variant="outline-primary"
                            onClick={() => setShowFilters(!showFilters)}
                            className="d-flex align-items-center gap-2 rounded-pill"
                        >
                            <FiFilter />
                            Filters
                        </Button>
                    </Col>
                </Row>

                {showFilters && (
                    <Row className="mb-4">
                        <Col>
                            <Card className="shadow-sm border-0">
                                <Card.Body className="p-3">
                                    <h6 className="mb-3 fw-semibold">Filter by Status</h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        {['all', 'pending', 'completed', 'approved', 'rejected'].map((status) => (
                                            <Button
                                                key={status}
                                                variant={statusFilter === status ? getStatusVariant(status) : "outline-secondary"}
                                                size="sm"
                                                onClick={() => setStatusFilter(status)}
                                                className="text-capitalize rounded-pill"
                                            >
                                                {status === 'all' ? 'All Statuses' : status}
                                            </Button>
                                        ))}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                )}

                {filteredRfqs.length === 0 ? (
                    <Row>
                        <Col>
                            <Card className="shadow-sm border-0 text-center py-5 d-flex flex-column align-items-center">
                                <FiPackage size={48} className="text-muted mb-3" />
                                <h5 className="fw-bold">
                                    {searchTerm.trim() === "" && statusFilter === "all"
                                        ? "No RFQs Available"
                                        : "No Matching RFQs Found"}
                                </h5>
                                <p className="text-muted mb-4">
                                    {searchTerm.trim() === "" && statusFilter === "all"
                                        ? "When you receive RFQ responses, they will appear here."
                                        : "Try adjusting your search or filter criteria."}
                                </p>
                                <div className="">
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => {
                                            setSearchTerm("");
                                            setStatusFilter("all");
                                        }}
                                    >
                                        Clear Filters
                                    </Button>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                ) : (
                    <>
                        <Row className="g-4 mb-4">
                            {currentItems.map(rfq => (
                                <Col key={rfq.id} md={6} lg={4} xl={3}>
                                    <Card
                                        onClick={() => handleRFQClick(rfq.id)}
                                        className="h-100 shadow-sm-hover cursor-pointer transition-all border-0"
                                    >
                                        <Card.Body className="d-flex flex-column">
                                            <div className="d-flex justify-content-between align-items-start mb-3 px-1">
                                                <Badge
                                                    pill
                                                    bg={getStatusVariant(rfq.status)}
                                                    className="align-self-start"
                                                >
                                                    {rfq.status?.toUpperCase()}
                                                </Badge>
                                                <medium className="text-muted d-block mb-1">
                                                    {rfq.rfqNumber}
                                                </medium>
                                            </div>


                                            <div className="mb-2">
                                                <h5 className="text-muted d-block">
                                                    Project Name: {rfq.projectName || 'N/A'}
                                                </h5>
                                            </div>

                                            <div className="mt-auto">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <div className="d-flex align-items-center gap-1 text-muted">
                                                        <FiPackage size={14} />
                                                        <small>No of Parts: {rfq.parts?.length || 'N/A'}</small>
                                                    </div>
                                                    {rfq.totalPrice && (
                                                        <div className="d-flex align-items-center gap-1 text-success">
                                                            <FiDollarSign size={14} />
                                                            <small>{rfq.totalPrice} {rfq.currency}</small>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="d-flex align-items-center gap-1 text-muted">
                                                    <FiClock size={14} />
                                                    <small>Due: {rfq.submissionDate || 'Not specified'}</small>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>

                        {totalPages > 1 && (
                            <Row>
                                <Col>
                                    <div className="d-flex justify-content-center">
                                        <Pagination className="rounded-pill shadow-sm">
                                            {renderPagination()}
                                        </Pagination>
                                    </div>
                                </Col>
                            </Row>
                        )}
                    </>
                )}
            </Container>
        </div>
    );
};

export default RFQRepliesPage;