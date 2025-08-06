import banner from '../../assets/banner.png'
export default function Hero() {
    return (
        <div className="">
            <div id="carouselExampleAutoplaying" class="carousel slide" data-bs-ride="carousel">
                <div class="carousel-inner">
                    <div class="carousel-item active">
                        <img src={banner} class="d-block w-100" alt="..."/>
                    </div>
                    
                </div>
            </div>
        </div>
    )
}