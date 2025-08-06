import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Navbar from '../../components/Source/Nav';
import QuotationCard from '../../components/Source/QuotationCard';
import { auth } from '../../firebaseConfig';
import { Form, InputGroup, Container, Row, Col, Pagination, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaSearch, FaFilter, FaSync, FaTimes, FaFileExcel } from 'react-icons/fa';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const QuotationList = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: ''
  });

  const fetchAllQuotations = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('User not authenticated');

      const response = await axios.get('http://localhost:3000/api/quotations', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const sortedQuotations = Array.isArray(response.data)
        ? response.data.sort((a, b) => {
          if (a.status === 'pending' && b.status === 'pending') {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          if (a.status === 'pending') return -1;
          if (b.status === 'pending') return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        })
        : [];

      setQuotations(sortedQuotations);
    } catch (err) {
      console.error("Failed to fetch quotations:", err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch quotations');
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  };

  const generateExcelReport = async () => {
    try {
      setLoading(true); 

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('User not authenticated');

      const creatorIds = [...new Set(filteredQuotations.map(q => q.createdBy))];
      const creatorsResponse = await axios.get('http://localhost:3000/users', {
        params: { ids: creatorIds.join(',') },
        headers: { Authorization: `Bearer ${token}` }
      });
      const creatorsMap = creatorsResponse.data.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});

      const supplierIds = [...new Set(filteredQuotations.flatMap(q => q.suppliers || []))];
      const suppliersResponse = await axios.get('http://localhost:3000/supplier/supplierdetails', {
        params: { ids: supplierIds.join(',') },
        headers: { Authorization: `Bearer ${token}` }
      });
      const suppliersMap = suppliersResponse.data.reduce((acc, supplier) => {
        acc[supplier.id] = supplier;
        return acc;
      }, {});

      const reportData = [];

      filteredQuotations.forEach(quotation => {
        const formatDateSafe = (dateValue) => {
          if (!dateValue) return '';
          try {
            if (dateValue.toDate) {
              return dateValue.toDate().toISOString();
            }
            if (typeof dateValue === 'string') {
              return new Date(dateValue).toISOString();
            }
            return '';
          } catch {
            return '';
          }
        };

        const creator = creatorsMap[quotation.createdBy] || {};
        const baseData = {
          'RFQ Number': quotation.rfqNumber || '',
          'Project Name': quotation.projectName || '',
          'Status': quotation.status || '',
          'Created By': creator.name || creator.email || 'Unknown',
          'Created At': formatDateSafe(quotation.createdAt),
          'Submission Deadline': (quotation.submissionDate),
          'Comments': quotation.comments || '',
        };
        if (!quotation.parts || quotation.parts.length === 0) {
          if (!quotation.suppliers || quotation.suppliers.length === 0) {
            reportData.push({
              ...baseData,
              'Part No': '',
              'Part Description': '',
              'Revision': '',
              'Order Type': '',
              'Quantity': '',
              'Supplier Name': '',
              'Supplier Email': '',
              'Supplier Contact': ''
            });
          } else {
            quotation.suppliers.forEach(supplierId => {
              const supplier = suppliersMap[supplierId] || {};
              reportData.push({
                ...baseData,
                'Part No': '',
                'Part Description': '',
                'Revision': '',
                'Order Type': '',
                'Quantity': '',
                'Supplier Name': supplier.name || '',
                'Supplier Email': supplier.email || '',
                'Supplier Contact': supplier.phone || ''
              });
            });
          }
          return;
        }

        if (!quotation.suppliers || quotation.suppliers.length === 0) {
          quotation.parts.forEach(part => {
            reportData.push({
              ...baseData,
              'Part No': part.partNo || '',
              'Part Description': part.partDescription || '',
              'Revision': part.drawRevision || '',
              'Order Type': part.orderType || '',
              'Quantity': part.partQuantity || part.Quantity || '',
              'Supplier ID': '',
              'Supplier Name': '',
              'Supplier Email': '',
              'Supplier Contact': ''
            });
          });
          return;
        }

        quotation.parts.forEach(part => {
          quotation.suppliers.forEach(supplierId => {
            const supplier = suppliersMap[supplierId] || {};
            reportData.push({
              ...baseData,
              'Part No': part.partNo || '',
              'Part Description': part.partDescription || '',
              'Revision': part.drawRevision || '',
              'Order Type': part.orderType || '',
              'Quantity': part.partQuantity || part.Quantity || '',
              'Supplier Name': supplier.name || '',
              'Supplier Email': supplier.email || '',
              'Supplier Contact': supplier.phone || ''
            });
          });
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(reportData);

      const wscols = [
        { wch: 15 },  
        { wch: 20 },  
        { wch: 10 },  
        { wch: 25 },  
        { wch: 20 },  
        { wch: 20 }, 
        { wch: 30 },  
        { wch: 15 },  
        { wch: 30 },  
        { wch: 10 }, 
        { wch: 12 }, 
        { wch: 8 },   
        { wch: 25 },  
        { wch: 30 }, 
        { wch: 15 },  
        
      ];
      worksheet['!cols'] = wscols;
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4472C4" } }
      };

      if (!worksheet['!rows']) worksheet['!rows'] = [];
      worksheet['!rows'][0] = { s: headerStyle };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "RFQs");

      const now = new Date();
      const filename = `RFQ_Report_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.xlsx`;

      XLSX.writeFile(workbook, filename, {
        bookType: 'xlsx',
        type: 'array',
        cellDates: true,
        dateNF: 'yyyy-mm-dd hh:mm:ss'
      });

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotations = useMemo(() => {
    let result = quotations;

    if (searchTerm.trim() !== '') {
      const lowercasedSearch = searchTerm.toLowerCase();
      result = result.filter(quotation =>
        (quotation.projectName && quotation.projectName.toLowerCase().includes(lowercasedSearch)) ||
        (quotation.rfqNumber && quotation.rfqNumber.toLowerCase().includes(lowercasedSearch))
      );
    }

    if (filters.status) {
      result = result.filter(quotation => quotation.status === filters.status);
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      result = result.filter(quotation => new Date(quotation.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      result = result.filter(quotation => new Date(quotation.createdAt) <= toDate);
    }

    return result;
  }, [quotations, searchTerm, filters]);

  const totalPages = Math.ceil(filteredQuotations.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredQuotations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQuotations, currentPage, itemsPerPage]);

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
    fetchAllQuotations();
  }, []);

  useEffect(() => {
    setCurrentPage(1); 
  }, [searchTerm, filters]);

  return (
    <div className="bg-light min-vh-100">
      <Navbar />

      <Container className="py-4">
        <Row className="mb-4 align-items-end">
          <Col md={8}>
            <h1 className="fw-bold text-primary mb-1">RFQ Management</h1>
            <p className="text-muted mb-0">Review and manage all your quotation requests</p>
          </Col>
          <Col md={4} className="text-md-end mt-2 mt-md-0">
            <Badge pill bg="light" className="text-dark border border-primary px-3 py-2">
              {filteredQuotations.length} {filteredQuotations.length === 1 ? 'RFQ' : 'RFQs'} found
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
            <Button
              variant="outline-secondary"
              onClick={fetchAllQuotations}
              className="d-flex align-items-center gap-2 rounded-pill"
              disabled={loading}
            >
              <FaSync className={loading ? 'spin' : ''} />
              Refresh
            </Button>
            <Button
              variant="success"
              onClick={generateExcelReport}
              className="d-flex align-items-center gap-2 rounded-pill"
              disabled={loading || filteredQuotations.length === 0}
            >
              <FaFileExcel />
              Generate Report
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
                        <option value="pending">Pending</option>
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
                  onClick={fetchAllQuotations}
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
              <p className="mt-2">Loading RFQs...</p>
            </Col>
          </Row>
        ) : (
          <>
            {filteredQuotations.length === 0 ? (
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
                        : "When you receive RFQs, they will appear here."}
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
                    <div className="d-flex flex-column gap-3">
                      {currentItems.map(quotation => (
                        <QuotationCard
                          key={quotation.id}
                          quotation={quotation}
                          highlight={searchTerm}
                        />
                      ))}
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

export default QuotationList;