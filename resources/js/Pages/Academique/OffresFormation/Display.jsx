import React, { useState, useEffect, useMemo } from 'react';
import { useForm, router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Pencil, Trash2, Plus, Search, ChevronDown, ChevronUp, Filter, Download, X, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Display({ 
    offresFormation: paginatedOffres, 
    sections = [], 
    semestres = [], 
    modules = [], 
    coordinateurs = [],
    anneeUniversitaires = [],
    filters: initialFilters = {},
    totalCount = 0
}) {
    const { auth } = usePage().props;
    
    // Get user's selected année and filière from Years_Sectors_Selecters
    const userSelectedAnnee = auth.user_filiere_annee?.id_annee || 'all';
    const userSelectedFiliere = auth.user_filiere_annee?.id_filiere || 'all';
    
    const [expandedRows, setExpandedRows] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(''); // 'add' or 'edit'
    const [selectedOffre, setSelectedOffre] = useState(null);
    const [moduleSearch, setModuleSearch] = useState('');
    const [coordSearch, setCoordSearch] = useState('');
    const [showModuleDropdown, setShowModuleDropdown] = useState(false);
    const [showCoordDropdown, setShowCoordDropdown] = useState(false);
    
    // Search and filter states (now using backend)
    const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
    const [semestreFilter, setSemestreFilter] = useState(initialFilters.semestre || '');
    const [sectionFilter, setSectionFilter] = useState(initialFilters.section || '');
    const [perPage, setPerPage] = useState(initialFilters.per_page || 25);

    // Export state
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportScope, setExportScope] = useState('all');
    const [exportSemestre, setExportSemestre] = useState('all');
    const [exportFilename, setExportFilename] = useState('offres_formation');
    const [exportSortField, setExportSortField] = useState('module');
    const [exportSortDir, setExportSortDir] = useState('asc');
    const [exportSortField2, setExportSortField2] = useState('section');
    const [exportSortDir2, setExportSortDir2] = useState('asc');
    const [exportColumns, setExportColumns] = useState({
        module: true,
        code_module: false,
        section: true,
        filiere: true,
        semestre: true,
        annee: true,
        coordinateur: false,
        credits: false,
        type_module: false,
        nom_affiche: false,
        element_nom: true,
        element_code: false,
        element_type: true,
        element_coef: true,
    });

    const exportColumnLabels = {
        module: 'Module',
        code_module: 'Code Module',
        section: 'Section',
        filiere: 'Filière',
        semestre: 'Semestre',
        annee: 'Année Univ.',
        coordinateur: 'Coordinateur',
        credits: 'Crédits',
        type_module: 'Type Module',
        nom_affiche: 'Nom Affiché',
        element_nom: 'Élément',
        element_code: 'Code Élément',
        element_type: 'Type Élément',
        element_coef: 'Coefficient',
    };

    const getExportValue = (row, col) => {
        switch (col) {
            case 'module': return row.module?.nom_module || '';
            case 'code_module': return row.module?.code_module || '';
            case 'section': return row.section?.nom_section || '';
            case 'filiere': return row.section?.filiere?.nom_filiere || '';
            case 'semestre': return row.semestre?.nom_semestre || row.semestre?.code_semestre || '';
            case 'annee': return row.annee_universitaire?.annee_univ || '';
            case 'coordinateur': return row.coordinateur ? `${row.coordinateur.nom} ${row.coordinateur.prenom}` : '';
            case 'credits': return row.module?.credits || '';
            case 'type_module': return row.module?.type_module || '';
            case 'nom_affiche': return row.nom_affiche || row.module?.nom_module || '';
            case 'element_nom': return row._element?.nom_element || '';
            case 'element_code': return row._element?.code_element || '';
            case 'element_type': return row._element?.type_element || '';
            case 'element_coef': return row._element?.coefficient ?? '';
            default: return '';
        }
    };

    const handleExport = () => {
        const activeModuleColumns = Object.entries(exportColumns)
            .filter(([k, v]) => v && !k.startsWith('element_'))
            .map(([k]) => k);
        const activeElementColumns = Object.entries(exportColumns)
            .filter(([k, v]) => v && k.startsWith('element_'))
            .map(([k]) => k);

        const sorted = [...offres]
            .filter(o => exportSemestre === 'all' || String(o.id_semestre) === String(exportSemestre))
            .sort((a, b) => {
            const aVal = String(getExportValue(a, exportSortField)).toLowerCase();
            const bVal = String(getExportValue(b, exportSortField)).toLowerCase();
            const cmp1 = exportSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            if (cmp1 !== 0) return cmp1;
            const aVal2 = String(getExportValue(a, exportSortField2)).toLowerCase();
            const bVal2 = String(getExportValue(b, exportSortField2)).toLowerCase();
            return exportSortDir2 === 'asc' ? aVal2.localeCompare(bVal2) : bVal2.localeCompare(aVal2);
        });

        // Total columns = module cols + element cols (or at least 1 for indent)
        const totalCols = Math.max(activeModuleColumns.length, activeElementColumns.length + 1);

        const aoa = []; // array of arrays

        // Header row
        const headerRow = activeModuleColumns.map(col => exportColumnLabels[col]);
        // Pad to totalCols
        while (headerRow.length < totalCols) headerRow.push('');
        aoa.push(headerRow);

        sorted.forEach(offre => {
            // Module row
            const moduleRow = activeModuleColumns.map(col => getExportValue(offre, col));
            while (moduleRow.length < totalCols) moduleRow.push('');
            aoa.push(moduleRow);

            // Element rows — indented by 1 col, with element sub-header if first offre
            const elements = offre.module?.elements || [];
            if (elements.length > 0 && activeElementColumns.length > 0) {
                // Sub-header for elements
                const elHeader = ['  ↳', ...activeElementColumns.map(col => exportColumnLabels[col])];
                while (elHeader.length < totalCols) elHeader.push('');
                aoa.push(elHeader);

                elements.forEach(el => {
                    const elRow = ['    ', ...activeElementColumns.map(col => getExportValue({ ...offre, _element: el }, col))];
                    while (elRow.length < totalCols) elRow.push('');
                    aoa.push(elRow);
                });
            }

            // Blank separator between offres
            aoa.push(Array(totalCols).fill(''));
        });

        const wsData = XLSX.utils.aoa_to_sheet(aoa);
        wsData['!cols'] = Array(totalCols).fill({ wch: 24 });
        wsData['!freeze'] = { xSplit: 0, ySplit: 1 };

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsData, 'Offres Formation');
        XLSX.writeFile(wb, `${exportFilename || 'offres_formation'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        setShowExportModal(false);
    };
    
    // Filter sections based on user's selected filière
    const filteredSections = useMemo(() => {
        if (userSelectedFiliere === 'all') {
            return sections;
        }
        return sections.filter(section => section.id_filiere == userSelectedFiliere);
    }, [sections, userSelectedFiliere]);

    // Extract offres data from paginated response
    const offres = paginatedOffres.data || [];
    const currentPage = paginatedOffres.current_page || 1;
    const lastPage = paginatedOffres.last_page || 1;
    const total = paginatedOffres.total || 0;

    const offreForm = useForm({
        id_offre: null,
        id_section: '',
        id_semestre: '',
        id_module: '',
        id_coordinateur: '',
        id_annee: new Date().getFullYear(),
        nom_affiche: ''
    });

    // Handle search with backend
    const handleSearch = (value) => {
        setSearchTerm(value);
        router.get(route('academique.offres-formations.index'), {
            search: value,
            annee: userSelectedAnnee !== 'all' ? userSelectedAnnee : '',
            section: sectionFilter,
            semestre: semestreFilter,
            per_page: perPage,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Handle filter changes with backend
    const handleFilterChange = (filterName, value) => {
        const newFilters = {
            search: searchTerm,
            annee: userSelectedAnnee !== 'all' ? userSelectedAnnee : '',
            section: sectionFilter,
            semestre: semestreFilter,
            per_page: perPage,
        };
        
        newFilters[filterName] = value;
        
        // Update local state
        if (filterName === 'semestre') setSemestreFilter(value);
        if (filterName === 'section') setSectionFilter(value);
        if (filterName === 'per_page') setPerPage(value);
        
        router.get(route('academique.offres-formations.index'), newFilters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Handle pagination
    const goToPage = (page) => {
        router.get(route('academique.offres-formations.index'), {
            search: searchTerm,
            annee: userSelectedAnnee !== 'all' ? userSelectedAnnee : '',
            section: sectionFilter,
            semestre: semestreFilter,
            per_page: perPage,
            page: page,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const openAddModal = () => {
        setModalType('add');
        offreForm.setData({
            id_offre: null,
            id_section: '',
            id_semestre: '',
            id_module: '',
            id_coordinateur: '',
            id_annee: new Date().getFullYear(),
            nom_affiche: ''
        });
        setModuleSearch('');
        setCoordSearch('');
        setShowModuleDropdown(false);
        setShowCoordDropdown(false);
        setModalOpen(true);
    };

    const openEditModal = (offre) => {
        setModalType('edit');
        setSelectedOffre(offre);
        offreForm.setData({
            id_offre: offre.id_offre,
            id_section: offre.id_section,
            id_semestre: offre.id_semestre,
            id_module: offre.id_module,
            id_coordinateur: offre.id_coordinateur,
            id_annee: offre.id_annee,
            nom_affiche: offre.nom_affiche
        });
        const mod = modules.find(m => m.id_module === offre.id_module);
        const coord = coordinateurs.find(c => c.id_enseignant === offre.id_coordinateur);
        setModuleSearch(mod ? `${mod.code_module} - ${mod.nom_module}` : '');
        setCoordSearch(coord ? `${coord.nom} ${coord.prenom}` : '');
        setShowModuleDropdown(false);
        setShowCoordDropdown(false);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setModalType('');
        setSelectedOffre(null);
        setModuleSearch('');
        setCoordSearch('');
        offreForm.reset();
    };

    // Filter available modules based on what's already used
    // A module is unavailable only if it's already used with the SAME section AND same année
    const getAvailableModules = () => {
        const selectedSection = offreForm.data.id_section;
        const selectedAnnee = offreForm.data.id_annee;

        // Build a set of (id_module + id_section + id_annee) combos already used
        const usedCombos = new Set(
            offres.map(o => `${o.id_module}_${o.id_section}_${o.id_annee}`)
        );

        let availableModules = [];

        if (modalType === 'add') {
            availableModules = modules.filter(module => {
                const combo = `${module.id_module}_${selectedSection}_${selectedAnnee}`;
                return !usedCombos.has(combo);
            });
        } else if (modalType === 'edit' && selectedOffre) {
            availableModules = modules.filter(module => {
                if (module.id_module === selectedOffre.id_module) return true;
                const combo = `${module.id_module}_${selectedSection}_${selectedAnnee}`;
                return !usedCombos.has(combo);
            });
        } else {
            availableModules = modules;
        }

        return availableModules.sort((a, b) => {
            const codeA = a.code_module || '';
            const codeB = b.code_module || '';
            return codeA.localeCompare(codeB);
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const action = modalType === 'add' 
            ? offreForm.post(route('academique.offres-formations.store'), {
                onSuccess: () => {
                    offreForm.reset();
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Offre ajoutée',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Une erreur est survenue',
                        showConfirmButton: false,
                        timer: 1500
                    });
                }
            })
            : offreForm.put(route('academique.offres-formations.update', offreForm.data.id_offre), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Offre mise à jour',
                        showConfirmButton: false,
                        timer: 1500
                    });
                }
            });
    };

    const handleDelete = (offre) => {
        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: "Cette action est irréversible !",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        }).then((result) => {
            if (result.isConfirmed) {
                offreForm.delete(route('academique.offres-formations.destroy', offre.id_offre), {
                    onSuccess: () => {
                        Swal.fire('Supprimé !', 'L\'offre a été supprimée.', 'success');
                    },
                    onError: () => {
                        Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                    }
                });
            }
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSemestreFilter('');
        setSectionFilter('');
        router.get(route('academique.offres-formations.index'), {
            search: '',
            annee: userSelectedAnnee !== 'all' ? userSelectedAnnee : '',
            section: '',
            semestre: '',
            per_page: 25,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const getModuleTypeColor = (type) => {
        const colors = {
            'THESE': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
            'COURS': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
            'STAGE': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
            'PROJET': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
            'MEMOIRE': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        };
        return colors[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    };

    const getModuleTypeLabel = (type) => {
        const labels = {
            'THESE': 'Thèse',
            'COURS': 'Cours',
            'STAGE': 'Stage',
            'PROJET': 'Projet',
            'MEMOIRE': 'Mémoire'
        };
        return labels[type] || type;
    };

    return (
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 rounded-md">
            {/* Header with Search, Filters and Actions */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-300 dark:border-gray-700 pb-4 mb-6">
                <h2 className="text-2xl font-semibold">Gestion des Offres de Formation</h2>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:flex-none">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 w-full sm:w-80 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded whitespace-nowrap"
                        >
                            <FileDown size={18} />
                            <span>Exporter</span>
                        </button>
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded whitespace-nowrap"
                        >
                            <Plus size={18} />
                            <span>Nouvelle Offre</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Count and Filters */}
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {total} offre(s) trouvée(s)
                    {searchTerm && (
                        <span> pour "{searchTerm}"</span>
                    )}
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Section:</label>
                    <select
                        value={sectionFilter}
                        onChange={(e) => handleFilterChange('section', e.target.value)}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Toutes</option>
                        {sections.map(section => (
                            <option key={section.id_section} value={section.id_section}>
                                {section.filiere?.nom_filiere} ({section.nom_section})
                            </option>
                        ))}
                    </select>

                    <label className="text-sm text-gray-600 dark:text-gray-400">Semestre:</label>
                    <select
                        value={semestreFilter}
                        onChange={(e) => handleFilterChange('semestre', e.target.value)}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Tous</option>
                        {semestres.map(semestre => (
                            <option key={semestre.id_semestre} value={semestre.id_semestre}>
                                {semestre.nom_semestre}
                            </option>
                        ))}
                    </select>
                    
                    <label className="text-sm text-gray-600 dark:text-gray-400">Par page:</label>
                    <select
                        value={perPage}
                        onChange={(e) => handleFilterChange('per_page', Number(e.target.value))}
                        className="px-5 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                    
                    <button
                        onClick={clearFilters}
                        className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                    >
                        Effacer
                    </button>
                </div>
            </div>

            {/* Offres Table */}
            <div className="overflow-x-auto rounded shadow border dark:border-gray-700">
                <table className="min-w-full table-auto">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="px-4 py-3 text-left w-12"></th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Module</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Filière & Section</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Semestre & Niveau</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Coordinateur</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Crédits</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {offres.map((offre) => (
                            <React.Fragment key={offre.id_offre}>
                                <tr className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => toggleRow(offre.id_offre)}
                                            className="text-blue-500 hover:text-blue-700"
                                            aria-label="Toggle détails"
                                        >
                                            {expandedRows[offre.id_offre] ? 
                                                <ChevronUp size={20} /> : 
                                                <ChevronDown size={20} />
                                            }
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">{offre.module?.nom_module}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                {offre.module?.code_module}
                                            </span>
                                            {offre.module?.type_module && (
                                                <span className={`mt-1 px-2 py-1 rounded text-xs font-medium ${getModuleTypeColor(offre.module.type_module)}`}>
                                                    {getModuleTypeLabel(offre.module.type_module)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{offre.section?.filiere?.nom_filiere}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {offre.section?.nom_section}
                                            </span>
                                            <span className={`mt-1 px-2 py-1 rounded text-xs font-medium ${
                                                offre.section?.langue === 'FR' 
                                                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                                    : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                                            }`}>
                                                {offre.section?.langue}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{offre.semestre?.nom_semestre}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {offre.semestre?.niveau?.nom_niveau}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                {offre.semestre?.code_semestre}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {offre.coordinateur ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">
                                                    {offre.coordinateur.prenom} {offre.coordinateur.nom}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {offre.coordinateur.email}
                                                </span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                    {offre.coordinateur.matricule}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm italic">Non assigné</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded text-sm font-medium">
                                            {offre.module?.credits} cr
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEditModal(offre)}
                                                className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
                                                aria-label="Modifier l'offre"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(offre)}
                                                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded"
                                                aria-label="Supprimer l'offre"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                {expandedRows[offre.id_offre] && (
                                    <tr className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                        <td colSpan="7" className="px-4 py-4">
                                            <div className="ml-8">
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    {/* Module Details */}
                                                    <div>
                                                        <h4 className="text-lg font-semibold mb-3 text-blue-700 dark:text-blue-400">
                                                            Détails du Module
                                                        </h4>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between">
                                                                <span className="font-medium">Nom affiché:</span>
                                                                <span>{offre.nom_affiche || offre.module?.nom_module}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="font-medium">Crédits:</span>
                                                                <span>{offre.module?.credits}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="font-medium">Type:</span>
                                                                <span>{getModuleTypeLabel(offre.module?.type_module)}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Elements */}
                                                    <div>
                                                        <h4 className="text-lg font-semibold mb-3 text-green-700 dark:text-green-400">
                                                            Éléments ({offre.module?.elements?.length || 0})
                                                        </h4>
                                                        {offre.module?.elements && offre.module.elements.length > 0 ? (
                                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                                {offre.module.elements.map((element) => (
                                                                    <div
                                                                        key={element.id_element}
                                                                        className="bg-white dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700"
                                                                    >
                                                                        <div className="flex justify-between items-center">
                                                                            <div>
                                                                                <span className="font-medium block">{element.nom_element}</span>
                                                                                <span className="text-xs text-gray-500 font-mono">{element.code_element}</span>
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                                    element.type_element === 'STAGE_ELEMENT' 
                                                                                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                                                                        : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                                                                }`}>
                                                                                    {element.type_element}
                                                                                </span>
                                                                                <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded text-xs font-medium">
                                                                                    Coef: {element.coefficient}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-500 dark:text-gray-400 italic text-sm">
                                                                Aucun élément défini
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* No results message */}
            {offres.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="text-lg mb-2">Aucune offre trouvée</p>
                    <p className="text-sm">Essayez de modifier vos critères de recherche ou créez une nouvelle offre</p>
                </div>
            )}

            {/* Pagination */}
            {lastPage > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {/* Page info */}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Page {currentPage} sur {lastPage} - {total} offre(s)
                    </div>

                    {/* Pagination controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Précédent
                        </button>
                        
                        {/* Page numbers */}
                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(lastPage, 10) }, (_, i) => {
                                let page;
                                if (lastPage <= 10) {
                                    page = i + 1;
                                } else if (currentPage <= 5) {
                                    page = i + 1;
                                } else if (currentPage >= lastPage - 4) {
                                    page = lastPage - 9 + i;
                                } else {
                                    page = currentPage - 5 + i;
                                }
                                return (
                                    <button
                                        key={page}
                                        onClick={() => goToPage(page)}
                                        className={`w-8 h-8 rounded text-sm ${
                                            currentPage === page
                                                ? 'bg-blue-500 text-white'
                                                : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === lastPage}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Suivant
                        </button>
                    </div>
                </div>
            )}

            {/* Export Modal */}
            {showExportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                    <FileDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Exporter les Offres de Formation</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Personnalisez votre export Excel</p>
                                </div>
                            </div>
                            <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5">
                            {/* Semestre filter */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Filtrer par semestre</label>
                                <select
                                    value={exportSemestre}
                                    onChange={e => setExportSemestre(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="all">Tous les semestres ({offres.length})</option>
                                    {semestres.filter(s => offres.some(o => o.id_semestre === s.id_semestre)).map(s => {
                                        const count = offres.filter(o => o.id_semestre === s.id_semestre).length;
                                        return (
                                            <option key={s.id_semestre} value={String(s.id_semestre)}>
                                                {s.nom_semestre || s.code_semestre} ({count})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Columns */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Colonnes</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => setExportColumns(Object.fromEntries(Object.keys(exportColumns).map(k => [k, true])))} className="text-xs text-emerald-600 hover:underline">Tout</button>
                                        <span className="text-gray-300">|</span>
                                        <button onClick={() => setExportColumns(Object.fromEntries(Object.keys(exportColumns).map(k => [k, false])))} className="text-xs text-red-500 hover:underline">Aucun</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {Object.entries(exportColumnLabels).map(([key, label]) => (
                                        <label key={key} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer transition-all ${
                                            exportColumns[key] ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                                        }`}>
                                            <input type="checkbox" checked={exportColumns[key]}
                                                onChange={e => setExportColumns(prev => ({ ...prev, [key]: e.target.checked }))}
                                                className="w-3.5 h-3.5 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500" />
                                            <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Sort */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Trier par</label>
                                <div className="space-y-2">
                                    {[
                                        { field: exportSortField, setField: setExportSortField, dir: exportSortDir, setDir: setExportSortDir, label: '1er critère' },
                                        { field: exportSortField2, setField: setExportSortField2, dir: exportSortDir2, setDir: setExportSortDir2, label: '2ème critère' },
                                    ].map((row, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400 w-20 shrink-0">{row.label}</span>
                                            <select value={row.field} onChange={e => row.setField(e.target.value)}
                                                className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500">
                                                {Object.entries(exportColumnLabels).map(([key, label]) => (
                                                    <option key={key} value={key}>{label}</option>
                                                ))}
                                            </select>
                                            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
                                                <button onClick={() => row.setDir('asc')}
                                                    className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${row.dir === 'asc' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                                                    ▲ ASC
                                                </button>
                                                <button onClick={() => row.setDir('desc')}
                                                    className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${row.dir === 'desc' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>
                                                    ▼ DESC
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Filename */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Nom du fichier</label>
                                <div className="flex items-center gap-2">
                                    <input type="text" value={exportFilename} onChange={e => setExportFilename(e.target.value)}
                                        className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500"
                                        placeholder="offres_formation" />
                                    <span className="text-xs text-gray-400 whitespace-nowrap">_{new Date().toISOString().slice(0,10)}.xlsx</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {Object.values(exportColumns).filter(Boolean).length} col · {exportSemestre === 'all' ? offres.length : offres.filter(o => String(o.id_semestre) === String(exportSemestre)).length} offre(s)
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setShowExportModal(false)}
                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                    Annuler
                                </button>
                                <button onClick={handleExport} disabled={Object.values(exportColumns).every(v => !v)}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                                    <FileDown className="w-4 h-4" />
                                    Exporter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                                        {modalType === 'add' ? 'Ajouter une Offre' : "Modifier l'Offre"}
                                    </h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Remplissez les informations de l'offre</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="px-6 py-5 overflow-y-auto space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Section */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Section *</label>
                                        <select
                                            value={offreForm.data.id_section}
                                            onChange={(e) => offreForm.setData('id_section', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="">Sélectionner une section</option>
                                            {filteredSections.map((section) => (
                                                <option key={section.id_section} value={section.id_section}>
                                                    {section.filiere?.nom_filiere} - {section.nom_section} ({section.langue})
                                                </option>
                                            ))}
                                        </select>
                                        {offreForm.errors.id_section && <p className="text-red-500 text-xs mt-1">{offreForm.errors.id_section}</p>}
                                    </div>

                                    {/* Semestre */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Semestre *</label>
                                        <select
                                            value={offreForm.data.id_semestre}
                                            onChange={(e) => offreForm.setData('id_semestre', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="">Sélectionner un semestre</option>
                                            {semestres.map((semestre) => (
                                                <option key={semestre.id_semestre} value={semestre.id_semestre}>
                                                    {semestre.niveau?.nom_niveau} ({semestre.nom_semestre})
                                                </option>
                                            ))}
                                        </select>
                                        {offreForm.errors.id_semestre && <p className="text-red-500 text-xs mt-1">{offreForm.errors.id_semestre}</p>}
                                    </div>

                                    {/* Module */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Module *</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={moduleSearch}
                                                onChange={e => { setModuleSearch(e.target.value); offreForm.setData('id_module', ''); setShowModuleDropdown(true); }}
                                                onFocus={() => setShowModuleDropdown(true)}
                                                placeholder="Rechercher un module..."
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                                autoComplete="off"
                                            />
                                            {showModuleDropdown && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setShowModuleDropdown(false)} />
                                                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                        {getAvailableModules().filter(m => !moduleSearch || m.nom_module.toLowerCase().includes(moduleSearch.toLowerCase()) || m.code_module.toLowerCase().includes(moduleSearch.toLowerCase())).map(m => (
                                                            <button key={m.id_module} type="button"
                                                                onClick={() => { offreForm.setData('id_module', m.id_module); setModuleSearch(`${m.code_module} - ${m.nom_module}`); setShowModuleDropdown(false); }}
                                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${offreForm.data.id_module === m.id_module ? 'bg-blue-50 dark:bg-gray-700 font-medium' : ''}`}>
                                                                <span className="font-mono text-xs text-gray-400 mr-2">{m.code_module}</span>{m.nom_module}
                                                            </button>
                                                        ))}
                                                        {getAvailableModules().filter(m => !moduleSearch || m.nom_module.toLowerCase().includes(moduleSearch.toLowerCase()) || m.code_module.toLowerCase().includes(moduleSearch.toLowerCase())).length === 0 && (
                                                            <div className="px-3 py-4 text-sm text-gray-400 text-center">Aucun module trouvé</div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {offreForm.errors.id_module && <p className="text-red-500 text-xs mt-1">{offreForm.errors.id_module}</p>}
                                        {modalType === 'add' && getAvailableModules().length === 0 && <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">Tous les modules sont déjà utilisés.</p>}
                                        {modalType === 'add' && getAvailableModules().length > 0 && <p className="text-green-600 dark:text-green-400 text-xs mt-1">{getAvailableModules().length} module(s) disponible(s)</p>}
                                    </div>

                                    {/* Coordinateur */}
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Coordinateur</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={coordSearch}
                                                onChange={e => { setCoordSearch(e.target.value); offreForm.setData('id_coordinateur', ''); setShowCoordDropdown(true); }}
                                                onFocus={() => setShowCoordDropdown(true)}
                                                placeholder="Rechercher un coordinateur..."
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                                autoComplete="off"
                                            />
                                            {showCoordDropdown && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setShowCoordDropdown(false)} />
                                                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                        <button type="button" onClick={() => { offreForm.setData('id_coordinateur', ''); setCoordSearch(''); setShowCoordDropdown(false); }}
                                                            className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 italic border-b border-gray-100 dark:border-gray-700">
                                                            Aucun coordinateur
                                                        </button>
                                                        {coordinateurs.filter(c => !coordSearch || c.nom.toLowerCase().includes(coordSearch.toLowerCase()) || c.prenom.toLowerCase().includes(coordSearch.toLowerCase()) || c.matricule?.toLowerCase().includes(coordSearch.toLowerCase())).map(c => (
                                                            <button key={c.id_enseignant} type="button"
                                                                onClick={() => { offreForm.setData('id_coordinateur', c.id_enseignant); setCoordSearch(`${c.nom} ${c.prenom}`); setShowCoordDropdown(false); }}
                                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${offreForm.data.id_coordinateur === c.id_enseignant ? 'bg-blue-50 dark:bg-gray-700 font-medium' : ''}`}>
                                                                <span className="font-medium">{c.nom} {c.prenom}</span>
                                                                {c.matricule && <span className="text-xs text-gray-400 ml-2">({c.matricule})</span>}
                                                            </button>
                                                        ))}
                                                        {coordinateurs.filter(c => !coordSearch || c.nom.toLowerCase().includes(coordSearch.toLowerCase()) || c.prenom.toLowerCase().includes(coordSearch.toLowerCase()) || c.matricule?.toLowerCase().includes(coordSearch.toLowerCase())).length === 0 && (
                                                            <div className="px-3 py-4 text-sm text-gray-400 text-center">Aucun coordinateur trouvé</div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {offreForm.errors.id_coordinateur && <p className="text-red-500 text-xs mt-1">{offreForm.errors.id_coordinateur}</p>}
                                    </div>

                                    {/* Nom affiché */}
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Nom affiché</label>
                                        <input
                                            type="text"
                                            value={offreForm.data.nom_affiche}
                                            onChange={(e) => offreForm.setData('nom_affiche', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                            placeholder="Nom personnalisé pour l'affichage (optionnel)"
                                        />
                                        {offreForm.errors.nom_affiche && <p className="text-red-500 text-xs mt-1">{offreForm.errors.nom_affiche}</p>}
                                    </div>

                                    {/* Année académique */}
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Année académique</label>
                                        <select
                                            value={offreForm.data.id_annee}
                                            onChange={(e) => offreForm.setData('id_annee', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Sélectionner une année</option>
                                            {anneeUniversitaires.map((a) => (
                                                <option key={a.id_annee} value={a.id_annee}>
                                                    {a.annee_univ} {a.est_active ? '✅' : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {offreForm.errors.id_annee && <p className="text-red-500 text-xs mt-1">{offreForm.errors.id_annee}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                                <button type="button" onClick={closeModal}
                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                    Annuler
                                </button>
                                <button type="submit" disabled={offreForm.processing}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                                    {offreForm.processing ? 'Enregistrement...' : modalType === 'add' ? "Créer l'offre" : 'Sauvegarder'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
