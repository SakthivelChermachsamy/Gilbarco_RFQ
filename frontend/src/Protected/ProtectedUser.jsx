import { Navigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";
import Page404 from "../pages/Landingpage/Page404";

const ProtectedUser = ({ children, roles }) => {
  const { user, role, loading } = useAuth();

  if (loading) return <div>Loading...</div>; 

  if (!user) { 
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(role)) { 
    return <Page404 />;
  }

  return children;
};

export default ProtectedUser;