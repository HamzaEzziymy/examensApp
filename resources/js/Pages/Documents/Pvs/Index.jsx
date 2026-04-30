import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, useForm } from '@inertiajs/react'
import React, { useState } from 'react'
import Header from '../Header'
import PvAbsenceSection from './PvAbsenceSection'

function Index({documents, sessions, niveaux, salles, modules, filieres, sections}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const generateForm = useForm({ id_session: '', id_filiere: '', id_section: '', nomDoc: 'PV Planification' });

  const handleGenerate = (e) => {
    e.preventDefault();
    generateForm.post(route('proces-v.generate'), {
      onSuccess: () => setShowGenerateModal(false),
    });
  };

  const iconDoc = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
  const iconX = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <AuthenticatedLayout
      header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">Documents</h2>}
    >
      <Head title="Documents" />
      <Header />
<<<<<<< HEAD
      <div className='p-4'>
        <PvAbsenceSection
          documents={documents}
          formProps={{
            sessions,
            niveaux,
            salles,
            modules,
            filieres,
            sections,
          }}
=======

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 pt-4 flex-wrap">
        <button onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow transition-colors">
          {iconDoc}
          Créer un PV
        </button>
        <button onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow transition-colors">
          {iconDoc}
          Générer PVs depuis la Planification
        </button>
      </div>

<<<<<<< HEAD
      {/* Full-width table */}
      <div className="p-4">
        <DisplayDocuments documents={documents} />
=======
      <div className='flex flex-col lg:flex-row justify-between gap-4 lg:gap-6 p-4'>
        <CreateForm 
          className='w-full rounded-lg shadow-sm' 
          sessions={sessions}
          niveaux={niveaux}
          salles={salles}
          modules={modules}
          filieres={filieres}
          sections={sections}
>>>>>>> db31ec7a23071ad207c1b013527b6ae467045ad0
        />
>>>>>>> 93be32bc46c3793c8e3808b56b9d9c196f5c0fd4
      </div>

      {/* ── Create PV Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Création Procès Verbal</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Générer un PV manuellement</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                {iconX}
              </button>
            </div>
            <div className="px-6 py-4">
              <CreateForm
                sessions={sessions}
                niveaux={niveaux}
                salles={salles}
                modules={modules}
                filieres={filieres}
                sections={sections}
                onSuccess={() => setShowCreateModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Generate from Planification Modal ── */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  {iconDoc}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Générer PVs depuis la Planification</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Un PDF par niveau, une page par examen (module + salle)</p>
                </div>
              </div>
              <button onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                {iconX}
              </button>
            </div>

            <form onSubmit={handleGenerate} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Session d'examen *</label>
                <select value={generateForm.data.id_session} onChange={e => generateForm.setData('id_session', e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sélectionner une session</option>
                  {sessions.map(s => <option key={s.id_session_examen} value={s.id_session_examen}>{s.nom_session}</option>)}
                </select>
                {generateForm.errors.id_session && <p className="text-red-500 text-xs mt-1">{generateForm.errors.id_session}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Filière *</label>
                <select value={generateForm.data.id_filiere} onChange={e => { generateForm.setData('id_filiere', e.target.value); generateForm.setData('id_section', ''); }} required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sélectionner une filière</option>
                  {filieres.map(f => <option key={f.id_filiere} value={f.id_filiere}>{f.nom_filiere}</option>)}
                </select>
                {generateForm.errors.id_filiere && <p className="text-red-500 text-xs mt-1">{generateForm.errors.id_filiere}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Section *</label>
                <select value={generateForm.data.id_section} onChange={e => generateForm.setData('id_section', e.target.value)} required
                  disabled={!generateForm.data.id_filiere}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed">
                  <option value="">{generateForm.data.id_filiere ? 'Sélectionner une section' : '— Choisir filière —'}</option>
                  {sections
                    .filter(s => !generateForm.data.id_filiere || String(s.id_filiere) === String(generateForm.data.id_filiere))
                    .map(s => <option key={s.id_section} value={s.id_section}>{s.nom_section}</option>)
                  }
                </select>
                {generateForm.errors.id_section && <p className="text-red-500 text-xs mt-1">{generateForm.errors.id_section}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Préfixe du nom</label>
                <input type="text" value={generateForm.data.nomDoc} onChange={e => generateForm.setData('nomDoc', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                  placeholder="PV Planification" />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={() => setShowGenerateModal(false)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                  Annuler
                </button>
                <button type="submit" disabled={generateForm.processing || !generateForm.data.id_session || !generateForm.data.id_filiere || !generateForm.data.id_section}
                  className="flex items-center gap-2 px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                  {generateForm.processing ? 'Génération...' : 'Générer les PVs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  )
}

export default Index
