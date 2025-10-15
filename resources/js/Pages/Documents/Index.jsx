import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Index() {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-200">
                    Documents
                </h2>
            }
        >
            <Head title="Documents" />
           <div>
            hello from documents
           </div>
        </AuthenticatedLayout>
    );
}
