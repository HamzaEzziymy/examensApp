import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Header from '../Header'
import CreateForm from './CreateForm'
import DisplayDocuments from './DisplayDocuments'

function Index({documents}) {
  
  return (
    <AuthenticatedLayout
        header={
          <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
            Documents
          </h2>
        }
    >
      <Head title="Documents" />
      <Header />
      <div className='flex flex-col lg:flex-row justify-between gap-4 lg:gap-6 p-4'>
        <CreateForm className='w-full rounded-lg shadow-sm' />
        <DisplayDocuments documents={documents} className='w-full rounded-lg shadow-sm' />
      </div>

            
    </AuthenticatedLayout>
                
  )
}

export default Index
