import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Header from '../Header'
import Display from './Display';

function Index({
  inscriptions_pedagogiques,
  inscriptions_administratives,
  offres_formation,
  etudiants,
  modules,
  niveaux,
  sections,
  filters,
  totalCount,
}) {

  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
          Gestion des Inscriptions Pédagogiques
        </h2>
      }
    >
      <Head title="Inscriptions Pédagogiques" />
      <Header />
      <div className="p-4 rounded-lg">
        <Display
          inscriptions_pedagogiques={inscriptions_pedagogiques}
          inscriptions_administratives={inscriptions_administratives}
          offres_formation={offres_formation}
          etudiants={etudiants}
          modules={modules}
          niveaux={niveaux}
          sections={sections}
          filters={filters}
          totalCount={totalCount}
        />
      </div>


    </AuthenticatedLayout>

  )
}

export default Index
