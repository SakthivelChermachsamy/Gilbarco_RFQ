import { isAuthenticated, Logout } from '../../services/Auth';
import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { auth } from '../../firebaseConfig';
import axios from 'axios';
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
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Nav from '../../components/Source/Nav';
import { Search } from 'react-bootstrap-icons';

const User = () => {
    const navigate = useNavigate();

    if (!isAuthenticated()) {
        return <Navigate to="/login" />;
    }

    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('create');
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'user'
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = await auth.currentUser.getIdToken();
                const response = await axios.get('http://localhost:3000/users', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUsers(response.data);
                setFilteredUsers(response.data);
            } catch (error) {
                toast.error('Failed to fetch users: ' + error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(user =>
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.role.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    }, [searchTerm, users]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });

        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: null
            });
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (modalType === 'create') {
            if (!formData.email) newErrors.email = 'Email is required';
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                newErrors.email = 'Invalid email format';
            }

            if (!formData.password) newErrors.password = 'Password is required';
            else if (formData.password.length < 8) {
                newErrors.password = 'Password must be at least 8 characters';
            }
        }

        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.role) newErrors.role = 'Role is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();

            if (modalType === 'create') {
                await axios.post('http://localhost:3000/create-user', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('User created successfully');
            } else {
                await axios.patch('http://localhost:3000/update-user', {
                    uid: currentUser.id,
                    name: formData.name,
                    role: formData.role
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('User updated successfully');
            }

            const response = await axios.get('http://localhost:3000/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
            setShowModal(false);
        } catch (error) {
            toast.error(`Failed to ${modalType} user: ${error.response?.data?.error || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                setLoading(true);
                const token = await auth.currentUser.getIdToken();
                await axios.delete('http://localhost:3000/delete-user', {
                    data: { uid: userId },
                    headers: { Authorization: `Bearer ${token}` }
                });

                setUsers(users.filter(user => user.id !== userId));
                toast.success('User deleted successfully');
            } catch (error) {
                toast.error('Failed to delete user: ' + error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleResetPassword = async (email) => {
        if (window.confirm(`Send password reset email to ${email}?`)) {
            try {
                await auth.sendPasswordResetEmail(email);
                toast.success(`Password reset email sent to ${email}`);
            } catch (error) {
                toast.error('Failed to send reset email: ' + error.message);
            }
        }
    };

    const openEditModal = (user) => {
        setModalType('edit');
        setCurrentUser(user);
        setFormData({
            email: user.email,
            password: '',
            name: user.name,
            role: user.role
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setModalType('create');
        setCurrentUser(null);
        setFormData({
            email: '',
            password: '',
            name: '',
            role: 'user'
        });
        setShowModal(true);
    };

    const LogoutUser = () => {
        auth.signOut();
        navigate('/login');
    };

    return (
        <div className="user-management" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <Nav LogoutUser={LogoutUser} />

            <Container fluid="lg" className="py-4">
                <Card className="shadow-sm mb-4">
                    <Card.Body>
                        <Row className="align-items-center mb-4">
                            <Col>
                                <h2 className="mb-0">User Management</h2>
                                <p className="text-muted mb-0">Manage system users and permissions</p>
                            </Col>
                            <Col xs="auto">
                                <Button
                                    variant="primary"
                                    onClick={openCreateModal}
                                    className="d-flex align-items-center"
                                >
                                    <i className="bi bi-plus-lg me-2"></i> Add New User
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
                                    placeholder="Search users by name, email or role..."
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

                        {loading && users.length === 0 ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="primary" />
                                <p className="mt-2">Loading users...</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <Table hover className="mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: '25%' }}>User</th>
                                            <th style={{ width: '30%' }}>Email</th>
                                            <th style={{ width: '15%' }}>Role</th>
                                            <th style={{ width: '30%' }} className="text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="text-center py-4">
                                                    {searchTerm ?
                                                        'No users match your search criteria' :
                                                        'No users found'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map(user => (
                                                <tr key={user.id}>
                                                    <td className="align-middle">
                                                        <div className="d-flex align-items-center">
                                                            <div
                                                                className="avatar-sm me-3 d-flex align-items-center justify-content-center"
                                                                style={{
                                                                    backgroundColor: user.role === 'admin' ?
                                                                        'rgba(220, 53, 69, 0.1)' :
                                                                        'rgba(13, 110, 253, 0.1)',
                                                                    borderRadius: '50%',
                                                                    color: user.role === 'admin' ?
                                                                        '#dc3545' : '#0d6efd',
                                                                    fontWeight: 'bold',
                                                                    width: 25
                                                                }}
                                                            >
                                                                {user.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <h6 className="mb-0">{user.name}</h6>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="align-middle">{user.email}</td>
                                                    <td className="align-middle">
                                                        <Badge
                                                            bg={user.role === 'admin' ? 'danger' : 'primary'}
                                                            className="px-3 py-2"
                                                            style={{
                                                                fontSize: '0.8rem',
                                                                borderRadius: '12px'
                                                            }}
                                                        >
                                                            {user.role.toUpperCase()}
                                                        </Badge>
                                                    </td>
                                                    <td className="align-middle text-end">
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            className="me-2"
                                                            onClick={() => openEditModal(user)}
                                                            disabled={loading}
                                                        >
                                                            <i className="bi bi-pencil-fill me-1"></i> Edit
                                                        </Button>
                                                        <Button
                                                            variant="outline-info"
                                                            size="sm"
                                                            className="me-2"
                                                            onClick={() => handleResetPassword(user.email)}
                                                            disabled={loading}
                                                        >
                                                            <i className="bi bi-key-fill me-1"></i> Reset
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleDelete(user.id)}
                                                            disabled={loading}
                                                        >
                                                            <i className="bi bi-trash-fill me-1"></i> Delete
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

                <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="h5">
                            {modalType === 'create' ? 'Create New User' : 'Edit User'}
                        </Modal.Title>
                    </Modal.Header>
                    <Form onSubmit={handleSubmit}>
                        <Modal.Body className="pt-0">
                            <Form.Group className="mb-3">
                                <Form.Label>Full Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    isInvalid={!!errors.name}
                                    placeholder="Enter full name"
                                />
                                <Form.Control.Feedback type="invalid">
                                    {errors.name}
                                </Form.Control.Feedback>
                            </Form.Group>

                            {modalType === 'create' && (
                                <>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Email Address</Form.Label>
                                        <Form.Control
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            isInvalid={!!errors.email}
                                            placeholder="Enter email"
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.email}
                                        </Form.Control.Feedback>
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Password</Form.Label>
                                        <Form.Control
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            isInvalid={!!errors.password}
                                            placeholder="Enter password"
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.password}
                                        </Form.Control.Feedback>
                                        <Form.Text className="text-muted">
                                            Minimum 8 characters
                                        </Form.Text>
                                    </Form.Group>
                                </>
                            )}

                            <Form.Group className="mb-3">
                                <Form.Label>Role</Form.Label>
                                <Form.Select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    isInvalid={!!errors.role}
                                    className="form-select"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">
                                    {errors.role}
                                </Form.Control.Feedback>
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer className="border-0">
                            <Button
                                variant="light"
                                onClick={() => setShowModal(false)}
                                className="px-4"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={loading}
                                className="px-4"
                            >
                                {loading ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Processing...
                                    </>
                                ) : modalType === 'create' ? (
                                    'Create User'
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </Modal.Footer>
                    </Form>
                </Modal>
            </Container>
        </div>
    );
};

export default User;