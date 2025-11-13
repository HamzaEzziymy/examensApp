import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import ExamHeader from '../Header';
import SessionForm from './SessionForm';
import SessionTable from './SessionTable';

export default function SessionsIndex({ sessions, filieres, annees, typesSession }) {
    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Sessions d’examen</h2>}
        >
            <Head title="Sessions d’examen" />

            <ExamHeader />

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-1">
                    <SessionForm filieres={filieres} annees={annees} typesSession={typesSession} />
                </div>
                <div className="lg:col-span-2">
                    <SessionTable sessions={sessions} filieres={filieres} annees={annees} typesSession={typesSession} />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
