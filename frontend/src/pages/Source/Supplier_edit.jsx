import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Navigate, useNavigate } from 'react-router-dom';
import Nav from '../../components/Source/Nav';
import { isAuthenticated } from '../../services/Auth';
import { Logout } from '../../services/Auth';
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import axios from "axios";
import { useAuth } from '../../services/AuthContext';
import { ToastContainer, toast } from 'react-toastify';
import Select from 'react-select';
import 'react-toastify/dist/ReactToastify.css';
import {
    Modal,
    Button,
    Table,
    Alert,
    Spinner,
    Form,
    Badge,
    Card,
    Container,
    Row,
    Col,
    InputGroup
} from 'react-bootstrap';
import { Search, PlusCircle, PencilFill, KeyFill, TrashFill } from 'react-bootstrap-icons';

import { countries } from 'countries-list';

const countryOptions = Object.entries(countries).map(([code, country]) => ({
    value: country.name,
    label: country.name,
    code
}));

export default function SupplierEdit() {
    if (!isAuthenticated()) {
        return <Navigate to="/login" />;
    }

    const { role } = useAuth();
    if (role === 'supplier') {
        return <Navigate to="/404" />;
    }

    const navigate = useNavigate();
    const LogoutUser = () => {
        Logout();
        navigate('/login');
    }

    const categories = [
        'Electronics',
        'Hanging Hardware',
        'Casting',
        'Machining',
        'Plastics & Rubbers',
        'Engineered Products',
        'Others'
    ];

    const supplierTypes = [
        'Regular',
        'OEM'
    ];
    const [suppliers, setSuppliers] = useState([]);
    const [filteredSuppliers, setFilteredSuppliers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        vendorId: '',
        name: '',
        phone: '',
        country: '',
        location: '',
        category: '',
        subCategory: '',
        supplierType: '',
        email: '',
        password: '',
        role: 'supplier'
    });
    const [editingSupplierId, setEditingSupplierId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        if (!formData.vendorId) newErrors.vendorId = 'Vendor ID is required';
        if (!formData.name) newErrors.name = 'Name is required';
        if (!editingSupplierId) {
            if (!formData.email) newErrors.email = 'Email is required';
            if (!formData.password || formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    useEffect(() => {
        const fetchSuppliers = async () => {
            setLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, 'suppliers'));
                const suppliersData = [];
                querySnapshot.forEach((doc) => {
                    suppliersData.push({ id: doc.id, ...doc.data() });
                });
                setSuppliers(suppliersData);
                setFilteredSuppliers(suppliersData);
            } catch (err) {
                toast.error('Failed to fetch suppliers');
                console.error(err);
            }
            setLoading(false);
        };
        fetchSuppliers();
    }, []);

    useEffect(() => {
        const results = suppliers.filter(supplier =>
            supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supplier.vendorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supplier.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supplier.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            supplier.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (supplier.supplierType && supplier.supplierType.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setFilteredSuppliers(results);
    }, [searchTerm, suppliers]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleEdit = (supplier) => {
        setFormData({
            vendorId: supplier.vendorId,
            name: supplier.name,
            email: supplier.email,
            phone: supplier.phone,
            password: '',
            country: supplier.country,
            location: supplier.location,
            category: supplier.category,
            subCategory: supplier.subCategory,
            supplierType: supplier.supplierType || '',
            role: supplier.role,
        });
        setEditingSupplierId(supplier.id);
        setShowModal(true);
    };

    const handleDelete = async (supplierId) => {
        if (window.confirm('Are you sure you want to delete this supplier?')) {
            try {
                setLoading(true);
                await axios.delete(`http://localhost:3000/supplier/delete-supplier/${supplierId}`, {
                    headers: {
                        Authorization: `Bearer ${await auth.currentUser.getIdToken()}`
                    }
                });
                setSuppliers(suppliers.filter(supplier => supplier.uid !== supplierId));
                toast.success('Supplier deleted successfully!');
            } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to delete supplier');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };
    const createSupplierDocument = async (supplierId, supplierData) => {
        await setDoc(doc(db, 'suppliers', supplierId), {
            uid: supplierId,
            email: supplierData.email,
            name: supplierData.name,
            role: supplierData.role,
            vendorId: supplierData.vendorId,
            phone: supplierData.phone,
            country: supplierData.country,
            location: supplierData.location,
            category: supplierData.category,
            subCategory: supplierData.subCategory,
            supplierType: supplierData.supplierType,
            createdAt: new Date()
        });
    };


    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const response = await axios.get('http://localhost:3000/supplier/supplierdetails', {
                headers: {
                    Authorization: `Bearer ${await auth.currentUser.getIdToken()}`
                }
            });
            setSuppliers(response.data);
            setFilteredSuppliers(response.data);
        } catch (err) {
            toast.error('Failed to fetch suppliers');
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);

        try {
            if (editingSupplierId) {
                await axios.put(`http://localhost:3000/supplier/update-supplier/${editingSupplierId}`, {
                    name: formData.name,
                    vendorId: formData.vendorId,
                    phone: formData.phone,
                    country: formData.country,
                    location: formData.location,
                    category: formData.category,
                    subCategory: formData.subCategory,
                    supplierType: formData.supplierType
                }, {
                    headers: {
                        Authorization: `Bearer ${await auth.currentUser.getIdToken()}`
                    }
                });

                toast.success('Supplier updated successfully!');
            } else {
                await axios.post('http://localhost:3000/supplier/create-supplier', {
                    email: formData.email,
                    password: formData.password,
                    supplierData: {
                        name: formData.name,
                        vendorId: formData.vendorId,
                        phone: formData.phone,
                        country: formData.country,
                        location: formData.location,
                        category: formData.category,
                        subCategory: formData.subCategory,
                        supplierType: formData.supplierType
                    }
                }, {
                    headers: {
                        Authorization: `Bearer ${await auth.currentUser.getIdToken()}`
                    }
                });

                toast.success('Supplier created successfully!');
            }
            await fetchSuppliers();
            setFormData({
                vendorId: '',
                name: '',
                phone: '',
                country: '',
                location: '',
                category: '',
                subCategory: '',
                supplierType: '',
                email: '',
                password: '',
                role: 'supplier'
            });
            setEditingSupplierId(null);
            setShowModal(false);
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Failed to process supplier');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    const handlePasswordReset = async (email) => {
        if (window.confirm(`Send password reset email to ${email}?`)) {
            try {
                await sendPasswordResetEmail(auth, email);
                toast.success(`Password reset email sent to ${email}`);
            } catch (err) {
                toast.error(`Failed to send reset email: ${err.message}`);
            }
        }
    };

    const openCreateModal = () => {
        setFormData({
            vendorId: '',
            name: '',
            phone: '',
            country: '',
            location: '',
            category: '',
            sunCategory: '',
            supplierType: '',
            email: '',
            password: '',
            role: 'supplier'
        });
        setEditingSupplierId(null);
        setShowModal(true);
    };

    return (
        <div className="supplier-management" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Nav LogoutUser={LogoutUser} />

            <ToastContainer
                position="top-center"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />

            <Container fluid="lg" className="py-4">
                <Card className="shadow-sm mb-4">
                    <Card.Body>
                        <Row className="align-items-center mb-4">
                            <Col>
                                <h2 className="mb-0">Supplier Management</h2>
                                <p className="text-muted mb-0">Manage all supplier accounts and information</p>
                            </Col>
                            <Col xs="auto">
                                <Button
                                    variant="primary"
                                    onClick={openCreateModal}
                                    className="d-flex align-items-center"
                                >
                                    <PlusCircle className="me-2" size={18} />
                                    Add New Supplier
                                </Button>
                            </Col>
                        </Row>

                        <div className="mb-4">
                            <InputGroup>
                                <InputGroup.Text>
                                    <Search />
                                </InputGroup.Text>
                                <Form.Control
                                    type="search"
                                    placeholder="Search suppliers by name, email, vendor ID, category or location..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => setSearchTerm('')}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </InputGroup>
                        </div>

                        {loading && suppliers.length === 0 ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="primary" />
                                <p className="mt-2">Loading suppliers...</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table hover className="mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Category</th>
                                            <th>Sub-Category</th>
                                            <th>Type</th>
                                            <th>Country</th>
                                            <th>Location</th>
                                            <th>Contact</th>
                                            <th className="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSuppliers.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="text-center py-4">
                                                    {searchTerm ?
                                                        'No suppliers match your search criteria' :
                                                        'No suppliers found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredSuppliers.map(supplier => (
                                                <tr key={supplier.id}>
                                                    <td className="align-middle">
                                                        <Badge bg="secondary" className="px-2 py-1">
                                                            {supplier.vendorId}
                                                        </Badge>
                                                    </td>
                                                    <td className="align-middle">
                                                        <div className="d-flex align-items-center">
                                                            <div
                                                                className="avatar-sm me-3 d-flex align-items-center justify-content-center"
                                                                style={{
                                                                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                                                                    borderRadius: '50%',
                                                                    color: '#0d6efd',
                                                                    fontWeight: 'bold',
                                                                    width: 25
                                                                }}
                                                            >
                                                                {supplier.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <h6 className="mb-0">{supplier.name}</h6>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="align-middle">
                                                        <Badge bg="info" className="px-2 py-1 text-capitalize">
                                                            {supplier.category}
                                                        </Badge>
                                                    </td>
                                                    <td className="align-middle">
                                                        <Badge bg="info" className="px-2 py-1 text-capitalize">
                                                            {supplier.subCategory}
                                                        </Badge>
                                                    </td>
                                                    <td className="align-middle">
                                                        <Badge bg="warning" className="px-2 py-1 text-capitalize">
                                                            {supplier.supplierType || 'N/A'}
                                                        </Badge>
                                                    </td>
                                                    <td className="align-middle">{supplier.country}</td>
                                                    <td className="align-middle">{supplier.location}</td>
                                                    <td className="align-middle">
                                                        <div>
                                                            <div>{supplier.phone}</div>
                                                            <small className="text-muted">{supplier.email}</small>
                                                        </div>
                                                    </td>
                                                    <td className="align-middle text-end">
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            className="me-2"
                                                            onClick={() => handleEdit(supplier)}
                                                            disabled={loading}
                                                        >
                                                            <PencilFill className="me-1" /> Edit
                                                        </Button>
                                                        <Button
                                                            variant="outline-info"
                                                            size="sm"
                                                            className="me-2"
                                                            onClick={() => handlePasswordReset(supplier.email)}
                                                            disabled={loading}
                                                        >
                                                            <KeyFill className="me-1" /> Reset
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleDelete(supplier.id)}
                                                            disabled={loading}
                                                        >
                                                            <TrashFill className="me-1" /> Delete
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </Card.Body>
                </Card>

                {/* Add/Edit Supplier Modal */}
                <Modal show={showModal} onHide={() => setShowModal(false)} size='lg' >
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="h5">
                            {editingSupplierId ? 'Edit Supplier' : 'Add New Supplier'}
                        </Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleSubmit}>
                        <Modal.Body className="pt-0">
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Supplier ID</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="vendorId"
                                            value={formData.vendorId}
                                            onChange={handleInputChange}
                                            placeholder="Enter supplier ID"
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Supplier Name</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            placeholder="Enter supplier name"
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Form.Group className="mb-3">
                                    <Form.Label>Supplier Type</Form.Label>
                                    <Form.Select
                                        name="supplierType"
                                        value={formData.supplierType}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">Select supplier type</option>
                                        {supplierTypes.map((type, index) => (
                                            <option key={index} value={type}>{type}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Category</Form.Label>
                                        <Form.Select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Select a Category</option>
                                            {categories.map((category, index) => (
                                                <option key={index} value={category}>{category}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Sub Category</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="subCategory"
                                            value={formData.subCategory}
                                            onChange={handleInputChange}
                                            placeholder="Enter Sub Category"
                                            required
                                        />
                                    </Form.Group>
                                </Col>

                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Country</Form.Label>
                                        <Select
                                            options={countryOptions}
                                            value={countryOptions.find(option => option.value === formData.country)}
                                            onChange={(selectedOption) =>
                                                setFormData({ ...formData, country: selectedOption.value })
                                            }
                                            placeholder="Search and select a country"
                                            isSearchable
                                            required

                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Location</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleInputChange}
                                            placeholder="Enter location"
                                            required
                                        />
                                    </Form.Group>
                                </Col>

                            </Row>
                            <Form.Group className="mb-3">
                                <Form.Label>Phone Number</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="Enter phone number"
                                    required
                                />
                            </Form.Group>

                            {!editingSupplierId && (
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Email Address</Form.Label>
                                            <Form.Control
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                placeholder="Enter email"
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Password</Form.Label>
                                            <Form.Control
                                                type="password"
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                placeholder="Enter password"
                                                minLength="8"
                                                required
                                            />
                                            <Form.Text className="text-muted">
                                                Minimum 8 characters
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            )}
                        </Modal.Body>
                        <Modal.Footer className="border-0">
                            <Button
                                variant="light"
                                onClick={() => setShowModal(false)}
                                className="px-4"
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                className="px-4"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Processing...
                                    </>
                                ) : editingSupplierId ? (
                                    'Update Supplier'
                                ) : (
                                    'Create Supplier'
                                )}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </Container>
        </div>
    );
}