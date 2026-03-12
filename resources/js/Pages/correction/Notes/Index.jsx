import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import CorrectionHeader from '../Header';
import { FileText } from 'lucide-react';

export default function NotesIndex() {
    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Gestion des notes</h2>}
        >
            <Head title="Gestion des notes" />
            
            <CorrectionHeader />
            
            <div className="rounded-xl bg-white p-6 shadow dark:bg-gray-800">
                <div className="flex items-center gap-3 mb-4">
                    <FileText size={24} className="text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Bienvenue dans la gestion des notes</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300">Cette page permet de gérer les notes des étudiants.</p>
            </div>
        </AuthenticatedLayout>
    );
}
