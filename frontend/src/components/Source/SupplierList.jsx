import { useState, useEffect } from 'react';
import { getSuppliers, deleteSupplier } from '../../services/supplierService';
import SupplierForm from './SupplierForm';
import { Modal, Button, Table } from 'react-bootstrap';

const SupplierList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await deleteSupplier(id);
        fetchSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
      }
    }
  };

  return (
    <div className="py-3">
      <Button variant="primary" onClick={() => {
        setCurrentSupplier(null);
        setShowModal(true);
      }}>
        Add New Supplier
      </Button>

      <Table striped bordered hover responsive className="mt-3">
        <tbody>
          {suppliers.map((supplier, index) => (
            <tr key={supplier.id}>
              <td>{index + 1}</td>
              <td>{supplier.vendorId}</td>
              <td>{supplier.name}</td>
              <td>{supplier.category}</td>
              <td>{supplier.email}</td>
              <td>{supplier.phone}</td>
              <td>
                <Button variant="warning" size="sm" onClick={() => {
                  setCurrentSupplier(supplier);
                  setShowModal(true);
                }}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(supplier.id)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{currentSupplier ? 'Edit Supplier' : 'Add New Supplier'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <SupplierForm 
            supplier={currentSupplier} 
            onSuccess={() => {
              setShowModal(false);
              fetchSuppliers();
            }}
            onClose={() => setShowModal(false)}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default SupplierList;