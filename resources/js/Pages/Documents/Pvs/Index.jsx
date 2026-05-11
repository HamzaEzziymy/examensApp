import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, useForm } from '@inertiajs/react'
import React, { useState } from 'react'
import Header from '../Header'
import CreateForm from './CreateForm'
import DisplayDocuments from './DisplayDocuments'

function Index({documents, sessions, niveaux, salles, modules, filieres, sections, examens = []}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showExportStudentsModal, setShowExportStudentsModal] = useState(false);
  const [exportFilterSession, setExportFilterSession] = useState('');
  const [exportFilterFiliere, setExportFilterFiliere] = useState('');
  const [exportFilterSection, setExportFilterSection] = useState('');
  const [exportSelectedExamen, setExportSelectedExamen] = useState('');
  const generateForm = useForm({ id_session: '', id_filiere: '', id_section: '', nomDoc: 'PV Planification' });

  // Cascading filter for exams
  const filteredExamens = examens.filter(e => {
    if (exportFilterSession && String(e.id_session) !== String(exportFilterSession)) return false;
    if (exportFilterFiliere && String(e.id_filiere) !== String(exportFilterFiliere)) return false;
    if (exportFilterSection && String(e.id_section) !== String(exportFilterSection)) return false;
    return true;
  });

  const uniqueFilieres = [...new Map(examens.filter(e => e.filiere).map(e => [e.id_filiere, { id: e.id_filiere, nom: e.filiere }])).values()];
  const uniqueSections = [...new Map(
    examens.filter(e => !exportFilterFiliere || String(e.id_filiere) === String(exportFilterFiliere))
      .filter(e => e.section)
      .map(e => [e.id_section, { id: e.id_section, nom: e.section }])
  ).values()];

  const handleExportStudents = () => {
    if (!exportSelectedExamen) return;
    const url = route('surveillance.repartition-etudiants.export', exportSelectedExamen);
    window.open(url, '_blank');
    setShowExportStudentsModal(false);
  };

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
        <button onClick={() => setShowExportStudentsModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Exporter la Répartition
        </button>
      </div>

      {/* Full-width table */}
      <div className="p-4">
        <DisplayDocuments documents={documents} />
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
      {/* ── Export Students Modal ── */}
      {showExportStudentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">Exporter la Répartition</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sélectionnez un examen pour exporter la liste des étudiants</p>
                </div>
              </div>
              <button onClick={() => setShowExportStudentsModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                {iconX}
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Session */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Session</label>
                <select value={exportFilterSession} onChange={e => { setExportFilterSession(e.target.value); setExportFilterFiliere(''); setExportFilterSection(''); setExportSelectedExamen(''); }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500">
                  <option value="">Toutes les sessions</option>
                  {sessions.map(s => <option key={s.id_session_examen} value={s.id_session_examen}>{s.nom_session}</option>)}
                </select>
              </div>

              {/* Filière */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Filière</label>
                <select value={exportFilterFiliere} onChange={e => { setExportFilterFiliere(e.target.value); setExportFilterSection(''); setExportSelectedExamen(''); }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500">
                  <option value="">Toutes les filières</option>
                  {uniqueFilieres.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Section</label>
                <select value={exportFilterSection} onChange={e => { setExportFilterSection(e.target.value); setExportSelectedExamen(''); }}
                  disabled={!exportFilterFiliere}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed">
                  <option value="">{exportFilterFiliere ? 'Toutes les sections' : '— Choisir filière —'}</option>
                  {uniqueSections.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>

              {/* Examen */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Examen *</label>
                <select value={exportSelectedExamen} onChange={e => setExportSelectedExamen(e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500">
                  <option value="">Sélectionner un examen</option>
                  {filteredExamens.map(e => (
                    <option key={e.id_examen} value={e.id_examen}>
                      {e.module} — {e.niveau} — {e.date_examen}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">{filteredExamens.length} examen(s) disponible(s)</p>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
              <button onClick={() => setShowExportStudentsModal(false)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                Annuler
              </button>
              <button onClick={handleExportStudents} disabled={!exportSelectedExamen}
                className="flex items-center gap-2 px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exporter
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthenticatedLayout>
  )
}

export default Index
