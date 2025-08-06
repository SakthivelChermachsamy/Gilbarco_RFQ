import logo from '../../assets/logofoot.png'

export default function Footer() {
    return (
       <div style={{backgroundColor:"#001e32" ,color:"white"}} className=' pt-5'>
         <div className="container px-4">
            <div className="row">
                <div className="col-lg-3">
                    <img src={logo} alt="" style={{ width: 200 + 'px' }} />
                </div>
                <div className="col-lg-2 ">
                    <h4>Link</h4>
                    <ul className="list-unstyled d-flex flex-column gap-3 mt-3">
                        <li>Home</li>
                        <li>Demo</li>
                        <li>Feature</li>
                    </ul>
                </div>
                <div className="col-lg-3 ">
                    <h4>Legal</h4>
                    <ul className="list-unstyled  d-flex flex-column gap-3 mt-3">
                        <li>Terms & conditions</li>
                        <li>Privacy policy</li>
                    </ul>
                </div>
                <div className="col-lg-4">
                    <h4>Contact us</h4>
                    <ul className="list-unstyled  d-flex flex-column gap-3 mt-3">
                        <li><a href="mailto:" className='text-white'>examble@gibarco.in</a></li>
                        <li>Phone No: 84843 94039</li>
                        <div class="input-group mb-3 border-0">
                            <input type="text" class="form-control form-control-sm border-0" placeholder="Request Access" aria-label="" aria-describedby="basic-addon2" />
                                <span class="input-group-text" id="basic-addon2" style={{backgroundColor:"#6b9348"}}><button type="button" class="btn">Send</button></span>
                        </div>
                    </ul>
                </div>
            </div>
        </div>
       </div>
    )
}