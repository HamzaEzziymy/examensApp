import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Display from './Display'

function Index({faculte}) {
  return (
    <AuthenticatedLayout
        header={
          <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
            Configuration Initiale de la Faculté
          </h2>
        }
    >
      <Head title="filieres" />
      <div className="p-4 rounded-lg">
          <Display  faculte={faculte[0]}/>
      </div>

            
    </AuthenticatedLayout>
                
  )
}

export default Index
