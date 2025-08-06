import logo from '../../assets/logo.svg'
import {Link} from 'react-router-dom'
export default function Navbar() {

    return (
        <nav className="navbar navbar-expand-lg bg-white  py-3  sticky-top border-bottom">
            <div className="container ">
                <a className="navbar-brand" href="#">
                    <img src={logo} alt="Bootstrap" style={{ width: 200 + 'px' }} />
                </a>
                <Link to='/login'class="btn text-white" style={{width :"100px", backgroundColor:"#236192"}}>Login</Link>
            </div>
        </nav>
    )
}