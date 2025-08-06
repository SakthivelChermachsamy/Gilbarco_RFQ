import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import Nav from '../../components/Supplier/Nav';
import { Logout, isAuthenticated } from '../../services/Auth';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/AuthContext';
import Page404 from "../Landingpage/Page404";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Form, InputGroup, Container, Row, Col, Pagination, Button, Badge, Spinner, Alert, Table } from 'react-bootstrap';
import { FaSearch, FaFilter, FaSync, FaTimes, FaFileAlt } from 'react-icons/fa';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const RFQView = () => {
  const [allRfqs, setAllRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [currentSupplierId, setCurrentSupplierId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: ''
  });

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
        setLoading(true);
        setError(null);

        const user = auth.currentUser;
        if (!user) {
          throw new Error('Supplier not authenticated');
        }
        setCurrentSupplierId(user.uid);
        const rfqsRef = collection(db, 'supplier_replies');
        const q = query(rfqsRef, where('supplier.id', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const submittedRfqs = await Promise.all(querySnapshot.docs.map(async (supplierReplyDoc) => {
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
            noOfParts: rfqDetails.parts.length || 'N/A',
            projectName: rfqDetails.projectName || 'N/A',
            submissionDate: rfqDetails.submissionDate || replyData.submissionDate || new Date(),
            status: replyData.status || 'submitted',
            type: 'submitted'
          };
        }));

        const quotationsRef = collection(db, 'quotations');
        const quotationsQuery = query(
          quotationsRef,
          where('suppliers', 'array-contains', user.uid),
          where('status', '==', 'expired')
        );
        const quotationsSnapshot = await getDocs(quotationsQuery);

        const submittedRfqIds = submittedRfqs.map(rfq => rfq.rfqId);

        const pendingExpiredRfqs = quotationsSnapshot.docs
          .filter(doc => !submittedRfqIds.includes(doc.id))
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            status: new Date(doc.data().submissionDate) < new Date() ? 'expired' : 'pending',
            type: 'assigned'
          }));

        const combinedRfqs = [...submittedRfqs, ...pendingExpiredRfqs];
        const sortedRfqs = combinedRfqs.sort((a, b) =>
          new Date(b.submissionDate) - new Date(a.submissionDate)
        );

        setAllRfqs(sortedRfqs);
      } catch (error) {
        console.error('Error fetching RFQs:', error);
        setError(error.message || 'Failed to load RFQs');
        toast.error('Failed to load RFQs');
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierRFQs();
  }, []);
  const filteredRfqs = useMemo(() => {
    let result = allRfqs;
    if (searchTerm.trim() !== '') {
      const lowercasedSearch = searchTerm.toLowerCase();
      result = result.filter(rfq =>
        (rfq.rfqNumber && rfq.rfqNumber.toString().toLowerCase().includes(lowercasedSearch)) ||
        (rfq.projectName && rfq.projectName.toLowerCase().includes(lowercasedSearch)))
    }
    if (filters.status) {
      result = result.filter(rfq => rfq.status === filters.status);
    }
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      result = result.filter(rfq => new Date(rfq.submissionDate) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      result = result.filter(rfq => new Date(rfq.submissionDate) <= toDate);
    }

    return result;
  }, [allRfqs, searchTerm, filters]);

  const totalPages = Math.ceil(filteredRfqs.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRfqs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRfqs, currentPage, itemsPerPage]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const renderPagination = () => {
    if (totalPages <= 1) return null;

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

    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => paginate(1)}>
          1
        </Pagination.Item>
      );
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="ellipsis-start" />);
      }
    }

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

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="ellipsis-end" />);
      }
      items.push(
        <Pagination.Item
          key={totalPages}
          onClick={() => paginate(totalPages)}
        >
          {totalPages}
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const handleViewDetails = (rfq) => {
    if (rfq.type === 'submitted') {
      navigate(`/offer_details/${rfq.replyId}`);
    } else {
      if (rfq.status === 'expired') {
        toast.warning('This RFQ has expired and cannot be submitted');
      } else {
        navigate(`/supplier_initial_offer/${rfq.id}`);
      }
    }
  };



  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'submitted':
        return 'primary';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'expired':
        return 'secondary';
      default:
        return 'info';
    }
  };

  const getActionButton = (rfq) => {
    if (rfq.type === 'submitted') {
      return (
        <Button variant="primary" size="sm" onClick={() => handleViewDetails(rfq)}>
          View
        </Button>
      );
    } else {
      return (
        <Button
          variant={rfq.status === 'expired' ? 'outline-secondary' : 'primary'}
          size="sm"
          onClick={() => handleViewDetails(rfq)}
          disabled={rfq.status === 'expired'}
        >
          {rfq.status === 'expired' ? 'Expired' : 'Submit'}
        </Button>
      );
    }
  };

  return (
    <div className="bg-light min-vh-100">
      <Nav LogoutUser={LogoutUser} />

      <Container className="py-4">
        <Row className="mb-4 align-items-end">
          <Col md={8}>
            <h1 className="fw-bold text-primary mb-1">Your RFQs</h1>
            <p className="text-muted mb-0">View and manage all your assigned and submitted RFQs</p>
          </Col>
          <Col md={4} className="text-md-end mt-2 mt-md-0">
            <Badge pill bg="light" className="text-dark border border-primary px-3 py-2">
              {filteredRfqs.length} {filteredRfqs.length === 1 ? 'RFQ' : 'RFQs'} found
              {(filters.status || filters.dateFrom || filters.dateTo) && (
                <span className="ms-2">
                  <small>(filtered)</small>
                </span>
              )}
            </Badge>
          </Col>
        </Row>

        <Row className="mb-4 g-3">
          <Col md={8} lg={6}>
            <InputGroup className="shadow-sm rounded-pill">
              <InputGroup.Text className="bg-white border-end-0 rounded-pill ps-3">
                <FaSearch className="text-muted" />
              </InputGroup.Text>
              <Form.Control
                type="search"
                placeholder="Search RFQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-start-0 py-2 rounded-pill"
              />
              {searchTerm && (
                <Button
                  variant="outline-secondary"
                  onClick={() => setSearchTerm('')}
                  className="rounded-pill"
                >
                  <FaTimes />
                </Button>
              )}
            </InputGroup>
          </Col>
          <Col md={4} lg={6} className="d-flex justify-content-md-end gap-2">
            <Button
              variant={showFilters ? 'primary' : 'outline-primary'}
              onClick={() => setShowFilters(!showFilters)}
              className="d-flex align-items-center gap-2 rounded-pill"
            >
              <FaFilter />
              Filters
            </Button>
          
          </Col>
        </Row>

        {showFilters && (
          <Row className="mb-4">
            <Col>
              <div className="bg-white p-3 rounded shadow-sm">
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group controlId="statusFilter">
                      <Form.Label>Status</Form.Label>
                      <Form.Select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      >
                        <option value="">All Statuses</option>
                        <option value="submitted">Submitted</option>
                        <option value="expired">Expired</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="dateFrom">
                      <Form.Label>From Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="dateTo">
                      <Form.Label>To Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} className="text-end">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setFilters({
                        status: '',
                        dateFrom: '',
                        dateTo: ''
                      })}
                    >
                      Clear Filters
                    </Button>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        )}

        {error && (
          <Row>
            <Col>
              <Alert variant="danger" className="shadow-sm">
                <Alert.Heading>Error Loading RFQs</Alert.Heading>
                <p>{error}</p>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={refreshData}
                >
                  Try Again
                </Button>
              </Alert>
            </Col>
          </Row>
        )}

        {loading ? (
          <Row>
            <Col className="text-center my-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading your RFQs...</p>
            </Col>
          </Row>
        ) : (
          <>
            {filteredRfqs.length === 0 ? (
              <Row>
                <Col>
                  <div className="shadow-sm border-0 text-center py-5 bg-white rounded">
                    <FaSearch size={48} className="text-muted mb-3" />
                    <h5 className="fw-bold">
                      {searchTerm || filters.status || filters.dateFrom || filters.dateTo
                        ? "No Matching RFQs Found"
                        : "No RFQs Available"}
                    </h5>
                    <p className="text-muted mb-4">
                      {searchTerm || filters.status || filters.dateFrom || filters.dateTo
                        ? "Try adjusting your search or filter criteria."
                        : "When you are assigned RFQs, they will appear here."}
                    </p>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        setFilters({
                          status: '',
                          dateFrom: '',
                          dateTo: ''
                        });
                      }}
                    >
                      Clear Search & Filters
                    </Button>
                  </div>
                </Col>
              </Row>
            ) : (
              <>
                <Row className="mb-4">
                  <Col>
                    <div className="bg-white rounded shadow-sm overflow-hidden">
                      <Table responsive hover className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>RFQ ID</th>
                            <th>Project Name</th>
                            <th>No Of Parts</th>
                            <th>Status</th>
                            <th>Deadline</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentItems.map((rfq) => (
                            <tr key={rfq.id}>
                              <td>{rfq.rfqNumber}</td>
                              <td>{rfq.projectName}</td>
                              <td>{rfq.noOfParts}</td>
                              <td>
                                <Badge bg={getStatusBadge(rfq.status)}>
                                  {rfq.status}
                                </Badge>
                              </td>
                              <td>{new Date(rfq.submissionDate).toLocaleDateString()}</td>
                
                              <td>
                                <div className="d-flex justify-content-between">
                                  {getActionButton(rfq)}
                                  <Button variant="outline-secondary" size="sm">
                                    <FaFileAlt />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </Col>
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
          </>
        )}
      </Container>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RFQView;