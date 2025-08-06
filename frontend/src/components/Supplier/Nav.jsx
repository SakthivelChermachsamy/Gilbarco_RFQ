import { Link, useLocation } from 'react-router-dom';
import profile from '../../assets/profile.svg';
import logo from '../../assets/logo.svg';
import { useAuth } from '../../services/AuthContext';
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FiLogOut, FiUser, FiHome, FiFileText, FiList, FiKey } from 'react-icons/fi';
import { IoMdNotificationsOutline } from 'react-icons/io';

export default function Navbar({ LogoutUser }) {
    const [pendingCount, setPendingCount] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const { pathname } = useLocation();
    const { name, role } = useAuth();

    const ResetPassword = async () => {
        try {
            const user = auth.currentUser;
            if (!user || !user.email) {
                alert('No user is currently signed in or user has no email address.');
                return;
            }

            await sendPasswordResetEmail(auth, user.email);
            alert('Password reset email sent! Please check your inbox.');
            LogoutUser()
            
        } catch (error) {
            console.error('Error sending password reset email:', error);
            alert(`Error sending password reset email: ${error.message}`);
        }
    };

    useEffect(() => {
        const fetchPendingRFQCount = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                const userId = user.uid;
                const rfqsRef = collection(db, 'quotations');
                const rfqsQuery = query(
                    rfqsRef,
                    where('suppliers', 'array-contains', userId),
                    where('status', '==', 'pending')
                );
                const rfqsSnapshot = await getDocs(rfqsQuery);

                const repliesRef = collection(db, 'supplier_replies');
                const repliesQuery = query(
                    repliesRef,
                    where('supplier.id', '==', userId)
                );
                const repliesSnapshot = await getDocs(repliesQuery);

                const submittedRfqIds = repliesSnapshot.docs.map(doc => doc.data().rfqId);
                const pendingRFQs = rfqsSnapshot.docs.filter(
                    doc => !submittedRfqIds.includes(doc.id)
                );

                setPendingCount(pendingRFQs.length);
            } catch (error) {
                console.error('Error fetching pending RFQ count:', error);
            }
        };

        const unsubscribe = auth.onAuthStateChanged(() => {
            fetchPendingRFQCount();
        });

        return () => unsubscribe();
    }, []);

    const isActive = (path) => pathname === path;
    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm py-2 sticky-top">
            <div className="container px-4">
                <Link className="navbar-brand d-flex align-items-center" to="/Supplier_Dashboard">
                    <img src={logo} alt="Company Logo" style={{ width: '180px', height: 'auto' }} />
                </Link>
                <button
                    className="navbar-toggler border-0 ms-auto"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#mainNavbar"
                    aria-controls="mainNavbar"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="mainNavbar">
                    <ul className="navbar-nav ms-auto mb-2 mb-lg-0 gap-3">
                        <li className="nav-item">
                            <Link
                                className={`nav-link px-3 py-2 rounded-3 d-flex align-items-center ${isActive('/Supplier_Dashboard') ? 'active bg-light' : 'text-dark'}`}
                                to="/Supplier_Dashboard"
                                style={{ transition: 'all 0.3s ease' }}
                            >
                                <FiHome className="me-2 text-primary" />
                                Home
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link
                                className={`nav-link px-3 py-2 rounded-3 d-flex align-items-center position-relative ${isActive('/rfq') ? 'active bg-light' : 'text-dark'}`}
                                to="/rfq"
                                style={{ transition: 'all 0.3s ease' }}
                            >
                                <FiFileText className="me-2 text-primary" />
                                Pending RFQs
                                {pendingCount > 0 && (
                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link
                                className={`nav-link px-3 py-2 rounded-3 d-flex align-items-center ${isActive('/allrfq') ? 'active bg-light' : 'text-dark'}`}
                                to="/allrfq"
                                style={{ transition: 'all 0.3s ease' }}
                            >
                                <FiList className="me-2 text-primary" />
                                All RFQs
                            </Link>
                        </li>
                    </ul>

                    <div className="d-flex align-items-center ms-lg-3">
                       
                        <div className="dropdown">
                            <a
                                className="nav-link dropdown-toggle d-flex align-items-center px-3 py-2 rounded-3 text-dark"
                                style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                                role="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                            >
                                <img
                                    src={profile}
                                    className="rounded-circle me-2 border border-light"
                                    style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                                    alt="Profile"
                                />
                                <span className="d-none d-md-inline">{name || 'Profile'}</span>
                            </a>
                            <ul className="dropdown-menu dropdown-menu-lg-end border-0 shadow">
                                <li>
                                    <div className="dropdown-header text-center py-2">
                                        <img
                                            src={profile}
                                            className="rounded-circle mb-2 border"
                                            style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                                            alt="Profile"
                                        />
                                        <h6 className="mb-0">{name || 'User'}</h6>
                                        <small className="text-muted">{"Supplier"}</small>
                                    </div>
                                </li>
                                <li>
                                    <button
                                        className="dropdown-item d-flex align-items-center py-2 "
                                        onClick={ResetPassword}
                                    >
                                        <FiKey className="me-2" /> Reset Password
                                    </button>
                                </li>
                                <li>
                                    <button
                                        className="dropdown-item d-flex align-items-center py-2 text-danger"
                                        onClick={LogoutUser}
                                    >
                                        <FiLogOut className="me-2" /> Sign Out
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .navbar {
                    z-index: 1030;
                }
                .nav-link {
                    transition: all 0.2s ease;
                    position: relative;
                }
                .nav-link.active {
                    font-weight: 500;
                }
                .cursor-pointer {
                    cursor: pointer;
                }
                .dropdown-toggle::after {
                    display: none;
                }
                @media (max-width: 991.98px) {
                    .navbar-collapse {
                        padding-top: 1rem;
                    }
                    .d-flex.align-items-center {
                        margin-top: 1rem;
                        justify-content: center;
                    }
                }
            `}</style>
        </nav>
    );
}