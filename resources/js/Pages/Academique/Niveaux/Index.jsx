import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Header from '../Header'
import FormAjouter from './FormAjouter';
import Desplay from './Desplay';

function Index({niveaux, filieres}) {
  console.log(niveaux);
  
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
          {/* <div className="grid lg:grid-cols-2 grid-cols-1 gap-4 mb-4"> */}
          {/* <FormAjouter /> */}
          <Desplay niveaux = {niveaux} filieres={filieres}/>
        {/* </div> */}
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-4 mb-4">
        </div>
      </div>

            
    </AuthenticatedLayout>
                
  )
}

export default Index
