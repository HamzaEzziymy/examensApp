import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Header from '../Header'
import Display from './Display';

function Index({niveaux, filieres}) {
  
  return (
    <AuthenticatedLayout
        header={
          <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
            Niveaux
          </h2>
        }
    >
      <Head title="niveaux" />
      <Header />
      <div className="p-4 rounded-lg">
        <Display niveaux = {niveaux} filieres={filieres}/>
      </div>
    </AuthenticatedLayout>
                
  )
}

export default Index;
