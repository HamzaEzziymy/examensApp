import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import React from 'react';
import Display from './Display';

function Index({ salles }) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Gestion des Salles
                </h2>
            }
        >
            <Head title="Salles" />
            <div className="p-4 rounded-lg">
                <Display salles={salles} />
            </div>
        </AuthenticatedLayout>
    );
}

export default Index;
