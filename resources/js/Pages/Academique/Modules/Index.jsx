import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Header from '../Header'
import FormAjouter from './FormAjouter';
import Desplay from './Desplay';

function Index({annees}) {
    // console.log(annees);
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
          <div className="grid lg:grid-cols-2 grid-cols-1 gap-4 mb-4">
          {/* <FormAjouter /> */}
          {/* <Desplay anneesUniv = {annees}/> */}
        </div>
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-4 mb-4">
        </div>
      </div>

            
    </AuthenticatedLayout>
                
  )
}

export default Index
