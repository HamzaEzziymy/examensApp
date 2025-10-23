import React, { useState } from 'react'

function Years_Sectors_Selecters() {
    
    const [selectedYear, setSelectedYear] = useState('2024-2025');
    const [selectedFilier, setSelectedFilier] = useState('Pharmacie'); 
    // Academic years list
        const academicYears = [
            { value: '2024-2025', label: '2024-2025' },
            { value: '2023-2024', label: '2023-2024' },
            { value: '2022-2023', label: '2022-2023' },
            { value: '2021-2022', label: '2021-2022 (Archived)' },
        ];
    
        // filiers
        const filiers = [
            { value: 'PHR', label: 'Pharmacie' },
            { value: 'MED FR', label: 'Médecine FR' },
            { value: 'MED ANG', label: 'Médecine ANG' },
            { value: 'MED DEN', label: 'Médecine Dentaire' },
        ];

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
                    <option key={year.value} value={year.value}>
                        {year.label}
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
                    <option key={filier.value} value={filier.value}>
                        {filier.label}
                    </option>
                ))}
            </select>
        </div>
        {/* Dark Mode Toggle */}
    </div>
  )
}

export default Years_Sectors_Selecters
