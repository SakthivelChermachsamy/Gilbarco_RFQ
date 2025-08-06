
import Listing from '../../components/Source/Listing'
import Nav from '../../components/Source/Nav'
import { Navigate, useNavigate } from 'react-router-dom';
import { Logout } from '../../services/Auth';
import { isAuthenticated } from '../../services/Auth';
import { useAuth } from '../../services/AuthContext';
import Page404 from '../Landingpage/Page404';

function App() {
   if (!isAuthenticated()) {
        return <Navigate to="/login" />
    }
    const { role } = useAuth();
    if(!(role === 'user' || role ==='admin')){
      return <Page404 />
    }
    const navigate = useNavigate();
    const LogoutUser = () => {
        Logout();
        navigate('/login');
      }

  return (
   <div>
     <Nav LogoutUser={LogoutUser}/>
     <Listing />
   </div>
  )
}

export default App
