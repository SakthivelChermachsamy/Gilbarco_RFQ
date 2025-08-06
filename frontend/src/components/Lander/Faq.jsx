
export default function Faq() {
    return (
        <div  style={{ backgroundColor: "#f7faff", paddingBottom:"15px" }}>
            <div className="container">
            <div className="row d-flex justify-content-evenly mb-5" style={{ backgroundColor: "#f7faff" }}>
                <h1 className='text-center mb-5 pt-5 d-flex justify-content-between'>FAQ - Questions & Answers</h1>
                <div className="col-lg-5 ">
                    <div class="accordion " id="accordionExample">
                        <div class="accordion-item mb-4">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="false" aria-controls="collapseOne">
                                    What is an RFQ platform and how does it work?
                                </button>
                            </h2>
                            <div id="collapseOne" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                                <div class="accordion-body">
                                    An RFQ platform allows buyers to request price quotations from multiple vendors in one place. You simply create an RFQ with the required product or service details, and vendors respond with their offers — saving time and reducing manual follow-up.
                                </div>
                            </div>
                        </div>
                        <div class="accordion-item mb-4">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
                                    Who can use this platform — buyers, vendors, or both?
                                </button>
                            </h2>
                            <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                                <div class="accordion-body">
                                    Both! Buyers can post RFQs to find the best deals, and vendors can browse opportunities and submit quotes. The platform bridges both sides for faster, more efficient procurement.
                                </div>
                            </div>
                        </div>
                        <div class="accordion-item mb-4">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
                                     How long does it take to create an RFQ?
                                </button>
                            </h2>
                            <div id="collapseThree" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                                <div class="accordion-body">
                                    Creating an RFQ takes just a few minutes. Our guided form helps you specify your requirements clearly, ensuring you get accurate and competitive vendor responses.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-lg-5">
                    <div class="accordion" id="accordionExample">
                        <div class="accordion-item mb-4">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapsefour" aria-expanded="false" aria-controls="collapsefour">
                                     Can I track and manage multiple RFQs at once?
                                </button>
                            </h2>
                            <div id="collapsefour" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                                <div class="accordion-body">
                                    Yes, the platform offers a centralized dashboard where you can manage all your RFQs, view vendor responses, compare quotes, and track status updates in real time.
                                </div>
                            </div>
                        </div>
                        <div class="accordion-item mb-4">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapsefive" aria-expanded="false" aria-controls="collapsefive">
                                    Is there any cost associated with using this platform?
                                </button>
                            </h2>
                            <div id="collapsefive" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                                <div class="accordion-body">
                                   No, this platform is built and maintained internally by our company. It is free to use for all authorized employees and approved vendors within our procurement ecosystem.
                                </div>
                            </div>
                        </div>
                        <div class="accordion-item mb-4">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapsesix" aria-expanded="false" aria-controls="collapsesix">
                                    How are vendors added to the platform?
                                </button>
                            </h2>
                            <div id="collapsesix" class="accordion-collapse collapse" data-bs-parent="#accordionExample">
                                <div class="accordion-body">
                                    Vendors are onboarded by our internal procurement team based on existing relationships, compliance checks, and strategic sourcing needs. Only verified and approved vendors are granted access to view and respond to RFQs.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
    )
}