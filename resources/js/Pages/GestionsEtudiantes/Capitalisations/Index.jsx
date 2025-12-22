import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Header from '../Header'
import Display from './Display';

function Index({ capitalisations, inscriptionsPedagogiques, modules }) {

  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
          Gestions Étudiantes - Capitalisations
        </h2>
      }
    >
      <Head title="Capitalisations" />
      <Header />
      <div className="p-4 rounded-lg">
        <Display
          capitalisations={capitalisations}
          inscriptionsPedagogiques={inscriptionsPedagogiques}
          modules={modules}
        />
      </div>


    </AuthenticatedLayout>

  )
}

export default Index