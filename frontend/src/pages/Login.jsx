import Logo from '../assets/logo.svg';
import '../css/login.css'
import { useState } from 'react';
import { signInWithEmailAndPassword, setPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from '../firebaseConfig';
import { isAuthenticated } from '../services/Auth';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

export default function Login() {
    const { isSupplier, setUser } = useAuth();

    const initialStateErrors = {
        custom_error: null
    };
    const [errors, setErrors] = useState(initialStateErrors);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [inputs, setInputs] = useState({
        email: '',
        password: '',
    });

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrors(initialStateErrors);
        setLoading(true);

        try {
            await setPersistence(auth, browserSessionPersistence);
            const userCredential = await signInWithEmailAndPassword(
                auth,
                inputs.email,
                inputs.password
            );
            setUser(userCredential.user);

        } catch (e) {
            let errorMessage = "Invalid email or password";

            if (e.code === 'auth/network-request-failed') {
                errorMessage = "Check your internet connection";
            } else if (e.code === 'auth/too-many-requests') {
                errorMessage = "Account temporarily locked due to many failed attempts";
            } else if (e.code === 'auth/user-not-found') {
                errorMessage = "User not found";
            } else if (e.code === 'auth/wrong-password') {
                errorMessage = "Incorrect password";
            }

            setErrors({ custom_error: errorMessage });
        } finally {
            setLoading(false);
        }
    }

    const handleInputChange = (event) => {
        setInputs({ ...inputs, [event.target.name]: event.target.value });
    }

    if (isAuthenticated()) {
        if (isSupplier) {
            return <Navigate to="/Supplier_dashboard" replace />;
        } else {
            return <Navigate to="/Source_dashboard" replace />;
        }
    }

    return (
        <div className="w-100 d-flex justify-content-center vh-100 align-items-center bg-section shadow-lg">
            <div style={{ width: '500px' }} className='container border rounded-2 p-2 shadow-lg bg-white bg-opacity-75 backdrop-blur'>
                <div className='d-flex flex-column align-items-center mt-5 mb-3'>
                    <img width="200px" src={Logo} alt="" className='mb-3' />
                    <h1 className='fs-2'>Login</h1>
                </div>

                <form onSubmit={handleSubmit} className="d-flex flex-column align-items-center">
                    <div className="mb-3 w-75">
                        <label htmlFor="email" className="form-label">Email address</label>
                        <input
                            type="email"
                            className="form-control form--lg"
                            id="email"
                            onChange={handleInputChange}
                            aria-describedby="emailHelp"
                            name='email'
                            required
                            style={{ padding: "10px" }}
                            autoComplete="username"
                        />
                    </div>

                    <div className="mb-4 w-75">
                        <label htmlFor="password" className="form-label">Password</label>
                        <div className="input-group">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-control form-control-lg"
                                id="password"
                                onChange={handleInputChange}
                                name="password"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                className="btn border bg-white"
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z" />
                                        <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z" />
                                        <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" />
                                        <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {errors.custom_error && (
                        <div className="alert alert-danger w-75" role="alert">
                            {errors.custom_error}
                        </div>
                    )}

                    <a href="/forgot-password" className="mb-3">Forgot Password?</a>

                    <button
                        type="submit"
                        className="btn btn-primary my-3 w-25"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        ) : (
                            'Login'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}