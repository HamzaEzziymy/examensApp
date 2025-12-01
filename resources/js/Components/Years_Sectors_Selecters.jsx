
import React, { useState, useEffect } from "react";
import { usePage, router, useForm } from "@inertiajs/react";
import { toast, ToastContainer } from "react-toastify";

export default function YearsSectorsSelecters() {
    const { filieres, anneeUniv, auth } = usePage().props;
    const userAnnee = auth.user_filiere_annee.annees_univ[0]?.id_annee;
    const userFiliere = auth.user_filiere_annee.filieres[0]?.id_filiere;

    const form2 = useForm({
        id: auth.user_filiere_annee.id,
        user_id: auth.user.id,
        id_filiere: userFiliere || "",
        id_annee: userAnnee || "",
    });
    const [form, setForm] = useState({
        id: auth.user_filiere_annee.id,
        user_id: auth.user.id,
        id_filiere: userFiliere || "",
        id_annee: userAnnee || "",
    });

    const [processing, setProcessing] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Check if current selection matches user's saved selection
    const isCurrentSelection = (type, id) => {
        if (type === 'filiere') {
            return id === userFiliere;
        }
        return id === userAnnee;
    };

    // Track changes
    useEffect(() => {
        const changed = form.id_filiere !== userFiliere || form.id_annee !== userAnnee;
        setHasChanges(changed);
    }, [form.id_filiere, form.id_annee, userFiliere, userAnnee]);

    const handleSubmit = (e) => {
        if (e) {
            e.preventDefault();
        }
        
        // Prevent submission if either value is empty or no changes made
        if (!form.id_filiere || !form.id_annee || processing || !hasChanges) {
            return;
        }

        setProcessing(true);
        router.put("/configuration/select-filiere-annee/update", form, {
            preserveScroll: true,
            onSuccess: () => {
                setProcessing(false);
                setHasChanges(false);
                //do toast success
                toast.success("Selection updated successfully!");
            },
            onError: (errors) => {
                console.error("Submission error:", errors);
                setProcessing(false);
            },
        });
    };

    // Handle empty states
    if (!filieres || filieres.length === 0 || !anneeUniv || anneeUniv.length === 0) {
        return (
            <div className="flex items-center gap-x-3 lg:gap-x-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    No data available
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-x-3 lg:gap-x-4">
            {/* Academic Year Selector */}
            <div className="relative">
                <select
                    value={form.id_annee}
                    onChange={(e) =>
                        setForm({ ...form, id_annee: e.target.value })
                    }
                    disabled={processing}
                    className="block w-full rounded-lg border-0 bg-gray-100 py-2 pl-3 pr-10 text-sm font-medium text-gray-900 shadow-sm 
                    ring-1 ring-inset ring-gray-300 
                    focus:ring-2 focus:ring-indigo-600
                    dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {anneeUniv.map((annee) => (
                        <option key={annee.id_annee} value={annee.id_annee}>
                            {isCurrentSelection('annee', annee.id_annee) ? '✓ ' : ''}
                            {annee.annee_univ}
                        </option>
                    ))}
                </select>
            </div>

            {/* Filiere Selector */}
            <div className="relative">
                <select
                    value={form.id_filiere}
                    onChange={(e) =>
                        setForm({ ...form, id_filiere: e.target.value })
                    }
                    disabled={processing}
                    className="block w-full rounded-lg border-0 bg-gray-100 py-2 pl-3 pr-10 text-sm font-medium text-gray-900 shadow-sm 
                    ring-1 ring-inset ring-gray-300 
                    focus:ring-2 focus:ring-indigo-600
                    dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {filieres.map((f) => (
                        <option key={f.id_filiere} value={f.id_filiere}>
                            {isCurrentSelection('filiere', f.id_filiere) ? '✓ ' : ''}
                            {f.nom_filiere}
                        </option>
                    ))}
                </select>
            </div>

            {/* Submit Button */}
            <div className="relative">
                <button
                    onClick={handleSubmit}
                    disabled={processing || !form.id_filiere || !form.id_annee || !hasChanges}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm 
                    hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                    dark:bg-indigo-500 dark:hover:bg-indigo-600
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {processing ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                        </>
                    ) : (
                        "Save Selection"
                    )}
                </button>
            </div>
        </div>
    );
}
