import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Header from '../Header'
import Desplay from './Desplay';

function Index({ modules, filters, totalCount }) {
  
  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
          Modules
        </h2>
      }
    >
      <Head title="modules" />
      <Header />
      <div className="p-4 rounded-lg">
        <Desplay modules={modules} filters={filters} totalCount={totalCount} />
      </div>


    </AuthenticatedLayout>

  )
}

export default Index
