import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import CorrectionHeader from '../Header';
import { BarChart3 } from 'lucide-react';

export default function ResultatsModulesIndex() {
    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Résultats des modules</h2>}
        >
            <Head title="Résultats des modules" />
            
            <CorrectionHeader />
            
            <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4">
                    <BarChart3 size={24} className="text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Bienvenue dans les résultats des modules</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300">Cette page affiche les résultats des modules pour tous les étudiants.</p>
            </div>
        </AuthenticatedLayout>
    );
}
