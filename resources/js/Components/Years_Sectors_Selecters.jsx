import { usePage } from '@inertiajs/react';
import React, { useEffect, useState } from 'react'

function Years_Sectors_Selecters() {
    const filiers = usePage().props.filieres;
    const academicYears = usePage().props.anneeUniv;

    // Store IDs but initialize with first item's ID
    const [selectedAnneeId, setSelectedAnneeId] = useState(
        localStorage.getItem('selectedAnneeId') || academicYears[0]?.id
    );
    const [selectedFilierId, setSelectedFilierId] = useState(
        localStorage.getItem('selectedFilierId') || filiers[0]?.id
    );

    // Update localStorage whenever selection changes
    useEffect(() => {
        if (selectedAnneeId) {
            localStorage.setItem('selectedAnneeId', selectedAnneeId);
        }
    }, [selectedAnneeId]);

    useEffect(() => {
        if (selectedFilierId) {
            localStorage.setItem('selectedFilierId', selectedFilierId);
        }
    }, [selectedFilierId]);
    
    return (
        <div className='flex items-center gap-x-2 lg:gap-x-4'>
            {/* Academic Year Selector */}
            <div className="relative">
                <select
                    value={selectedAnneeId}
                    onChange={(e) => setSelectedAnneeId(e.target.value)}
                    className="block w-full rounded-lg border-0 bg-gray-100 py-2 pl-3 pr-10 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600"
                >
                    {academicYears.map((annee) => (
                        <option key={annee.id_annee} value={annee.id_annee}>
                            {annee.annee_univ}
                        </option>
                    ))}
                </select>
            </div>
            {/* fillier */}
            <div className="relative">
                <select
                    value={selectedFilierId}
                    onChange={(e) => setSelectedFilierId(e.target.value)}
                    className="block w-full rounded-lg border-0 bg-gray-100 py-2 pl-3 pr-10 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600"
                >
                    {filiers.map((filier) => (
                        <option key={filier.id_filiere} value={filier.id_filiere}>
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