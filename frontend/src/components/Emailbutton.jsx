import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';

const Emailbutton = ({ userEmail }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ message: '', isError: false });
  const [showConfirm, setShowConfirm] = useState(false);

  const handleResetPassword = async () => {
    if (!userEmail) {
      setStatus({ message: 'No user selected', isError: true });
      return;
    }

    setLoading(true);
    setStatus({ message: '', isError: false });

    try {
      await sendPasswordResetEmail(auth, userEmail);
      setStatus({ message: `Password reset email sent to ${userEmail}`, isError: false });
    } catch (error) {
      setStatus({ message: `Error: ${error.message}`, isError: true });
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="reset-password-container">
      <button
        className="reset-btn"
        onClick={() => setShowConfirm(true)}
        disabled={loading || !userEmail}
      >
        {loading ? (
          <span className="loading">
            <span className="spinner">↻</span> Sending...
          </span>
        ) : (
          'Send Password Reset Email'
        )}
      </button>

      {showConfirm && (
        <div className="confirmation-modal">
          <div className="modal-content">
            <h3>Confirm Password Reset</h3>
            <p>Send password reset email to <strong>{userEmail}</strong>?</p>
            <div className="modal-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn" 
                onClick={handleResetPassword}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {status.message && (
        <div className={`status-message ${status.isError ? 'error' : 'success'}`}>
          {status.message}
          <button 
            className="close-status" 
            onClick={() => setStatus({ message: '', isError: false })}
          >
            ×
          </button>
        </div>
      )}

      <style jsx>{`
        .reset-password-container {
          position: relative;
          margin: 20px 0;
        }
        
        .reset-btn {
          background-color: #ffc107;
          color: #212529;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        
        .reset-btn:hover:not(:disabled) {
          background-color: #e0a800;
        }
        
        .reset-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .loading {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .confirmation-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          max-width: 400px;
          width: 90%;
        }
        
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }
        
        .cancel-btn {
          background: #f8f9fa;
          border: 1px solid #ddd;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .confirm-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .confirm-btn:hover {
          background: #c82333;
        }
        
        .status-message {
          margin-top: 10px;
          padding: 10px;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .close-status {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 0 0 0 10px;
        }
      `}</style>
    </div>
  );
};

export default Emailbutton;