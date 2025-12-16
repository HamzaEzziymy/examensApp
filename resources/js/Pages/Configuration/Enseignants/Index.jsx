import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import React from 'react';
import Display from './Display';

function Index({ enseignants, availableUsers }) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Gestion des Enseignants
                </h2>
            }
        >
            <Head title="Enseignants" />
            <div className="p-4 rounded-lg">
                <Display
                    enseignants={enseignants}
                    availableUsers={availableUsers}
                />
            </div>
        </AuthenticatedLayout>
    );
}

export default Index;