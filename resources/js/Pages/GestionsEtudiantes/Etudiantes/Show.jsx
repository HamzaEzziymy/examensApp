import React from 'react';
import { router } from '@inertiajs/react';
import { ArrowLeft, Mail, Phone, BookOpen, Award, FileText, Users, BarChart3, CheckCircle, AlertCircle } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Show({ student, stats }) {
  const handleBack = () => {
    router.visit(route('inscriptions.etudiants.index'));
  };

  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
          Profil Étudiant
        </h2>
      }
    >
      <Head title={`${student.nom} ${student.prenom}`} />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <div className="p-4">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 mb-6 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
          </button>

          {/* Student Header Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 transition-colors">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {student.nom} {student.prenom}
                </h1>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <FileText className="w-4 h-4" />
                    <span>CNE: <strong className="text-gray-900 dark:text-gray-100">{student.cne}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    <span className="text-gray-900 dark:text-gray-100">{student.mail_academique}</span>
                  </div>
                  {student.telephone && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4" />
                      <span className="text-gray-900 dark:text-gray-100">{student.telephone}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-6 text-center min-w-fit">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Filière</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-3">
                  {student.section?.filiere?.nom_filiere || 'N/A'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {student.section?.nom_section || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Academic Statistics */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Inscriptions Admin</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAdminInscriptions}</div>
                  </div>
                  <Users className="w-8 h-8 text-blue-500 opacity-50" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Actives</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeInscriptions}</div>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Modules</div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalPedInscriptions}</div>
                  </div>
                  <BookOpen className="w-8 h-8 text-purple-500 opacity-50" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Crédits Total</div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.totalCreditsAcquired}</div>
                  </div>
                  <Award className="w-8 h-8 text-orange-500 opacity-50" />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Moy. Crédits</div>
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.averageCreditsPerModule}</div>
                  </div>
                  <BarChart3 className="w-8 h-8 text-indigo-500 opacity-50" />
                </div>
              </div>
            </div>
          )}

          {/* Inscriptions Administratives */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Parcours Académique</h2>
            </div>
            
            {student.inscriptionsAdministratives && Object.keys(student.inscriptionsAdministratives).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Année</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Niveau</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Section</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Date Inscription</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Statut</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {Array.isArray(student.inscriptionsAdministratives) 
                      ? student.inscriptionsAdministratives.map((insc) => (
                          <tr key={insc.id_inscription_admin} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {insc.annee_universitaire?.annee_univ || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {insc.niveau?.nom_niveau || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {insc.section?.nom_section || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {new Date(insc.date_inscription).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                insc.statut === 'Active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {insc.statut}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {insc.type_inscription || 'N/A'}
                            </td>
                          </tr>
                        ))
                      : Object.values(student.inscriptionsAdministratives).map((insc) => (
                          <tr key={insc.id_inscription_admin} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {insc.annee_universitaire?.annee_univ || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {insc.niveau?.nom_niveau || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {insc.section?.nom_section || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {new Date(insc.date_inscription).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                insc.statut === 'Active'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {insc.statut}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                              {insc.type_inscription || 'N/A'}
                            </td>
                          </tr>
                        ))
                    }
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Aucune inscription administrative
              </div>
            )}
          </div>

          {/* Inscriptions Pédagogiques */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Modules Inscrits</h2>
            </div>
            
            {student.inscriptionsPedagogiques && Array.isArray(student.inscriptionsPedagogiques) && student.inscriptionsPedagogiques.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Module</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Niveau</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Semestre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Section</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Crédits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {student.inscriptionsPedagogiques.map((insc, idx) => (
                        <tr key={insc.id_inscription_pedagogique || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {insc.offre_formation?.module?.nom_module || insc.module?.nom_module || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {insc.offre_formation?.semestre?.niveau?.nom_niveau || insc.niveau?.nom_niveau || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {insc.offre_formation?.semestre?.nom_semestre || insc.semestre?.nom_semestre || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {insc.offre_formation?.section?.nom_section || insc.section?.nom_section || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {insc.type_inscription || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              {insc.credits_acquis || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Aucune inscription pédagogique {student.inscriptionsPedagogiques ? `(${student.inscriptionsPedagogiques.length} items)` : '(undefined)'}
              </div>
            )}
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Personal Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Informations Personnelles</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Date de Naissance</label>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">
                    {student.date_naissance ? new Date(student.date_naissance).toLocaleDateString('fr-FR') : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Lieu de Naissance</label>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">{student.lieu_naissance || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Nationalité</label>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">{student.nationalite || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Genre</label>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">
                    {student.genre === 'M' ? 'Masculin' : student.genre === 'F' ? 'Féminin' : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Informations de Contact</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Email Académique</label>
                  <p className="text-gray-900 dark:text-gray-100 mt-1 break-all">{student.mail_academique || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Téléphone</label>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">{student.telephone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Adresse</label>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">{student.adresse || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Ville</label>
                  <p className="text-gray-900 dark:text-gray-100 mt-1">{student.ville || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
