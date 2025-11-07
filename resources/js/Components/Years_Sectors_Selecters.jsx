import { usePage } from '@inertiajs/react';
import React, { useState } from 'react'

function Years_Sectors_Selecters() {
    const filiers = usePage().props.filieres;
    const academicYears = usePage().props.anneeUniv;
        
    
    const [selectedYear, setSelectedYear] = useState('2024-2025');
    const [selectedFilier, setSelectedFilier] = useState('Pharmacie');


  return (
    <div className='flex items-center gap-x-2 lg:gap-x-4'>
        {/* Academic Year Selector */}
        <div className="relative">
            <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="block w-full rounded-lg border-0 bg-gray-100 py-2 pl-3 pr-10 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600"
            >
                {academicYears.map((year) => (
                    <option key={year.annee_univ} value={year.annee_univ}>
                        {year.annee_univ}
                    </option>
                ))}
            </select>
        </div>
        {/* fillier */}
        <div className="relative">
            <select
                value={selectedFilier}
                onChange={(e) => setSelectedFilier(e.target.value)}
                className="block w-full rounded-lg border-0 bg-gray-100 py-2 pl-3 pr-10 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600"
            >
                {filiers.map((filier) => (
                    <option key={filier.nom_filiere} value={filier.nom_filiere}>
                        {filier.nom_filiere}
                    </option>
                ))}
            </select>
        </div>
        {/* Dark Mode Toggle */}
    </div>
  )
}

export default Years_Sectors_Selecters
