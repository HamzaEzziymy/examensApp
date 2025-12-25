import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import React from 'react';
import Header from '../Header';
import Display from './Display';

function Index({ 
    stages, 
    inscriptionsPedagogiques, 
    modules, 
    enseignants,
    niveaux,
    sections,
    filters,
    totalCount
}) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Gestion des Stages
                </h2>
            }
        >
            <Head title="Stages" />
            <Header />
            <div className="p-4 rounded-lg">
                <Display
                    stages={stages}
                    inscriptionsPedagogiques={inscriptionsPedagogiques}
                    modules={modules}
                    enseignants={enseignants}
                    niveaux={niveaux}
                    sections={sections}
                    filters={filters}
                    totalCount={totalCount}
                />
            </div>
        </AuthenticatedLayout>
    );
}

export default Index;