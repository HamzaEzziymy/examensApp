import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Header from '../Header'
import PvAbsenceSection from './PvAbsenceSection'

function Index({documents, sessions, niveaux, salles, modules, filieres, sections}) {
  
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
      <div className='p-4'>
        <PvAbsenceSection
          documents={documents}
          formProps={{
            sessions,
            niveaux,
            salles,
            modules,
            filieres,
            sections,
          }}
        />
      </div>

            
    </AuthenticatedLayout>
                
  )
}

export default Index
