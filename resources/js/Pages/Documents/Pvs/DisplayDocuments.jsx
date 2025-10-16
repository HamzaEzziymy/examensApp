import { useForm } from '@inertiajs/react';
import React, { useState } from 'react'
import { FaEye, FaFileDownload, FaTrash } from 'react-icons/fa'
import { toast, ToastContainer } from 'react-toastify';

function DisplayDocuments({ documents }) {
  const [currentPage, setCurrentPage] = useState(1);
    const { post } = useForm();
  const itemsPerPage = 10;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

    const handleDelete = (doc) => {
    post(route('documents.destroy', doc), {
        onSuccess: () => {
            toast.success('Document supprimé avec succès');
    
            },
        }
    );
   

  };

  // Pagination logic
  const totalPages = Math.ceil(documents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = documents.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePageClick = (page) => {
    setCurrentPage(page);
  };

  const getPaginationPages = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className='w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 m-2'>
      <h2 className='text-xl font-semibold mb-4 text-gray-800 dark:text-white'>
        Documents
      </h2>

      {documents && documents.length > 0 ? (
        <>
        <ToastContainer/>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600'>
                <tr>
                  <th className='px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100'>
                    Nom du document
                  </th>
                  <th className='px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100'>
                    Description
                  </th>
                  <th className='px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100'>
                    date de création
                  </th>
                  <th className='px-6 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className='border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                  >
                    <td className='px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100'>
                      {doc.nomDoc}
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-600 dark:text-gray-400'>
                      {doc.descripDoc}
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-600 dark:text-gray-400'>
                      {formatDate(doc.created_at)}
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex justify-center items-center gap-2'>
                        <a
                          href={`/${doc.url}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors'
                          title='View'
                        >
                          <FaEye size={16} />
                            Voir
                        </a>
                        <button
                          onClick={() => handleDelete(doc)}
                          className='inline-flex items-center gap-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors'
                          title='Delete'
                        >
                          <FaTrash size={16} />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className='flex items-center justify-between mt-6 px-4'>
            <div className='text-sm text-gray-600 dark:text-gray-400'>
              Affichage {startIndex + 1} to {Math.min(endIndex, documents.length)} of {documents.length} documents
            </div>

            <div className='flex items-center gap-2'>
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className='px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                Previous
              </button>

              <div className='flex gap-1'>
                {getPaginationPages().map((page, index) => (
                  page === '...' ? (
                    <span key={`dots-${index}`} className='px-2 py-1 text-gray-600 dark:text-gray-400'>
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => handlePageClick(page)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className='px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className='text-center py-12'>
          <p className='text-gray-500 dark:text-gray-400'>
            Aucun document trouvé. Créez-en un pour commencer.
          </p>
        </div>
      )}
    </div>
  );
}

export default DisplayDocuments;