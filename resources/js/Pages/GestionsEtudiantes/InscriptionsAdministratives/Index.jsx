import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Header from '../Header'
import Display from './Display';

function Index({ inscriptions, students, annees, niveaux, sections }) {
  console.log(inscriptions);

  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
          Inscriptions Administratives
        </h2>
      }
    >
      <Head title="Etudiantes" />
      <Header />
      <div className="p-4 rounded-lg">
        <Display
            inscriptions= {inscriptions}
            students = {students}
            annees = {annees}
            niveaux = {niveaux}
            sections = {sections}
        />
      </div>


    </AuthenticatedLayout>

  )
}

export default Index
