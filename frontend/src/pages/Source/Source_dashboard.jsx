import Recent from '../../components/Source/Recent';
import { Navigate, useNavigate } from 'react-router-dom';
import Nav from '../../components/Source/Nav';
import { isAuthenticated } from '../../services/Auth';
import { Logout } from '../../services/Auth';
import { useAuth } from '../../services/AuthContext';
import Page404 from '../Landingpage/Page404';

export default function Source_dashboard(){
    const { isUser , isAdmin } = useAuth();
    if(!(isUser || isAdmin)){
        return <Page404 />
    }
    const navigate = useNavigate();
    const handleLogoutDirect = async () => {
    try {
      await Logout();
      navigate('/login'); 
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
    if(!isAuthenticated()){
        return <Navigate to="/login"/>
    }
    return (
        <div>
            <Nav LogoutUser={handleLogoutDirect}/>
            <Recent/>
        </div>
    );
}