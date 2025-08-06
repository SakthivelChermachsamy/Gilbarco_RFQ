import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { auth } from '../../firebaseConfig';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import logo from '../../assets/logo.svg';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export default function NewQuotation() {
    const [suppliers, setSuppliers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSuppliers, setSelectedSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [parts, setParts] = useState([]);
    const [projectName, setProjectName] = useState('');
    const [submissionDate, setSubmissionDate] = useState('');
    const [drawingFile, setDrawingFile] = useState(null);
    const [showAddPartModal, setShowAddPartModal] = useState(false);
    const [comments, setComments] = useState(''); // New state for comments

    const [currentPart, setCurrentPart] = useState({
        partNo: '',
        partDescription: '',
        drawRevision: '',
        orderType: 'oneTime',
        partQuantity: '',
    });

    const [editingIndex, setEditingIndex] = useState(null);
    const [editedPart, setEditedPart] = useState({
        partNo: '',
        partDescription: '',
        drawRevision: '',
        orderType: 'oneTime',
        partQuantity: '',
    });

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const q = query(collection(db, 'suppliers'));
                const querySnapshot = await getDocs(q);
                const suppliersData = [];

                querySnapshot.forEach((doc) => {
                    suppliersData.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                setSuppliers(suppliersData);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching suppliers:", error);
                toast.error("Failed to load suppliers");
                setLoading(false);
            }
        };

        fetchSuppliers();
    }, []);

    const handleEdit = (index) => {
        setEditingIndex(index);
        setEditedPart(parts[index]);
    };

    const saveEdit = () => {
        if (!editedPart.partNo || !editedPart.partQuantity) {
            toast.error('Part number and quantity are required');
            return;
        }

        const updatedParts = [...parts];
        updatedParts[editingIndex] = editedPart;
        setParts(updatedParts);
        setEditingIndex(null);
        toast.success('Part updated successfully');
    };

    const cancelEdit = () => {
        setEditingIndex(null);
    };

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(supplier => {
            const matchesCategory = categoryFilter ? supplier.category === categoryFilter : true;
            const matchesSearch = String(supplier.vendorId).toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(supplier.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(supplier.email).toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [suppliers, categoryFilter, searchTerm]);

    const handleSelect = (e) => {
        const options = e.target.options;
        const selected = [];
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) {
                selected.push(options[i].value);
            }
        }
        setSelectedSuppliers(selected);
    };

    const removeSupplier = (supplierId) => {
        setSelectedSuppliers(selectedSuppliers.filter(id => id !== supplierId));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCurrentPart(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const addPart = () => {
        if (!currentPart.partNo) {
            toast.error('Part number is required');
            return;
        }
        if (!currentPart.partQuantity) {
            toast.error('Part quantity is required');
            return;
        }

        setParts([...parts, {
            ...currentPart,
            submissionDate
        }]);

        setCurrentPart({
            partNo: '',
            partDescription: '',
            drawRevision: '',
            orderType: 'oneTime',
            partQuantity: '',
        });
        setShowAddPartModal(false);
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                if (jsonData.length === 0) {
                    toast.error('Excel file is empty');
                    return;
                }

                const importedParts = jsonData.map(item => ({
                    partNo: item['Part No'] || item['Part No.'] || item['Part Number'] || '',
                    partDescription: item['Description'] || item['Part Description'] || '',
                    drawRevision: item['Revision'] || item['Draw Revision'] || '',
                    orderType: (item['Order Type'] || '').toLowerCase() === 'annual' ? 'annual' : 'oneTime',
                    partQuantity: item['Quantity'] || item['Part Quantity'] || '',
                    submissionDate: submissionDate || item['Date'] || item['Submission Date'] || '',
                })).filter(part => part.partNo && part.partQuantity);

                if (importedParts.length === 0) {
                    toast.error('No valid parts found in the Excel file');
                    return;
                }

                setParts(prevParts => [...prevParts, ...importedParts]);
                toast.success(`Added ${importedParts.length} parts from Excel`);
            } catch (error) {
                console.error('Error processing Excel file:', error);
                toast.error('Failed to process Excel file');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const removePart = (index) => {
        const updatedParts = [...parts];
        updatedParts.splice(index, 1);
        setParts(updatedParts);
    };

    const handleFileChange = (e) => {
        setDrawingFile(e.target.files[0]);
    };

    const handleSubmissionDateChange = (e) => {
        setSubmissionDate(e.target.value);
    };

    const handleCategoryFilterChange = (e) => {
        setCategoryFilter(e.target.value);
    };

    const handleCommentsChange = (e) => {
        setComments(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!projectName) {
            toast.error('Project name is required');
            return;
        }

        if (parts.length === 0) {
            toast.error('Please add at least one part');
            return;
        }

        if (selectedSuppliers.length === 0) {
            toast.error('Please select at least one supplier');
            return;
        }

        if (!submissionDate) {
            toast.error('Please select a submission date');
            return;
        }

        try {
            setLoading(true);
            const token = await auth.currentUser.getIdToken();

            const quotationData = {
                projectName,
                parts,
                suppliers: selectedSuppliers,
                submissionDate,
                comments,
            };

            if (drawingFile) {
                quotationData.drawingFileName = drawingFile.name;
            }

            await axios.post('http://localhost:3000/api/quotations', quotationData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Quotation created successfully!');

            setParts([]);
            setSelectedSuppliers([]);
            setSubmissionDate('');
            setDrawingFile(null);
            setProjectName('');
            setComments('');
        } catch (error) {
            console.error('Error creating quotation:', error);
            toast.error(error.response?.data?.message || 'Failed to create quotation');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container p-4">
            <form className="border p-4 rounded-3 shadow-sm" onSubmit={handleSubmit}>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-primary mb-0">New Quotation</h2>
                    <img src={logo} alt="Company Logo" style={{ height: '40px' }} />
                </div>


                <div className="row mb-4">
                    <div className="col-md-4 mb-3">
                        <label className="form-label fw-semibold">PROJECT NAME</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Enter project name"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="col-md-4 mb-3">
                        <label className="form-label fw-semibold">QUOTATION DUE DATE</label>
                        <input
                            type="date"
                            className="form-control"
                            value={submissionDate}
                            onChange={handleSubmissionDateChange}
                            required
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    <div className="col-md-4 mb-3">
                        <label className="form-label fw-semibold">UPLOAD DRAWING</label>
                        <input
                            type="file"
                            className="form-control"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.png,.doc,.docx"
                        />
                        {drawingFile && (
                            <div className="mt-2">
                                <span className="badge bg-info text-dark">
                                    {drawingFile.name}
                                    <button
                                        type="button"
                                        className="btn-close btn-close-white ms-2"
                                        aria-label="Remove"
                                        onClick={() => setDrawingFile(null)}
                                        style={{ fontSize: '0.5rem' }}
                                    ></button>
                                </span>
                            </div>
                        )}
                    </div>
                </div>


                <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5>Parts List</h5>
                        <div>
                            <button
                                type="button"
                                className="btn btn-primary me-2"
                                onClick={() => setShowAddPartModal(true)}
                            >
                                <i className="bi bi-plus-circle me-2"></i>Add Part
                            </button>
                            <label className="btn btn-secondary">
                                <i className="bi bi-upload me-2"></i>Import from Excel
                                <input
                                    type="file"
                                    style={{ display: 'none' }}
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleExcelUpload}
                                />
                            </label>
                        </div>
                    </div>

                    {parts.length > 0 ? (
                        <div className="table-responsive">
                            <table className="table table-bordered table-hover">
                                <thead className="table-light">
                                    <tr>
                                        <th>Part No</th>
                                        <th>Description</th>
                                        <th>Revision</th>
                                        <th>Order Type</th>
                                        <th>Quantity</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parts.map((part, index) => (
                                        <tr key={index}>
                                            {editingIndex === index ? (
                                                <>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            value={editedPart.partNo}
                                                            onChange={(e) => setEditedPart({ ...editedPart, partNo: e.target.value })}
                                                            required
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            value={editedPart.partDescription}
                                                            onChange={(e) => setEditedPart({ ...editedPart, partDescription: e.target.value })}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            value={editedPart.drawRevision}
                                                            onChange={(e) => setEditedPart({ ...editedPart, drawRevision: e.target.value })}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={editedPart.orderType}
                                                            onChange={(e) => setEditedPart({ ...editedPart, orderType: e.target.value })}
                                                        >
                                                            <option value="oneTime">One Time</option>
                                                            <option value="annual">Annual</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            className="form-control form-control-sm"
                                                            value={editedPart.partQuantity}
                                                            onChange={(e) => setEditedPart({ ...editedPart, partQuantity: e.target.value })}
                                                            required
                                                        />
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-success me-2"
                                                            onClick={saveEdit}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={cancelEdit}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td>{part.partNo}</td>
                                                    <td>{part.partDescription}</td>
                                                    <td>{part.drawRevision}</td>
                                                    <td className="text-capitalize">{part.orderType}</td>
                                                    <td>{part.partQuantity}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-primary me-2"
                                                            onClick={() => handleEdit(index)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => removePart(index)}
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="alert alert-info">
                            No parts added yet. Click "Add Part" or "Import from Excel" to get started.
                        </div>
                    )}
                </div>


                <div className="mb-4">
                    <label className="form-label fw-semibold">ADDITIONAL COMMENTS</label>
                    <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Enter any additional comments or special instructions..."
                        value={comments}
                        onChange={handleCommentsChange}
                    ></textarea>
                    <small className="text-muted">Optional: Add any notes or special requirements for this quotation</small>
                </div>

                {/* Add Part Modal */}
                <Modal show={showAddPartModal} onHide={() => setShowAddPartModal(false)} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>Add New Part</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div className="row mb-3">
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-semibold">PART No.</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter part number"
                                    name="partNo"
                                    value={currentPart.partNo}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-semibold">DRAW REVISION</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    placeholder="Enter revision number"
                                    name="drawRevision"
                                    value={currentPart.drawRevision}
                                    onChange={handleChange}
                                    min="0"
                                    step="1"
                                />
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="form-label fw-semibold">PART DESCRIPTION</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                placeholder="Enter part description"
                                name="partDescription"
                                value={currentPart.partDescription}
                                onChange={handleChange}
                            ></textarea>
                        </div>

                        <div className="row mb-3">
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-semibold">ORDER TYPE</label>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="orderType"
                                        id="oneTime"
                                        value="oneTime"
                                        checked={currentPart.orderType === 'oneTime'}
                                        onChange={handleChange}
                                    />
                                    <label className="form-check-label" htmlFor="oneTime">
                                        One Time
                                    </label>
                                </div>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="orderType"
                                        id="annual"
                                        value="annual"
                                        checked={currentPart.orderType === 'annual'}
                                        onChange={handleChange}
                                    />
                                    <label className="form-check-label" htmlFor="annual">
                                        Annual
                                    </label>
                                </div>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="orderType"
                                        id="proto-sample"
                                        value="proto-sample"
                                        checked={currentPart.orderType === 'proto-sample'}
                                        onChange={handleChange}
                                    />
                                    <label className="form-check-label" htmlFor="proto-sample">
                                        Proto-Sample
                                    </label>
                                </div>
                            </div>
                            <div className="col-md-6 mb-3">
                                <label className="form-label fw-semibold">PART QUANTITY</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    placeholder="Enter quantity"
                                    name="partQuantity"
                                    value={currentPart.partQuantity}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAddPartModal(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={addPart}>
                            Add Part
                        </Button>
                    </Modal.Footer>
                </Modal>

                <div className="mb-4">
                    <label className="form-label fw-semibold">SELECT SUPPLIERS</label>
                    <div className="input-group mb-2">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search suppliers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={loading}
                        />
                        <select
                            className="form-select"
                            style={{ maxWidth: '200px' }}
                            value={categoryFilter}
                            onChange={handleCategoryFilterChange}
                        >
                            <option value="">All Categories</option>
                            <option value="Electronic">Electronic</option>
                            <option value="Hanging Hardware">Hanging Hardware</option>
                            <option value="Casting">Casting</option>
                            <option value="Machining">Machining</option>
                            <option value="Plastics & Rubber">Plastics & Rubber</option>
                            <option value="Engineered Products">Engineered Products</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>

                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <select
                                className="form-select"
                                multiple
                                size="8"
                                onChange={handleSelect}
                                value={selectedSuppliers}
                                disabled={loading}
                            >
                                {filteredSuppliers.map((supplier) => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.vendorId + " "}{supplier.name} ({supplier.email})
                                    </option>
                                ))}
                            </select>
                            <small className="text-muted">Hold Ctrl/Cmd to select multiple suppliers</small>
                        </>
                    )}

                    {selectedSuppliers.length > 0 && (
                        <div className="mt-3">
                            <div className="d-flex justify-content-between align-items-center">
                                <h6 className="mb-2">SELECTED SUPPLIERS ({selectedSuppliers.length})</h6>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => setSelectedSuppliers([])}
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="d-flex flex-wrap gap-2 mt-2">
                                {selectedSuppliers.map(supplierId => {
                                    const supplier = suppliers.find(s => s.id === supplierId);
                                    return (
                                        <span
                                            key={supplierId}
                                            className="badge bg-success d-flex align-items-center p-2"
                                        >
                                            {supplier?.name || 'Unknown Supplier'}
                                            <button
                                                type="button"
                                                className="btn-close btn-close-white ms-2"
                                                aria-label="Remove"
                                                onClick={() => removeSupplier(supplierId)}
                                                style={{ fontSize: '0.5rem' }}
                                            ></button>
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="d-grid gap-2 mt-4">
                    <button
                        type="submit"
                        className="btn btn-primary btn-lg py-2"
                        disabled={loading || selectedSuppliers.length === 0 || parts.length === 0}
                    >
                        {loading ? (
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        ) : (
                            <i className="bi bi-send-fill me-2"></i>
                        )}
                        SUBMIT QUOTATION
                    </button>
                </div>
            </form>
        </div>
    );
}