import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Header from '../Header'
import Display from './Display';

function Index({ offresFormation, sections, semestres, modules, coordinateurs, anneeUniversitaires }) {

  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
          Offre Formation
        </h2>
      }
    >
      <Head title="Offre Formation" />
      <Header />
      <div className="p-4 rounded-lg">
        <Display
          offresFormation={offresFormation}
          sections={sections}
          semestres={semestres}
          modules={modules}
          coordinateurs={coordinateurs}
          anneeUniversitaires={anneeUniversitaires}
        />
      </div>


    </AuthenticatedLayout>

  )
}

export default Index
