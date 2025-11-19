import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Header from '../Header'
import Display from './Display';

function Index({filieres, facultes}) {
  
  return (
    <AuthenticatedLayout
        header={
          <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
            Filières
          </h2>
        }
    >
      <Head title="filieres" />
      <Header />
      <div className="p-4 rounded-lg">
          <Display filieres = {filieres} facultes={facultes} />
      </div>

            
    </AuthenticatedLayout>
                
  )
}

export default Index
