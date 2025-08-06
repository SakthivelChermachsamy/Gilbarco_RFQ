import Pending_Enquiry from "../../components/Supplier/Pending_Enquiry";
import Supplier_RFQ_List from "../../components/Supplier/Supplier_RFQ_List";
import Nav from '../../components/Supplier/Nav'
import { Logout, isAuthenticated } from '../../services/Auth';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/AuthContext';
import Page404 from "../Landingpage/Page404";
export default function Vendor_Home() {
    const navigate = useNavigate();
    const LogoutUser =()=>{
        Logout();
        navigate('/login');
    }
    const { role } = useAuth();
    if(role !== 'supplier'){
        return <Page404 />
    }
    if(!isAuthenticated()){
            return <Navigate to="/login"/>
        }
    return (
        <>
        <Nav LogoutUser={LogoutUser}/>
        <div className='container px-6'>
            <div className=''>
                <div className='p-4 '>
                    <Pending_Enquiry/>
                </div>
            </div>
            <div className=' '>
                <div className='px-4 pb-4'>
                    <Supplier_RFQ_List/>
                </div>
            </div>
        </div>
        </>
    );
}