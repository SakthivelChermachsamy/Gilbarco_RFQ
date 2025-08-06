import task from '../../assets/task.svg'
import data from '../../assets/data.svg'
import auth from '../../assets/auth.svg'
import easy from '../../assets/easy.svg'
import simp from '../../assets/simp.svg'
import { motion } from "framer-motion";

export default function Features() {
    return (
        <div className="container my-4 mx-auto py-5">
            <motion.div className="row vh-80" initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                <div className="col-lg-6 d-flex flex-column justify-content-center align-items-center my-4">
                    <h2 className="mb-4">Automate RFQs for faster sourcing and quicker vendor responses</h2>
                    <h5>Connect with the right suppliers, reduce manual effort, and speed up your procurement cycle.</h5>
                    <ul className='me-auto mt-3 '>
                        <li>Automated RFQ Workflow</li>
                        <li>Real-Time Vendor Responses</li>
                        <li>Centralized Platform for Sourcing & Supply</li>
                    </ul>
                </div>
                <div className="col-lg-6 d-flex justify-content-center">
                    <img src={task} alt="" className='w-75' />
                </div>
            </motion.div>
            <motion.div className="row vh-100" initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}>
                <div className="col-lg-6 d-flex justify-content-center" >
                    <img src={simp} alt="" className='w-75' />
                </div>
                <div className="col-lg-6 d-flex flex-column justify-content-center  my-4">
                    <h2 className="mb-4">
                        Simple, Efficient, and User-Friendly
                    </h2>
                    <h5>
                        Whether you're sourcing products or submitting quotes, our platform makes it effortless. No complex setup — just sign up and start connecting.
                    </h5>
                    <ul className="me-auto mt-3">
                        <li>Buyers: Create and send RFQs in just a few clicks</li>
                        <li>Vendors: Get notified instantly and respond with real-time quotes</li>
                        <li>Track all communications and updates from a single dashboard</li>
                    </ul>
                </div>
            </motion.div>
            <motion.div className="row d-flex justify-content-around mb-5 rounded rounded-lg" initial={{ x: -300, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}>
                <div class="card col-lg-4 d-flex align-items-center flex-column py-4 border-0" style={{ width: "18rem" }}>
                    <img src={data} class="card-img-top ratio ratio-1X1" alt="..." />
                    <div class="card-body d-flex align-items-center">
                        <h6>Data hosted on Google Cloud</h6>
                    </div>
                </div>
                <div class="card col-lg-4 d-flex align-items-center flex-column py-4 border-0" style={{ width: "18rem" }}>
                    <img src={auth} class="card-img-top ratio ratio-1X1" alt="..." />
                    <div class="card-body d-flex align-items-center">
                        <h6>Secure Authentication</h6>
                    </div>
                </div>
                <div class="card col-lg-4 d-flex align-items-center flex-column py-4 border-0" style={{ width: "18rem" }}>
                    <img src={easy} class="card-img-top w-75" alt="..." />
                    <div class="card-body d-flex align-items-center">
                        <h6>Easy Work Flow</h6>
                    </div>
                </div>

            </motion.div>

        </div>
    )
}