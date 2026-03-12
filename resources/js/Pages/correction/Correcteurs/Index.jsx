import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import CorrectionHeader from '../Header';
import { Users } from 'lucide-react';

export default function CorrectorsIndex() {
    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Gestion des correcteurs</h2>}
        >
            <Head title="Gestion des correcteurs" />
            
            <CorrectionHeader />
            
            <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4">
                    <Users size={24} className="text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Bienvenue dans la gestion des correcteurs</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300">Cette page permet de gérer les correcteurs et leurs attributions.</p>
            </div>
        </AuthenticatedLayout>
    );
}
