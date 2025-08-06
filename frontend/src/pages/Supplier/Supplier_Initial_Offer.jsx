import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig';
import Nav from '../../components/Supplier/Nav';
import { Logout, isAuthenticated } from '../../services/Auth';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import bootstrap from 'bootstrap/dist/js/bootstrap.bundle.min';
import { useAuth } from '../../services/AuthContext';
import Page404 from '../Landingpage/Page404';

const Supplier_Initial_Offer = () => {
    const { vendorId, role } = useAuth();
    const { rfqId } = useParams();
    const navigate = useNavigate();
    const [rfqDetails, setRfqDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [btnstate, setBtnstate] = useState(true);
    const [buyer, setBuyer] = useState(null);
    const [supplierName, setSupplierName] = useState('');
    const [supplierType, setSupplierType] = useState('');
    const [msmeStatus, setMsmeStatus] = useState('');
    const [remarks, setRemarks] = useState('');
    const [costBreakupFile, setCostBreakupFile] = useState(null);
    const [drawingFileUrl, setDrawingFileUrl] = useState(null);
    const [currency, setCurrency] = useState('INR');

    const LogoutUser = () => {
        Logout();
        navigate('/login');
    }

    if (role !== 'supplier') {
        return <Page404 />;
    }
    if (!isAuthenticated()) {
        return <Navigate to="/login" />;
    }

    const initializePartFormData = () => ({
        partId: '',
        supplierName: '',
        unitRate: '',
        sampleLeadTime: '',
        productionLeadTime: '',
        materialCost: '',
        processCost: '',
        overheadCost: '',
        packingCost: '',
        toolCost: '',
        toolLeadTime: '',
        orderType: '',
        toolCavity: '',
        toolLife: '',
        freightTerms: 'GVR Scope',
        deliveryTerms: '',
        paymentTerms: msmeStatus === 'MSME' ? '45 Days From Receipt' : '75 Days From Receipt'
    });

    const [partsFormData, setPartsFormData] = useState([initializePartFormData()]);

    useEffect(() => {
        const fetchSupplierDetails = async () => {
            try {
                const user = auth.currentUser;
                if (user) {
                    const supplierDoc = await getDoc(doc(db, 'suppliers', user.uid));
                    if (supplierDoc.exists()) {
                        const supplierData = supplierDoc.data();
                        setSupplierName(supplierData.name);
                        setSupplierType(supplierData.supplierType || 'regular');
                        setMsmeStatus(supplierData.msmeStatus || 'Not MSME');
                    } else {
                        toast.error('Supplier details not found');
                    }
                }
            } catch (error) {
                console.error('Error fetching supplier details:', error);
                toast.error('Failed to load supplier information');
            }
        };

        fetchSupplierDetails();
    }, []);

    useEffect(() => {
        setPartsFormData(prev => prev.map(part => ({
            ...part,
            paymentTerms: msmeStatus === 'MSME' ? '45 Days From Receipt' : '75 Days From Receipt'
        })));
    }, [msmeStatus]);

    useEffect(() => {
        let isMounted = true;

        const fetchRFQDetails = async () => {
            try {
                const rfqDoc = await getDoc(doc(db, 'quotations', rfqId));
                if (rfqDoc.exists()) {
                    const data = rfqDoc.data();
                    if (isMounted) {
                        setRfqDetails(data);

                        if (data.drawingFile) {
                            setDrawingFileUrl(data.drawingFile);
                        }

                        if (data.parts && data.parts.length > 0) {
                            setPartsFormData(data.parts.map(part => ({
                                ...initializePartFormData(),
                                partId: part.partNo,
                                supplierName,
                                freightTerms: 'GVR Scope',
                                deliveryTerms: 'FOB',
                                paymentTerms: msmeStatus === 'MSME' ? '45 Days From Receipt' : '75 Days From Receipt'
                            })));
                        }

                        const buyerDetail = data.createdBy;
                        const buy = await getDoc(doc(db, 'users', buyerDetail));
                        if (buy.exists()) {
                            setBuyer(buy.data());
                        }
                        else {
                            toast.error('Buyer details not found');
                        }
                    }
                } else {
                    toast.error('RFQ not found');
                    navigate('/rfq');
                }
            } catch (error) {
                toast.error('Failed to load RFQ details');
                console.error(error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchRFQDetails();

        return () => {
            isMounted = false;
        };
    }, [rfqId, navigate, supplierName]);

    const handleInputChange = (partIndex, e) => {
        const { name, value } = e.target;
        setPartsFormData(prev => prev.map((part, idx) =>
            idx === partIndex ? { ...part, [name]: value } : part
        ));
    };

    const handleFileChange = (partIndex, e) => {
        const { name, files } = e.target;
        setPartsFormData(prev => prev.map((part, idx) =>
            idx === partIndex ? { ...part, [name]: files[0] } : part
        ));
    };

    const handleCostBreakupFileChange = (e) => {
        setCostBreakupFile(e.target.files[0]);
    };

    const downloadDrawingFile = () => {
        if (drawingFileUrl) {
            window.open(drawingFileUrl, '_blank');
        } else {
            toast.warning('No drawing file available for download');
        }
    };

    const getCurrencySymbol = () => {
        switch (currency) {
            case 'INR': return '₹';
            case 'USD': return '$';
            case 'EUR': return '€';
            case 'AUD': return 'A$';
            default: return '₹';
        }
    };

    const calculateTotalCost = (partIndex) => {
        const part = partsFormData[partIndex];
        const rfqPart = rfqDetails?.parts?.find(p => p.partNo === part.partId);
        const quantity = rfqPart ? rfqPart.partQuantity || rfqPart.Quantity : 0;

        if (supplierType === 'OEM') {
            return (parseFloat(quantity || 0) * parseFloat(part.unitRate || 0)).toFixed(2);
        }

        return (
            parseFloat(quantity || 0) * (
                parseFloat(part.materialCost || 0) +
                parseFloat(part.processCost || 0) +
                parseFloat(part.overheadCost || 0) +
                parseFloat(part.packingCost || 0)
            )
        ).toFixed(2);
    };

    const calculateUnitRate = (partIndex) => {
        const part = partsFormData[partIndex];
        if (supplierType === 'OEM') {
            return parseFloat(part.unitRate || 0).toFixed(2);
        }
        return (
            parseFloat(part.materialCost || 0) +
            parseFloat(part.processCost || 0) +
            parseFloat(part.overheadCost || 0) +
            parseFloat(part.packingCost || 0)
        ).toFixed(2);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBtnstate(false);
        const isValid = partsFormData.every(part => {
            const basicValid = part.sampleLeadTime && part.productionLeadTime;
            const termsValid = part.freightTerms && part.deliveryTerms && part.paymentTerms;

            if (supplierType === 'OEM') {
                return basicValid && termsValid && part.unitRate;
            } else {
                return basicValid && termsValid && part.materialCost && part.processCost;
            }
        });

        if (!isValid) {
            toast.error('Please fill all required fields for all parts');
            setBtnstate(true);
            return;
        }

        try {
            const supplierId = auth.currentUser?.uid;
            if (!supplierId) {
                throw new Error('Supplier not authenticated');
            }

            const submissionData = {
                rfqId,
                rfqNumber: rfqDetails?.rfqNumber,
                projectName: rfqDetails?.projectName || '',
                supplier: {
                    id: supplierId,
                    name: supplierName,
                    type: supplierType,
                    msmeStatus
                },
                submissionDate: new Date().toISOString(),
                status: 'submitted',
                currency,
                parts: partsFormData.map((part, index) => {
                    const rfqPart = rfqDetails.parts.find(p => p.partNo === part.partId);
                    return {
                        partNo: rfqPart?.partNo || '',
                        partDescription: rfqPart?.partDescription || '',
                        quantity: rfqPart?.partQuantity || rfqPart?.Quantity || 0,
                        unitRate: calculateUnitRate(index),
                        materialCost: part.materialCost,
                        processCost: part.processCost,
                        overheadCost: part.overheadCost,
                        packingCost: part.packingCost,
                        toolCost: part.toolCost,
                        toolLeadTime: part.toolLeadTime,
                        toolCavity: part.toolCavity,
                        toolLife: part.toolLife,
                        orderType: rfqPart?.orderType,
                        sampleLeadTime: part.sampleLeadTime,
                        productionLeadTime: part.productionLeadTime,
                        totalCost: calculateTotalCost(index),
                        currency,
                        freightTerms: part.freightTerms,
                        deliveryTerms: part.deliveryTerms,
                        paymentTerms: part.paymentTerms
                    };
                }),
                terms: {
                    paymentTerms: partsFormData[0]?.paymentTerms,
                    deliveryTerms: partsFormData[0]?.deliveryTerms,
                    freightTerms: partsFormData[0]?.freightTerms,
                    remarks
                },
                buyer: {
                    id: rfqDetails?.createdBy || '',
                    name: buyer?.name || '',
                    email: buyer?.email || ''
                },
                costBreakupFile: costBreakupFile ? costBreakupFile.name : null,
                drawingFileUrl
            };

            await setDoc(doc(collection(db, 'supplier_replies')), submissionData);
            toast.success('Quotation submitted successfully!');
            navigate('/allrfq');
        } catch (error) {
            toast.error(`Failed to submit quotation: ${error.message}`);
            console.error('Submission error:', error);
            setBtnstate(true);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!rfqDetails) {
        return <div className="container alert alert-danger mt-3">RFQ details not found</div>;
    }

    return (
        <>
            <Nav LogoutUser={LogoutUser} />
            <div className="container pb-4">
                <div className="d-flex justify-content-center p-3">
                    <h3>Supplier Initial Offer</h3>
                </div>
                <div className="card mb-4">
                    <div className="card-body">
                        <form className="row g-3">
                            <div className="col-md-4">
                                <label className="form-label">Quotation No</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={rfqDetails.rfqNumber || 'N/A'}
                                    disabled
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Project Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={rfqDetails.projectName || 'N/A'}
                                    disabled
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Date</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={new Date(rfqDetails.submissionDate).toLocaleDateString() || 'N/A'}
                                    disabled
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Status</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={rfqDetails.status || 'New'}
                                    disabled
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Buyer Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={buyer?.name || 'N/A'}
                                    disabled
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Buyer Email address</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={buyer?.email || 'N/A'}
                                    disabled
                                />
                            </div>
                        </form>
                    </div>
                </div>
                <div className="card mb-4">
                    <div className="card-header bg-primary text-white d-flex justify-content-between">
                        <h4 className="mb-0">Items</h4>
                        <div className="col-md-2 d-flex align-items-center gap-3">
                            <label className="form-label">Currency</label>
                            <select
                                className="form-select"
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                            >
                                <option value="INR">(₹) Indian Rupee</option>
                                <option value="USD">($) US Dollar</option>
                                <option value="EUR">(€) Euro</option>
                                <option value="AUD">(A$) Australian Dollar</option>
                            </select>
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="table-responsive">
                            <table className="table table-striped table-hover">
                                <thead className="table-primary">
                                    <tr>
                                        <th scope="col">S.no</th>
                                        <th scope="col">Part No</th>
                                        <th scope="col">Description</th>
                                        <th scope="col">Period</th>
                                        <th scope="col">Item Quantity</th>
                                        <th scope="col">Sample Lead Time (Days)</th>
                                        <th scope="col">Production Lead Time (Days)</th>
                                        <th scope="col">Unit Rate</th>
                                        <th scope="col">Total Cost</th>
                                        <th scope="col">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rfqDetails.parts?.map((rfqPart, partIndex) => {
                                        const partFormData = partsFormData[partIndex] || initializePartFormData();
                                        return (
                                            <tr key={partIndex}>
                                                <th scope="row">{partIndex + 1}</th>
                                                <td>{rfqPart.partNo}</td>
                                                <td>{rfqPart.partDescription}</td>
                                                <td>{rfqPart.orderType}</td>
                                                <td>{rfqPart.partQuantity || rfqPart.Quantity}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm"
                                                        value={partFormData.sampleLeadTime}
                                                        onChange={(e) => handleInputChange(partIndex, {
                                                            target: {
                                                                name: 'sampleLeadTime',
                                                                value: e.target.value
                                                            }
                                                        })}
                                                        min="1"
                                                        required
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm"
                                                        value={partFormData.productionLeadTime}
                                                        onChange={(e) => handleInputChange(partIndex, {
                                                            target: {
                                                                name: 'productionLeadTime',
                                                                value: e.target.value
                                                            }
                                                        })}
                                                        min="1"
                                                        required
                                                    />
                                                </td>
                                                <td>
                                                    <div className="input-group input-group-sm">
                                                        <span className="input-group-text">{getCurrencySymbol()}</span>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={calculateUnitRate(partIndex)}
                                                            disabled
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="input-group input-group-sm">
                                                        <span className="input-group-text">{getCurrencySymbol()}</span>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={calculateTotalCost(partIndex)}
                                                            disabled
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        type="button"
                                                        data-bs-toggle="modal"
                                                        data-bs-target={`#quoteModal-${partIndex}`}
                                                    >
                                                        Quote
                                                    </button>
                                                    <div className="modal fade" id={`quoteModal-${partIndex}`} tabIndex="-1" aria-hidden="true">
                                                        <div className="modal-dialog modal-lg">
                                                            <div className="modal-content">
                                                                <div className="modal-header bg-primary text-white">
                                                                    <h5 className="modal-title">Quote Details - {rfqPart.partNo}</h5>
                                                                    <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                                                                </div>
                                                                <div className="modal-body">
                                                                    <div className="row g-3">
                                                                        {supplierType === 'OEM' ? (
                                                                            <div className="col-md-6">
                                                                                <label className="form-label">Unit Rate *</label>
                                                                                <div className="input-group">
                                                                                    <span className="input-group-text">{getCurrencySymbol()}</span>
                                                                                    <input
                                                                                        type="number"
                                                                                        className="form-control"
                                                                                        name="unitRate"
                                                                                        value={partFormData.unitRate}
                                                                                        onChange={(e) => handleInputChange(partIndex, e)}
                                                                                        min='0'
                                                                                        step="0.01"
                                                                                        required
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                <div className="col-md-6">
                                                                                    <label className="form-label">Material Cost *</label>
                                                                                    <div className="input-group">
                                                                                        <span className="input-group-text">{getCurrencySymbol()}</span>
                                                                                        <input
                                                                                            type="number"
                                                                                            className="form-control"
                                                                                            name="materialCost"
                                                                                            value={partFormData.materialCost}
                                                                                            onChange={(e) => handleInputChange(partIndex, e)}
                                                                                            min='0'
                                                                                            step="0.01"
                                                                                            required
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="col-md-6">
                                                                                    <label className="form-label">Process Cost *</label>
                                                                                    <div className="input-group">
                                                                                        <span className="input-group-text">{getCurrencySymbol()}</span>
                                                                                        <input
                                                                                            type="number"
                                                                                            className="form-control"
                                                                                            name="processCost"
                                                                                            value={partFormData.processCost}
                                                                                            onChange={(e) => handleInputChange(partIndex, e)}
                                                                                            min='0'
                                                                                            step="0.01"
                                                                                            required
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="col-md-6">
                                                                                    <label className="form-label">Overheads & Margin</label>
                                                                                    <div className="input-group">
                                                                                        <span className="input-group-text">{getCurrencySymbol()}</span>
                                                                                        <input
                                                                                            type="number"
                                                                                            className="form-control"
                                                                                            name="overheadCost"
                                                                                            value={partFormData.overheadCost}
                                                                                            onChange={(e) => handleInputChange(partIndex, e)}
                                                                                            min='0'
                                                                                            step="0.01"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="col-md-6">
                                                                                    <label className="form-label">Packing & Forwarding</label>
                                                                                    <div className="input-group">
                                                                                        <span className="input-group-text">{getCurrencySymbol()}</span>
                                                                                        <input
                                                                                            type="number"
                                                                                            className="form-control"
                                                                                            name="packingCost"
                                                                                            value={partFormData.packingCost}
                                                                                            onChange={(e) => handleInputChange(partIndex, e)}
                                                                                            min='0'
                                                                                            step="0.01"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            </>
                                                                        )}

                                                                        <div className="col-md-6">
                                                                            <label className="form-label">Tool Cost</label>
                                                                            <div className="input-group">
                                                                                <span className="input-group-text">{getCurrencySymbol()}</span>
                                                                                <input
                                                                                    type="number"
                                                                                    className="form-control"
                                                                                    name="toolCost"
                                                                                    value={partFormData.toolCost}
                                                                                    onChange={(e) => handleInputChange(partIndex, e)}
                                                                                    min="0"
                                                                                    step="0.01"
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        <div className="col-md-6">
                                                                            <label className="form-label">Tool Lead Time (Days)</label>
                                                                            <input
                                                                                type="number"
                                                                                className="form-control"
                                                                                name="toolLeadTime"
                                                                                value={partFormData.toolLeadTime}
                                                                                onChange={(e) => handleInputChange(partIndex, e)}
                                                                                min="1"
                                                                            />
                                                                        </div>

                                                                        <div className="col-md-6">
                                                                            <label className="form-label">Tool Cavity</label>
                                                                            <input
                                                                                type="number"
                                                                                className="form-control"
                                                                                name="toolCavity"
                                                                                value={partFormData.toolCavity}
                                                                                onChange={(e) => handleInputChange(partIndex, e)}
                                                                                min="1"
                                                                            />
                                                                        </div>

                                                                        <div className="col-md-6">
                                                                            <label className="form-label">Tool Life (Shots)</label>
                                                                            <input
                                                                                type="number"
                                                                                className="form-control"
                                                                                name="toolLife"
                                                                                value={partFormData.toolLife}
                                                                                onChange={(e) => handleInputChange(partIndex, e)}
                                                                                min="1"
                                                                            />
                                                                        </div>

                                                                        <div className="col-md-6">
                                                                            <label className="form-label">PFR File</label>
                                                                            <input
                                                                                type="file"
                                                                                className="form-control"
                                                                                name="pfrFile"
                                                                                onChange={(e) => handleFileChange(partIndex, e)}
                                                                                accept=".pdf,.doc,.docx,.xls,.xlsx"
                                                                            />
                                                                        </div>

                                                                        <div className="col-md-6">
                                                                            <label className="form-label">PFEP File</label>
                                                                            <input
                                                                                type="file"
                                                                                className="form-control"
                                                                                name="pfepFile"
                                                                                onChange={(e) => handleFileChange(partIndex, e)}
                                                                                accept=".pdf,.doc,.docx,.xls,.xlsx"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="modal-footer">
                                                                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-primary"
                                                                        data-bs-dismiss="modal"
                                                                    >
                                                                        Save Changes
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="card mb-4 h-100">
                            <div className="card-header bg-primary text-white">
                                <h4 className="mb-0">General Terms</h4>
                            </div>
                            <div className="card-body">
                                <div className="row g-3 mb-4">
                                    <div className="col-md-6">
                                        <label className="form-label">MSME Status</label>
                                        <select
                                            className="form-select"
                                            value={msmeStatus}
                                            onChange={(e) => setMsmeStatus(e.target.value)}
                                        >
                                            <option value="MSME">MSME</option>
                                            <option value="Not MSME">Not MSME</option>
                                        </select>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">Payment Terms</label>
                                        <select
                                            className="form-select"
                                            value={partsFormData[0]?.paymentTerms}
                                            onChange={(e) => setPartsFormData(prev =>
                                                prev.map(part => ({ ...part, paymentTerms: e.target.value })))
                                            }
                                        >
                                            {msmeStatus === 'MSME' ? (
                                                <option value="45 Days From Receipt">45 Days From Receipt</option>
                                            ) : (
                                                <>
                                                    <option value="75 Days From Receipt">75 Days From Receipt</option>
                                                    <option value="90 Days From Receipt">90 Days From Receipt</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Freight Terms</label>
                                        <select
                                            className="form-select"
                                            value={partsFormData[0]?.freightTerms || 'GVR Scope'}
                                            onChange={(e) => setPartsFormData(prev =>
                                                prev.map(part => ({
                                                    ...part,
                                                    freightTerms: e.target.value,
                                                    deliveryTerms: e.target.value === 'GVR Scope' ? 'Ex-works' : 'Road'
                                                })))
                                            }
                                        >
                                            <option value="GVR Scope">GVR Scope</option>
                                            <option value="Supplier Scope">Supplier Scope</option>
                                        </select>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">Delivery Terms</label>
                                        <select
                                            className="form-select"
                                            value={partsFormData[0]?.deliveryTerms || (partsFormData[0]?.freightTerms === 'GVR Scope' ? 'Ex-works' : 'Road')}
                                            onChange={(e) => setPartsFormData(prev =>
                                                prev.map(part => ({ ...part, deliveryTerms: e.target.value })))
                                            }
                                        >
                                            {partsFormData[0]?.freightTerms === 'GVR Scope' ? (
                                                <>
                                                    <option value="Ex-works">Ex-works</option>
                                                    <option value="FOB">FOB</option>
                                                    <option value="CIF">CIF</option>
                                                    <option value="DDP">DDP</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="Road">Road</option>
                                                    <option value="Air">Air</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Remarks</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="card mb-4 h-100">
                            <div className="card-header bg-primary text-white">
                                <h4 className="mb-0">Attached Files</h4>
                            </div>
                            <div className="card-body">
                                <div className="mb-4">
                                    <label className="form-label fw-bold">Drawing File</label>
                                    <div className="d-flex align-items-center">
                                        {drawingFileUrl ? (
                                            <>
                                                <span className="me-3">Drawing available</span>
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={downloadDrawingFile}
                                                >
                                                    <i className="bi bi-download me-2"></i>Download
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-muted">No drawing file available</span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="form-label fw-bold">Cost Breakup File</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        onChange={handleCostBreakupFileChange}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx"
                                    />
                                    <small className="text-muted">Upload your cost breakup file here</small>
                                </div>
                                <div className="my-3">
                                    <label className="form-label"><strong>Note from Sourcing</strong></label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        value={rfqDetails.comments || 'Nil'}
                                        disabled
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="d-flex justify-content-between mt-4">
                    <button
                        type="button"
                        className="btn btn-warning px-4 py-2"
                        onClick={() => navigate('/rfq')}
                    >
                        <i className="bi bi-arrow-left me-2"></i>Back
                    </button>
                    <button
                        type="button"
                        className="btn btn-success px-4 py-2"
                        onClick={handleSubmit}
                        disabled={!btnstate || !partsFormData.every(part => {
                            const basicValid = part.sampleLeadTime && part.productionLeadTime;
                            const termsValid = part.freightTerms && part.deliveryTerms && part.paymentTerms;

                            if (supplierType === 'OEM') {
                                return basicValid && termsValid && part.unitRate;
                            } else {
                                return basicValid && termsValid && part.materialCost && part.processCost;
                            }
                        })}
                    >
                        <i className="bi bi-check-circle me-2"></i>Submit
                    </button>
                </div>
            </div>
        </>
    );
};

export default Supplier_Initial_Offer;