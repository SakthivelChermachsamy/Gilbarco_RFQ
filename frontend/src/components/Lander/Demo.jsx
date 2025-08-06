

export default function Demo() {
    return (
       <div style={{backgroundColor:"#FFC55A"}}  >
         <div className=" d-flex justify-content-center py-lg-5 container" >
            <div className="row w-75">
                <div className="col-lg-6 my-4 ratio ratio-16x9 d-flex justify-content-center">
                    <iframe  className="rounded embed-responsive-item "  src="https://www.youtube.com/embed/xpwm75uZQBs?si=ZTW11Sb0XRbC0YWM&amp;start=1" title="YouTube video player" frameborder="1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                </div>
            </div>
        </div>
       </div>
    )
}