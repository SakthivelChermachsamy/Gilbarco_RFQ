import { Link } from 'react-router-dom';
import logo from '../../assets/logo.svg';
import profile from '../../assets/profile.svg';
import { useAuth } from '../../services/AuthContext';
import { auth } from '../../firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';

export default function Nav({ LogoutUser }) {
  const { name, role } = useAuth();
  const [isResetting, setIsResetting] = useState(false);

  const ResetPassword = async () => {
    try {
      setIsResetting(true);
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
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm py-3 sticky-top">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center" to="/Source_dashboard">
          <img src={logo} alt="Company Logo" style={{ width: '180px', height: 'auto' }} className="me-2" />
        </Link>

        <button 
          className="navbar-toggler border-0" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarSupportedContent" 
          aria-controls="navbarSupportedContent" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav gap-1 gap-lg-3 ms-auto mb-2 mb-lg-0 align-items-lg-center">
            <li className="nav-item">
              <Link 
                to="/Source_dashboard" 
                className="nav-link px-3 py-2 rounded-3 d-flex align-items-center text-dark"
                style={{ transition: 'all 0.3s ease' }}
                activeclassname="active"
              >
                <i className="bi bi-house-door me-2 text-primary"></i>
                Home
              </Link>
            </li>

            {role === 'admin' && (
              <li className="nav-item">
                <Link 
                  to="/User" 
                  className="nav-link px-3 py-2 rounded-3 d-flex align-items-center text-dark"
                  style={{ transition: 'all 0.3s ease' }}
                  activeclassname="active"
                >
                  <i className="bi bi-people me-2 text-primary"></i>
                  User Management
                </Link>
              </li>
            )}

            <li className="nav-item dropdown">
              <a 
                className="nav-link dropdown-toggle px-3 py-2 rounded-3 d-flex align-items-center text-dark"
                style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                role="button" 
                data-bs-toggle="dropdown" 
                aria-expanded="false"
              >
                <i className="bi bi-truck me-2 text-primary"></i>
                Suppliers
              </a>
              <ul className="dropdown-menu dropdown-menu-lg-end border-0 shadow">
                <li>
                  <Link to="/suppliers-reply" className="dropdown-item d-flex align-items-center py-2">
                    <i className="bi bi-chat-square-text me-2 text-muted"></i>
                    Suppliers Reply
                  </Link>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <Link to='/Supplier_edit' className="dropdown-item d-flex align-items-center py-2">
                    <i className="bi bi-pencil-square me-2 text-muted"></i>
                    Edit Suppliers
                  </Link>
                </li>
              </ul>
            </li>

            <li className="nav-item dropdown">
              <a 
                className="nav-link dropdown-toggle px-3 py-2 rounded-3 d-flex align-items-center text-dark"
                style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                role="button" 
                data-bs-toggle="dropdown" 
                aria-expanded="false"
              >
                <i className="bi bi-file-earmark-text me-2 text-primary"></i>
                Quotations
              </a>
              <ul className="dropdown-menu dropdown-menu-lg-end border-0 shadow">
                <li>
                  <Link className="dropdown-item d-flex align-items-center py-2" to='/New_Quotation'>
                    <i className="bi bi-plus-circle me-2 text-muted"></i>
                    New Quotation
                  </Link>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <Link className="dropdown-item d-flex align-items-center py-2" to='/quotations'>
                    <i className="bi bi-collection me-2 text-muted"></i>
                    View Quotations
                  </Link>
                </li>
              </ul>
            </li>

            <li className="nav-item dropdown ms-lg-2">
              <a 
                className="nav-link dropdown-toggle d-flex align-items-center px-3 py-2 rounded-3 text-dark"
                style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                role="button" 
                data-bs-toggle="dropdown" 
                aria-expanded="false"
              >
                <div className="position-relative">
                  <img 
                    src={profile} 
                    className="rounded-circle me-2 border border-light" 
                    style={{ width: '32px', height: '32px', objectFit: 'cover' }} 
                    alt="Profile" 
                  />
                  {role === 'admin' && (
                    <span className="position-absolute bottom-0 end-0 bg-success rounded-circle border border-white" style={{ width: '10px', height: '10px' }}></span>
                  )}
                </div>
                <span className="d-none d-lg-inline">{name || 'Profile'}</span>
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
                    <small className="text-muted">{role === 'admin' ? 'Admin' : 'User'}</small>
                  </div>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button 
                    className="dropdown-item d-flex align-items-center py-2" 
                    onClick={ResetPassword}
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-key me-2"></i>
                        Reset Password
                      </>
                    )}
                  </button>
                </li>
                <li>
                  <button 
                    className="dropdown-item d-flex align-items-center py-2 text-danger" 
                    onClick={LogoutUser}
                  >
                    <i className="bi bi-box-arrow-right me-2"></i>
                    Sign Out
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}