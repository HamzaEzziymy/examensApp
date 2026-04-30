import { useForm } from '@inertiajs/react';
import React, { useState, useMemo } from 'react'
import { FaEye, FaTrash } from 'react-icons/fa'
import { toast, ToastContainer } from 'react-toastify';

function DisplayDocuments({ documents }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterFiliere, setFilterFiliere] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterNiveau, setFilterNiveau] = useState('');
  const { post } = useForm();
  const itemsPerPage = 10;

  // Parse filière, section, niveau from nomDoc: "PV — Filière — Section — Niveau — Session"
  const parseDoc = (nomDoc) => {
    const parts = (nomDoc || '').split(' — ');
    return {
      filiere: parts[1] || '',
      section: parts[2] || '',
      niveau:  parts[3] || '',
    };
  };

  // Unique filières
  const filieres = useMemo(() => {
    const set = new Set(documents.map(d => parseDoc(d.nomDoc).filiere).filter(Boolean));
    return [...set].sort();
  }, [documents]);

  // Unique sections filtered by selected filière
  const sectionsList = useMemo(() => {
    const filtered = filterFiliere
      ? documents.filter(d => parseDoc(d.nomDoc).filiere === filterFiliere)
      : documents;
    const set = new Set(filtered.map(d => parseDoc(d.nomDoc).section).filter(Boolean));
    return [...set].sort();
  }, [documents, filterFiliere]);

  // Unique niveaux filtered by selected filière + section
  const niveaux = useMemo(() => {
    let filtered = documents;
    if (filterFiliere) filtered = filtered.filter(d => parseDoc(d.nomDoc).filiere === filterFiliere);
    if (filterSection) filtered = filtered.filter(d => parseDoc(d.nomDoc).section === filterSection);
    const set = new Set(filtered.map(d => parseDoc(d.nomDoc).niveau).filter(Boolean));
    return [...set].sort();
  }, [documents, filterFiliere, filterSection]);

  // Apply all filters
  const filteredDocuments = useMemo(() => {
    return documents.filter(d => {
      const { filiere, section, niveau } = parseDoc(d.nomDoc);
      if (filterFiliere && filiere !== filterFiliere) return false;
      if (filterSection && section !== filterSection) return false;
      if (filterNiveau && niveau !== filterNiveau) return false;
      return true;
    });
  }, [documents, filterFiliere, filterSection, filterNiveau]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleDelete = (doc) => {
    post(route('documents.destroy', doc), {
      onSuccess: () => toast.success('Document supprimé avec succès'),
    });
  };

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

  const handlePreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const handlePageClick = (page) => setCurrentPage(page);

  const getPaginationPages = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...'); pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1); pages.push('...');
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1); pages.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push('...'); pages.push(totalPages);
    }
    return pages;
  };

  const selectClass = 'px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500';

  return (
    <div className='w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 m-2'>
      <ToastContainer />
      <div className='flex items-center justify-between mb-4 flex-wrap gap-3'>
        <h2 className='text-xl font-semibold text-gray-800 dark:text-white'>Documents</h2>
        <div className='flex items-center gap-2 flex-wrap'>
          {/* Filière filter */}
          <select value={filterFiliere} onChange={e => { setFilterFiliere(e.target.value); setFilterSection(''); setFilterNiveau(''); setCurrentPage(1); }} className={selectClass}>
            <option value=''>Toutes les filières</option>
            {filieres.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          {/* Section filter — depends on filière */}
          <select value={filterSection} onChange={e => { setFilterSection(e.target.value); setFilterNiveau(''); setCurrentPage(1); }} disabled={!filterFiliere} className={selectClass + ' disabled:opacity-40 disabled:cursor-not-allowed'}>
            <option value=''>{filterFiliere ? 'Toutes les sections' : '— Choisir filière —'}</option>
            {sectionsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {/* Niveau filter — depends on section */}
          <select value={filterNiveau} onChange={e => { setFilterNiveau(e.target.value); setCurrentPage(1); }} disabled={!filterSection} className={selectClass + ' disabled:opacity-40 disabled:cursor-not-allowed'}>
            <option value=''>{filterSection ? 'Tous les niveaux' : '— Choisir section —'}</option>
            {niveaux.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {(filterFiliere || filterSection || filterNiveau) && (
            <button onClick={() => { setFilterFiliere(''); setFilterSection(''); setFilterNiveau(''); setCurrentPage(1); }}
              className='px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700'>
              ✕ Réinitialiser
            </button>
          )}
        </div>
      </div>

      {filteredDocuments.length > 0 ? (
        <>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600'>
                <tr>
                  <th className='px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100'>Nom du document</th>
                  <th className='px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100'>Description</th>
                  <th className='px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100'>Date de création</th>
                  <th className='px-6 py-3 text-center text-sm font-medium text-gray-900 dark:text-gray-100'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocuments.map((doc) => (
                  <tr key={doc.id} className='border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'>
                    <td className='px-6 py-2 text-sm font-medium text-gray-900 dark:text-gray-100'>{doc.nomDoc}</td>
                    <td className='px-6 py-2 text-sm text-gray-600 dark:text-gray-400'>{doc.descripDoc}</td>
                    <td className='px-6 py-2 text-sm text-gray-600 dark:text-gray-400'>{formatDate(doc.created_at)}</td>
                    <td className='px-6 py-2'>
                      <div className='flex justify-center items-center gap-2'>
                        <a href={`/${doc.url}`} target='_blank' rel='noopener noreferrer'
                          className='inline-flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors'>
                          <FaEye size={16} /> Voir
                        </a>
                        <button onClick={() => handleDelete(doc)}
                          className='inline-flex items-center gap-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors'>
                          <FaTrash size={16} /> Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className='flex items-center justify-between mt-6 px-4'>
            <div className='text-sm text-gray-600 dark:text-gray-400'>
              Affichage {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredDocuments.length)} sur {filteredDocuments.length} document(s)
            </div>
            <div className='flex items-center gap-2'>
              <button onClick={handlePreviousPage} disabled={currentPage === 1}
                className='px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'>
                Précédent
              </button>
              <div className='flex gap-1'>
                {getPaginationPages().map((page, index) => (
                  page === '...'
                    ? <span key={`dots-${index}`} className='px-2 py-1 text-gray-600 dark:text-gray-400'>...</span>
                    : <button key={page} onClick={() => handlePageClick(page)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                        {page}
                      </button>
                ))}
              </div>
              <button onClick={handleNextPage} disabled={currentPage === totalPages}
                className='px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'>
                Suivant
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className='text-center py-12'>
          <p className='text-gray-500 dark:text-gray-400'>
            {documents.length === 0 ? 'Aucun document trouvé. Créez-en un pour commencer.' : 'Aucun document correspond aux filtres sélectionnés.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default DisplayDocuments;