import Reply from './Reply'
import Quotations from './Quotation'
export default function Recent() {
    return (
        <div className='container'>
            <div className=''>
                <div className='p-4 '>
                    <Reply />
                </div>
            </div>
            <div className=' '>
                <div className='px-4 pb-4'>
                    <Quotations />
                </div>
            </div>
        </div>
    )
}