import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import FormAjouter from './FormAjouter';
import Display from './Display';

function Index({annees}) {
  
  return (
    <AuthenticatedLayout
        header={
          <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
            annees universitaires
          </h2>
        }
    >
      <Head title="annees universitaires" />
      <div className="p-4 rounded-lg">
          <div className="grid lg:grid-cols-2 grid-cols-1 gap-4 mb-4">
          <FormAjouter />
          <Display anneesUniv = {annees}/>
        </div>
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-4 mb-4">
        </div>
      </div>

            
    </AuthenticatedLayout>
                
  )
}

export default Index
