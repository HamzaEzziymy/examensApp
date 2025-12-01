import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Header from '../Header'
import Display from './Display';

function Index({ students, sections }) {
  console.log(students);

  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
          Gestions Étudiantes - Étudiantes
        </h2>
      }
    >
      <Head title="Etudiantes" />
      <Header />
      <div className="p-4 rounded-lg">
        <Display
          students={students}
          sections={sections}
        />
      </div>


    </AuthenticatedLayout>

  )
}

export default Index
