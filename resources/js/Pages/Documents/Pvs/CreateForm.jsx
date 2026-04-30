import React from 'react';
import { useForm } from '@inertiajs/react';

export default function CreateForm({ sessions = [], niveaux = [], salles = [], modules = [], filieres = [], sections = [], onSuccess }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        nomDoc: '',
        descripDoc: '',
        session: '',
        niveau: '',
        filiere: '',
        section: '',
        salle: '',
        module: '',
    });

    const filteredSections = sections.filter(section => 
        !data.filiere || section.id_filiere == data.filiere
    );

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('proces-v.store'), {
            onSuccess: () => {
                reset();
                if (onSuccess) onSuccess();
            }
        });
    };

    const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent";
    const labelClass = "block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1";

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
                <label className={labelClass}>Nom Document *</label>
                <input type="text" value={data.nomDoc} onChange={e => setData('nomDoc', e.target.value)}
                    className={inputClass} placeholder="Nom du document" required />
                {errors.nomDoc && <p className="text-red-500 text-xs mt-1">{errors.nomDoc}</p>}
            </div>

            <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea value={data.descripDoc} onChange={e => setData('descripDoc', e.target.value)}
                    className={inputClass} rows={2} placeholder="Description optionnelle" />
                {errors.descripDoc && <p className="text-red-500 text-xs mt-1">{errors.descripDoc}</p>}
            </div>

            <div>
                <label className={labelClass}>Session *</label>
                <select value={data.session} onChange={e => setData('session', e.target.value)} className={inputClass} required>
                    <option value="">Sélectionner</option>
                    {sessions.map(s => <option key={s.id_session_examen} value={s.nom_session}>{s.nom_session}</option>)}
                </select>
                {errors.session && <p className="text-red-500 text-xs mt-1">{errors.session}</p>}
            </div>

            <div>
                <label className={labelClass}>Niveau *</label>
                <select value={data.niveau} onChange={e => setData('niveau', e.target.value)} className={inputClass} required>
                    <option value="">Sélectionner</option>
                    {niveaux.map(n => <option key={n.id_niveau} value={n.nom_niveau}>{n.nom_niveau}</option>)}
                </select>
                {errors.niveau && <p className="text-red-500 text-xs mt-1">{errors.niveau}</p>}
            </div>

            <div>
                <label className={labelClass}>Filière *</label>
                <select value={data.filiere} onChange={e => { setData('filiere', e.target.value); setData('section', ''); }} className={inputClass} required>
                    <option value="">Sélectionner</option>
                    {filieres.map(f => <option key={f.id_filiere} value={f.id_filiere}>{f.nom_filiere}</option>)}
                </select>
                {errors.filiere && <p className="text-red-500 text-xs mt-1">{errors.filiere}</p>}
            </div>

            <div>
                <label className={labelClass}>Section *</label>
                <select value={data.section} onChange={e => setData('section', e.target.value)} className={inputClass} required disabled={!data.filiere}>
                    <option value="">{data.filiere ? 'Sélectionner' : '— Choisir filière —'}</option>
                    {filteredSections.map(s => <option key={s.id_section} value={s.nom_section}>{s.nom_section}</option>)}
                </select>
                {errors.section && <p className="text-red-500 text-xs mt-1">{errors.section}</p>}
            </div>

            <div>
                <label className={labelClass}>Salle *</label>
                <select value={data.salle} onChange={e => setData('salle', e.target.value)} className={inputClass} required>
                    <option value="">Sélectionner</option>
                    {salles.map(s => <option key={s.id_salle} value={s.nom_salle}>{s.nom_salle}</option>)}
                </select>
                {errors.salle && <p className="text-red-500 text-xs mt-1">{errors.salle}</p>}
            </div>

            <div>
                <label className={labelClass}>Module *</label>
                <select value={data.module} onChange={e => setData('module', e.target.value)} className={inputClass} required>
                    <option value="">Sélectionner</option>
                    {modules.map(m => <option key={m.id_module} value={m.nom_module}>{m.nom_module}</option>)}
                </select>
                {errors.module && <p className="text-red-500 text-xs mt-1">{errors.module}</p>}
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button type="submit" disabled={processing}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                    {processing ? 'Génération...' : 'Générer le PV'}
                </button>
            </div>
        </form>
    );
}
