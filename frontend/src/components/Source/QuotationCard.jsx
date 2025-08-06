
import { useNavigate } from 'react-router-dom';

const QuotationCard = ({ quotation, className, highlight = '' }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/quotations/${quotation.id}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Invalid date format';
    }
  };

  const highlightMatch = (text) => {
    if (!highlight || !text) return text;
    
    const regex = new RegExp(`(${highlight})`, 'gi');
    return text.toString().replace(regex, '<mark>$1</mark>');
  };

  const createHighlightedMarkup = (text) => {
    return { __html: highlightMatch(text) };
  };

  return (
    <div 
      className={`list-group-item list-group-item-action ${className}`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="d-flex w-100 justify-content-between">
        <h5 
          className="mb-1" 
          dangerouslySetInnerHTML={createHighlightedMarkup(`RFQ No: ${quotation.rfqNumber}`)}
        />
        <small className={`badge bg-${
          quotation.status === 'pending' ? 'warning' : 
          quotation.status === 'expired' ? 'danger' : 'secondary'
        }`}>
          {quotation.status}
        </small>
      </div>
      <p className="mb-1">
        <strong>Project Name:</strong>{' '}
        <span dangerouslySetInnerHTML={createHighlightedMarkup(quotation.projectName)} />
      </p>
      <small>
        <strong>Submission Date:</strong> {formatDate(quotation.submissionDate)}
      </small>
    </div>
  );
};

export default QuotationCard;