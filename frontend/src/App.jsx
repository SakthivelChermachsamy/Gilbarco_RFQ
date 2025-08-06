import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Lander from './pages/Landingpage/Lander.jsx'
import Login from './pages/Login.jsx'
import { Route, Routes } from 'react-router-dom'
import Source_dashboard from './pages/Source/Source_dashboard.jsx'
import SupplierEdit from './pages/Source/Supplier_edit.jsx'
import New_Quotation from './pages/Source/New_Quotation.jsx'
import QuotationView from '../src/components/Source/QuotationView.jsx'
import User from './pages/Source/User'
import ProtectedUser from './Protected/ProtectedUser.jsx'
import Supplier_dashboard from './pages/Supplier/Supplier_Dashboard.jsx'
import SupplierRFQView from './pages/Supplier/SupplierRFQView.jsx'
import RFQView from './pages/Supplier/RfqView.jsx'
import QuotationList from './pages/Source/QuotationList.jsx'
import Supplier_Initial_Offer from './pages/Supplier/Supplier_Initial_Offer.jsx'
import Offer_Details from './pages/Supplier/Offer_Details.jsx';
import RFQRepliesPage from './pages/Source/RFQRepliesPage.jsx';
import SupplierReplies from './components/Source/SupplierReplies.jsx'
import Supplier_Requote from './pages/Supplier/Supplier_requote.jsx';
import Page404 from './pages/Landingpage/Page404.jsx';
function App() {

  return (
    <div>
      <Routes>
        <Route path='/' element={<Lander />} />
        <Route path='/login' element={<Login />} />
        <Route path='/Source_dashboard' element={<Source_dashboard />} />
        <Route path="/quotations" element={<QuotationList />} />
        <Route path="/quotations/:id" element={<QuotationView />} />
        <Route path="/suppliers-reply" element={<RFQRepliesPage />} />
        <Route path='/Supplier_edit' element={<SupplierEdit />} />
        <Route path='/New_Quotation' element={<New_Quotation />} />
        <Route path="/supplier-replies/:rfqId" element={<SupplierReplies />} />

        <Route
          path="/User"
          element={
            <ProtectedUser roles={['admin']}>
              <User />
            </ProtectedUser>
          }
        />

        <Route path='/Supplier_dashboard' element={<Supplier_dashboard />} />
        <Route path='/404' element={<Page404/>} />
        <Route path="/rfq" element={<SupplierRFQView />} />
        <Route path="/allrfq" element={<RFQView />} />
        <Route path='/supplier_initial_offer/:rfqId' element={<Supplier_Initial_Offer />} />
        <Route path='/offer_details/:replyId' element={<Offer_Details />} />
        <Route path='/supplier_requote/:rfqId' element={<Supplier_Requote />} />
      </Routes>
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        theme="colored"
      />
    </div>

  )
}

export default App
