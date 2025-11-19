import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import Header from '../Header'
import Display from './Display';

function Index({ offresFormation }) {
  console.log(offresFormation);

  return (
    <AuthenticatedLayout
      header={
        <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
          Offre Formation
        </h2>
      }
    >
      <Head title="Offre Formation" />
      <Header />
      <div className="p-4 rounded-lg">
        <Display offresFormation = {offresFormation} />
      </div>


    </AuthenticatedLayout>

  )
}

export default Index
