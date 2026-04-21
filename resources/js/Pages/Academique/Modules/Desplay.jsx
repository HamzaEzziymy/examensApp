import React, { useState, useEffect, useMemo } from 'react';
import { useForm, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Pencil, Trash2, Plus, ChevronDown, ChevronUp, Search, Upload, Download, FileDown, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const SortIcon = ({ col, sortKey, sortDir }) => (
    <span className="inline-flex flex-col ml-1 align-middle leading-none">
        <span className={`text-[10px] ${sortKey === col && sortDir === 'asc' ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}>▲</span>
        <span className={`text-[10px] ${sortKey === col && sortDir === 'desc' ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}`}>▼</span>
    </span>
);

export default function ModulesDisplay({ modules: paginatedModules, filters = {}, totalCount = 0 }) {
    const [expandedRows, setExpandedRows] = useState({});
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState(''); // 'add' or 'edit'

    // Export state
    const [showExportModal, setShowExportModal] = useState(false);
    const [dragOverKey, setDragOverKey] = useState(null);
    const [showActionsMenu, setShowActionsMenu] = useState(false);

    const [exportFilename, setExportFilename] = useState('modules');
    const [exportSortField, setExportSortField] = useState('code_module');
    const [exportSortDir, setExportSortDir] = useState('asc');
    const [exportSortField2, setExportSortField2] = useState('nom_module');
    const [exportSortDir2, setExportSortDir2] = useState('asc');
    const [exportColumns, setExportColumns] = useState([
        { key: 'code_module', enabled: true },
        { key: 'nom_module', enabled: true },
        { key: 'type_module', enabled: true },
        { key: 'credits', enabled: true },
        { key: 'element_code', enabled: true },
        { key: 'element_nom', enabled: true },
        { key: 'element_type', enabled: true },
        { key: 'element_coef', enabled: true },
    ]);

    const columnLabels = {
        code_module: 'Code Module',
        nom_module: 'Nom Module',
        type_module: 'Type Module',
        credits: 'Crédits',
        element_code: 'Code Élément',
        element_nom: 'Élément',
        element_type: 'Type Élément',
        element_coef: 'Coefficient',
    };

    const getExportValue = (row, col) => {
        switch (col) {
            case 'code_module': return row.code_module || '';
            case 'nom_module': return row.nom_module || '';
            case 'type_module': return row.type_module || '';
            case 'credits': return row.credits ?? '';
            case 'element_code': return row._element?.code_element || '';
            case 'element_nom': return row._element?.nom_element || '';
            case 'element_type': return row._element?.type_element || '';
            case 'element_coef': return row._element?.coefficient ?? '';
            default: return '';
        }
    };

    const handleExport = () => {
        const activeColumns = exportColumns.filter(c => c.enabled).map(c => c.key);
        const activeModuleCols = activeColumns.filter(k => !k.startsWith('element_'));
        const activeElementCols = activeColumns.filter(k => k.startsWith('element_'));

        const sorted = [...modules].sort((a, b) => {
            const aVal = String(getExportValue(a, exportSortField)).toLowerCase();
            const bVal = String(getExportValue(b, exportSortField)).toLowerCase();
            const cmp1 = exportSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            if (cmp1 !== 0) return cmp1;
            const aVal2 = String(getExportValue(a, exportSortField2)).toLowerCase();
            const bVal2 = String(getExportValue(b, exportSortField2)).toLowerCase();
            return exportSortDir2 === 'asc' ? aVal2.localeCompare(bVal2) : bVal2.localeCompare(aVal2);
        });

        const totalCols = Math.max(activeModuleCols.length, activeElementCols.length + 1, 1);
        const aoa = [];

        // Header
        const headerRow = activeModuleCols.map(col => columnLabels[col]);
        while (headerRow.length < totalCols) headerRow.push('');
        aoa.push(headerRow);

        sorted.forEach(module => {
            const moduleRow = activeModuleCols.map(col => getExportValue(module, col));
            while (moduleRow.length < totalCols) moduleRow.push('');
            aoa.push(moduleRow);

            if (activeElementCols.length > 0 && module.elements?.length > 0) {
                const elHeader = ['  ↳', ...activeElementCols.map(col => columnLabels[col])];
                while (elHeader.length < totalCols) elHeader.push('');
                aoa.push(elHeader);

                module.elements.forEach(el => {
                    const elRow = ['    ', ...activeElementCols.map(col => getExportValue({ ...module, _element: el }, col))];
                    while (elRow.length < totalCols) elRow.push('');
                    aoa.push(elRow);
                });
            }
            aoa.push(Array(totalCols).fill(''));
        });

        const wsData = XLSX.utils.aoa_to_sheet(aoa);
        wsData['!cols'] = Array(totalCols).fill({ wch: 24 });
        wsData['!freeze'] = { xSplit: 0, ySplit: 1 };

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsData, 'Modules');
        XLSX.writeFile(wb, `${exportFilename || 'modules'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
        setShowExportModal(false);
    };
    const [entityType, setEntityType] = useState(''); // 'module' or 'element'
    const [selectedModule, setSelectedModule] = useState(null);
    
    // Search and filter states (now using backend)
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [perPage, setPerPage] = useState(filters.per_page || 25);
    const [sortKey, setSortKey] = useState(filters.sort || 'code_module');
    const [sortDir, setSortDir] = useState(filters.dir || 'asc');

    const handleSort = (key) => {
        const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
        setSortKey(key);
        setSortDir(newDir);
        router.get(route('academique.modules.index'), {
            search: searchTerm,
            type: typeFilter,
            per_page: perPage,
            sort: key,
            dir: newDir,
        }, { preserveState: true, preserveScroll: true });
    };
    
    // Excel import states
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importPreview, setImportPreview] = useState([]);
    const [importErrors, setImportErrors] = useState([]);

    // Extract modules data from paginated response
    const modules = paginatedModules.data || [];
    const currentPage = paginatedModules.current_page || 1;
    const lastPage = paginatedModules.last_page || 1;
    const total = paginatedModules.total || 0;

    // Helper function to check if an element is self-referencing
    const isSelfReferencingElement = (element, module) => {
        return element.code_element === module.code_module && 
               element.nom_element === module.nom_module;
    };

    const elementForm = useForm({
        id_element: null,
        nom_element: '',
        code_element: '',
        type_element: '',
        coefficient: '',
        id_module: ''
    });

    const moduleForm = useForm({
        id_module: null,
        nom_module: '',
        code_module: '',
        type_module: '',
        credits: ''
    });

    // Handle search with backend
    const handleSearch = (value) => {
        setSearchTerm(value);
        router.get(route('academique.modules.index'), {
            search: value, type: typeFilter, per_page: perPage, sort: sortKey, dir: sortDir,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleTypeFilter = (value) => {
        setTypeFilter(value);
        router.get(route('academique.modules.index'), {
            search: searchTerm, type: value, per_page: perPage, sort: sortKey, dir: sortDir,
        }, { preserveState: true, preserveScroll: true });
    };

    const handlePerPageChange = (value) => {
        setPerPage(value);
        router.get(route('academique.modules.index'), {
            search: searchTerm, type: typeFilter, per_page: value, sort: sortKey, dir: sortDir,
        }, { preserveState: true, preserveScroll: true });
    };

    const goToPage = (page) => {
        router.get(route('academique.modules.index'), {
            search: searchTerm, type: typeFilter, per_page: perPage, sort: sortKey, dir: sortDir, page,
        }, { preserveState: true, preserveScroll: true });
    };

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const openAddElementModal = (module) => {
        setSelectedModule(module);
        setModalType('add');
        setEntityType('element');
        elementForm.setData({
            id_element: null,
            nom_element: '',
            code_element: '',
            type_element: '',
            coefficient: '',
            id_module: module.id_module
        });
        setModalOpen(true);
    };

    const openEditElementModal = (element, module) => {
        setSelectedModule(module);
        setModalType('edit');
        setEntityType('element');
        elementForm.setData({
            id_element: element.id_element,
            nom_element: element.nom_element,
            code_element: element.code_element,
            type_element: element.type_element,
            coefficient: element.coefficient,
            id_module: element.id_module
        });
        setModalOpen(true);
    };

    const openAddModuleModal = () => {
        setModalType('add');
        setEntityType('module');
        moduleForm.setData({
            id_module: null,
            nom_module: '',
            code_module: '',
            type_module: '',
            credits: ''
        });
        setModalOpen(true);
    };

    const openEditModuleModal = (module) => {
        setModalType('edit');
        setEntityType('module');
        moduleForm.setData({
            id_module: module.id_module,
            nom_module: module.nom_module,
            code_module: module.code_module,
            type_module: module.type_module,
            credits: module.credits
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setModalType('');
        setEntityType('');
        setSelectedModule(null);
        elementForm.reset();
        moduleForm.reset();
    };

    const handleElementSubmit = (e) => {
        e.preventDefault();
        if (modalType === 'add') {
            elementForm.post(route('academique.elements-module.store'), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Élément ajouté',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            });
        } else {
            elementForm.put(route('academique.elements-module.update', elementForm.data.id_element), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Élément modifié',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            });
        }
    };

    const handleModuleSubmit = (e) => {
        e.preventDefault();
        if (modalType === 'add') {
            moduleForm.post(route('academique.modules.store'), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Module ajouté',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            });
        } else {
            moduleForm.put(route('academique.modules.update', moduleForm.data.id_module), {
                onSuccess: () => {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Module modifié',
                        showConfirmButton: false,
                        timer: 1500
                    });
                },
                onError: () => {
                    Swal.fire('Erreur', 'Une erreur est survenue', 'error');
                }
            });
        }
    };

    const handleElementDelete = (element) => {
        const module = modules.find(m => m.id_module === element.id_module);
        const isSelfReferencing = isSelfReferencingElement(element, module);
        const isLastElement = module.elements && module.elements.length === 1;

        let warningText = "Cette action est irréversible !";
        if (isSelfReferencing && isLastElement) {
            warningText = "Cet élément est auto-généré. Si vous le supprimez, un nouvel élément auto-généré sera créé automatiquement.";
        } else if (isLastElement) {
            warningText = "C'est le dernier élément de ce module. Si vous le supprimez, un élément auto-généré sera créé automatiquement.";
        }

        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: warningText,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        }).then((result) => {
            if (result.isConfirmed) {
                elementForm.delete(route('academique.elements-module.destroy', element.id_element), {
                    onSuccess: () => {
                        Swal.fire('Supprimé !', 'L\'élément a été supprimé.', 'success');
                    }
                });
            }
        });
    };

    const handleModuleDelete = (module) => {
        Swal.fire({
            title: 'Êtes-vous sûr ?',
            text: "Cette action supprimera également tous les éléments associés !",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Oui, supprimer !',
            cancelButtonText: 'Annuler'
        }).then((result) => {
            if (result.isConfirmed) {
                moduleForm.delete(route('academique.modules.destroy', module.id_module), {
                    onSuccess: () => {
                        Swal.fire('Supprimé !', 'Le module a été supprimé.', 'success');
                    }
                });
            }
        });
    };

    const getTypeElementColor = (type) => {
        const colors = {
            'PRE_CLINIQUE': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
            'TP': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
            'COURS': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
            'TD': 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
            'STAGE_ELEMENT': 'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200',
            'AUTRE': 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        };
        return colors[type] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    };

    const getTypeElementLabel = (type) => {
        const labels = {
            'PRE_CLINIQUE': 'Pré-clinique',
            'TP': 'Travaux Pratiques',
            'COURS': 'Cours',
            'TD': 'Travaux Dirigés',
            'STAGE_ELEMENT': 'Stage',
            'AUTRE': 'Autre'
        };
        return labels[type] || type;
    };

    // Excel import functions
    const downloadTemplate = () => {
        const templateData = [
            {
                'Code Module': 'M001',
                'Nom Module': 'Exemple Module',
                'Type Module': 'CONNAISSANCE',
                'Crédits': '6'
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Modules');
        XLSX.writeFile(wb, 'template_modules.xlsx');
    };

    const openImportModal = () => {
        setImportModalOpen(true);
        setImportFile(null);
    };

    const closeImportModal = () => {
        setImportModalOpen(false);
        setImportFile(null);
        setIsImporting(false);
        setImportPreview([]);
        setImportErrors([]);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportFile(file);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                const preview = [];
                const errors = [];

                jsonData.forEach((row, index) => {
                    const rowNumber = index + 2; // Excel row number (starting from 2)
                    
                    // Expected columns: Code Module, Nom Module, Type Module, Crédits
                    const codeModule = row['Code Module'] || row['code_module'] || '';
                    const nomModule = row['Nom Module'] || row['nom_module'] || '';
                    const typeModule = row['Type Module'] || row['type_module'] || '';
                    const credits = row['Crédits'] || row['credits'] || '';

                    // Validate required fields
                    if (!codeModule) {
                        errors.push(`Ligne ${rowNumber}: Code Module manquant`);
                    }
                    if (!nomModule) {
                        errors.push(`Ligne ${rowNumber}: Nom Module manquant`);
                    }
                    if (!typeModule) {
                        errors.push(`Ligne ${rowNumber}: Type Module manquant`);
                    } else if (!['CONNAISSANCE', 'HORIZONTAL', 'STAGE', 'THESE'].includes(typeModule)) {
                        errors.push(`Ligne ${rowNumber}: Type Module invalide (doit être: CONNAISSANCE, HORIZONTAL, STAGE, THESE)`);
                    }
                    if (!credits) {
                        errors.push(`Ligne ${rowNumber}: Crédits manquant`);
                    } else if (isNaN(parseFloat(credits)) || parseFloat(credits) < 0) {
                        errors.push(`Ligne ${rowNumber}: Crédits invalide (doit être un nombre positif)`);
                    }

                    // Check for duplicate code_module in existing modules
                    const existingModule = modules.find(m => m.code_module === codeModule);
                    if (existingModule) {
                        errors.push(`Ligne ${rowNumber}: Code Module "${codeModule}" existe déjà`);
                    }

                    // Check for duplicate in current preview
                    const duplicateInPreview = preview.find(p => p.codeModule === codeModule);
                    if (duplicateInPreview) {
                        errors.push(`Ligne ${rowNumber}: Code Module "${codeModule}" dupliqué dans le fichier`);
                    }

                    preview.push({
                        rowNumber,
                        codeModule,
                        nomModule,
                        typeModule,
                        credits: parseFloat(credits) || 0,
                        hasErrors: !codeModule || !nomModule || !typeModule || !credits || 
                                  !['CONNAISSANCE', 'HORIZONTAL', 'STAGE', 'THESE'].includes(typeModule) ||
                                  isNaN(parseFloat(credits)) || parseFloat(credits) < 0 ||
                                  existingModule || duplicateInPreview
                    });
                });

                setImportPreview(preview);
                setImportErrors(errors);

            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erreur',
                    text: 'Erreur lors de la lecture du fichier Excel'
                });
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const handleImport = () => {
        if (importErrors.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Erreurs détectées',
                text: 'Veuillez corriger les erreurs avant d\'importer'
            });
            return;
        }

        const modulesToImport = importPreview
            .filter(item => !item.hasErrors)
            .map(item => ({
                code_module: item.codeModule,
                nom_module: item.nomModule,
                type_module: item.typeModule,
                credits: item.credits
            }));

        if (modulesToImport.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Aucun module valide',
                text: 'Aucun module valide trouvé pour l\'import'
            });
            return;
        }

        setIsImporting(true);

        // Send to backend using router
        router.post(route('academique.modules.store'), { modules: modulesToImport }, {
            onSuccess: () => {
                closeImportModal();
                Swal.fire({
                    icon: 'success',
                    title: 'Import réussi',
                    text: `${modulesToImport.length} modules importés avec succès`,
                    showConfirmButton: false,
                    timer: 2000
                });
            },
            onError: (errors) => {
                console.error('Import errors:', errors);
                Swal.fire('Erreur', 'Erreur lors de l\'import', 'error');
            },
            onFinish: () => {
                setIsImporting(false);
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="mx-auto">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Modules et Éléments</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowExportModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                                <FileDown className="w-4 h-4" />
                                Exporter
                            </button>
                            <div className="relative">
                                <button onClick={() => setShowActionsMenu(prev => !prev)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                                    <Plus className="w-4 h-4" />
                                    Actions
                                    <span className="text-xs opacity-70">▾</span>
                                </button>
                                {showActionsMenu && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowActionsMenu(false)} />
                                        <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                                            <button onClick={() => { setShowActionsMenu(false); downloadTemplate(); }}
                                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <Download className="w-4 h-4 text-green-600" />
                                                Télécharger Template
                                            </button>
                                            <div className="border-t border-gray-100 dark:border-gray-700" />
                                            <button onClick={() => { setShowActionsMenu(false); openImportModal(); }}
                                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <Upload className="w-4 h-4 text-purple-600" />
                                                Importer Excel
                                            </button>
                                            <div className="border-t border-gray-100 dark:border-gray-700" />
                                            <button onClick={() => { setShowActionsMenu(false); openAddModuleModal(); }}
                                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <Plus className="w-4 h-4 text-blue-600" />
                                                Ajouter Module
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Search & Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                            <input type="text" placeholder="Rechercher par nom ou code module..."
                                value={searchTerm} onChange={e => handleSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 dark:text-gray-400">Type:</label>
                            <select value={typeFilter} onChange={e => handleTypeFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                                <option value="">Tous</option>
                                <option value="CONNAISSANCE">CONNAISSANCE</option>
                                <option value="HORIZONTAL">HORIZONTAL</option>
                                <option value="STAGE">STAGE</option>
                                <option value="THESE">THESE</option>
                            </select>
                            <select value={perPage} onChange={e => handlePerPageChange(Number(e.target.value))}
                                className="px-5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                                <option value="15">15</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value={total}>Tout ({total})</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Modules</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{total}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Page</div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{currentPage}/{lastPage}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Filtre actif</div>
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{typeFilter || 'Tous'}</div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                <tr>
                                    <th className="px-4 py-2 text-left w-10"></th>
                                    {[
                                        { key: 'code_module', label: 'Code Module' },
                                        { key: 'nom_module', label: 'Nom du Module' },
                                        { key: 'type_module', label: 'Type' },
                                        { key: 'credits', label: 'Crédits' },
                                    ].map(({ key, label }) => (
                                        <th key={key} onClick={() => handleSort(key)}
                                            className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                            {label}<SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                                        </th>
                                    ))}
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Éléments</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {modules.map((module) => (
                                    <React.Fragment key={module.id_module}>
                                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-4 py-2">
                                                <button onClick={() => toggleRow(module.id_module)}
                                                    className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                                    {expandedRows[module.id_module] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-2 text-sm font-mono font-medium text-gray-900 dark:text-white">{module.code_module}</td>
                                            <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{module.nom_module}</td>
                                            <td className="px-4 py-2">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                    {module.type_module}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                                    {module.credits} crédits
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                                                    {module.elements?.length || 0} élément(s)
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openAddElementModal(module)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors">
                                                        <Plus size={14} />
                                                        Élément
                                                    </button>
                                                    <button onClick={() => openEditModuleModal(module)}
                                                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button onClick={() => handleModuleDelete(module)}
                                                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {expandedRows[module.id_module] && (
                                            <tr className="bg-gray-50 dark:bg-gray-900/50">
                                                <td colSpan="7" className="px-4 py-2">
                                                    <div className="ml-6 border-l-2 border-blue-200 dark:border-blue-800 pl-4">
                                                        <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3 uppercase tracking-wide">
                                                            Éléments du module
                                                        </h3>
                                                        {module.elements && module.elements.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {module.elements.map((element) => (
                                                                    <div key={element.id_element}
                                                                        className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700 shadow-sm">
                                                                        <div className="flex items-center gap-4">
                                                                            <div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{element.nom_element}</span>
                                                                                    {isSelfReferencingElement(element, module) && (
                                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">Auto-généré</span>
                                                                                    )}
                                                                                </div>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{element.code_element}</span>
                                                                            </div>
                                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeElementColor(element.type_element)}`}>
                                                                                {getTypeElementLabel(element.type_element)}
                                                                            </span>
                                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                                                                                Coef: {element.coefficient}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <button onClick={() => openEditElementModal(element, module)}
                                                                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                                                                <Pencil size={15} />
                                                                            </button>
                                                                            <button onClick={() => handleElementDelete(element)}
                                                                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                                                <Trash2 size={15} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-400 dark:text-gray-500 italic">Aucun élément disponible pour ce module</p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Page {currentPage} sur {lastPage} — {total} module(s)
                            </div>
                            {lastPage > 1 && (
                                <div className="flex items-center gap-2">
                                    <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}
                                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                        Précédent
                                    </button>
                                    <div className="flex gap-1">
                                        {Array.from({ length: Math.min(lastPage, 10) }, (_, i) => {
                                            let page;
                                            if (lastPage <= 10) page = i + 1;
                                            else if (currentPage <= 5) page = i + 1;
                                            else if (currentPage >= lastPage - 4) page = lastPage - 9 + i;
                                            else page = currentPage - 5 + i;
                                            return (
                                                <button key={page} onClick={() => goToPage(page)}
                                                    className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                                                        currentPage === page
                                                            ? 'bg-blue-600 text-white'
                                                            : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                    {page}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === lastPage}
                                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                        Suivant
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {modules.length === 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
                        <p className="text-gray-500 dark:text-gray-400">Aucun module trouvé</p>
                        {searchTerm && <p className="text-sm text-gray-400 mt-2">Essayez de modifier vos termes de recherche</p>}
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
                                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Exporter les Modules</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Personnalisez votre export Excel</p>
                                </div>
                            </div>
                            <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-5">
                            {/* Columns */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Colonnes <span className="normal-case font-normal text-gray-400">(glisser pour réordonner)</span></label>
                                    <div className="flex gap-2">
                                        <button onClick={() => setExportColumns(prev => prev.map(c => ({ ...c, enabled: true })))} className="text-xs text-emerald-600 hover:underline">Tout</button>
                                        <span className="text-gray-300">|</span>
                                        <button onClick={() => setExportColumns(prev => prev.map(c => ({ ...c, enabled: false })))} className="text-xs text-red-500 hover:underline">Aucun</button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    {exportColumns.map((col, index) => (
                                        <div key={col.key} draggable
                                            onDragStart={e => e.dataTransfer.setData('text/plain', index)}
                                            onDragOver={e => { e.preventDefault(); setDragOverKey(col.key); }}
                                            onDragLeave={() => setDragOverKey(null)}
                                            onDrop={e => {
                                                e.preventDefault();
                                                const from = parseInt(e.dataTransfer.getData('text/plain'));
                                                if (from === index) return;
                                                setExportColumns(prev => {
                                                    const next = [...prev];
                                                    const [moved] = next.splice(from, 1);
                                                    next.splice(index, 0, moved);
                                                    return next;
                                                });
                                                setDragOverKey(null);
                                            }}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing transition-all select-none ${
                                                col.enabled ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
                                            } ${dragOverKey === col.key ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                        >
                                            <span className="text-gray-300 dark:text-gray-500 text-sm">⠿</span>
                                            <input type="checkbox" checked={col.enabled}
                                                onChange={e => setExportColumns(prev => prev.map(c => c.key === col.key ? { ...c, enabled: e.target.checked } : c))}
                                                className="w-3.5 h-3.5 rounded text-emerald-600 border-gray-300 focus:ring-emerald-500"
                                                onClick={e => e.stopPropagation()}
                                            />
                                            <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">{columnLabels[col.key]}</span>
                                            <span className="text-xs text-gray-300 dark:text-gray-600">#{index + 1}</span>
                                        </div>
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
                                                {Object.entries(columnLabels).map(([key, label]) => (
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
                                        placeholder="modules" />
                                    <span className="text-xs text-gray-400 whitespace-nowrap">_{new Date().toISOString().slice(0,10)}.xlsx</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {exportColumns.filter(c => c.enabled).length} col · {modules.length} module(s)
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => setShowExportModal(false)}
                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                    Annuler
                                </button>
                                <button onClick={handleExport} disabled={exportColumns.every(c => !c.enabled)}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors">
                                    <FileDown className="w-4 h-4" />
                                    Exporter
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {importModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Importer des Modules</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Sélectionner un fichier Excel (.xlsx)
                                    </label>
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleFileChange}
                                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </div>
                                
                                {importFile && (
                                    <div className="text-sm text-green-600 dark:text-green-400">
                                        Fichier sélectionné: {importFile.name}
                                    </div>
                                )}
                                
                                {importPreview.length === 0 && (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        <p>Format attendu:</p>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            <li>Code Module (obligatoire)</li>
                                            <li>Nom Module (obligatoire)</li>
                                            <li>Type Module (CONNAISSANCE, HORIZONTAL, STAGE, THESE)</li>
                                            <li>Crédits (nombre positif)</li>
                                        </ul>
                                    </div>
                                )}

                                {/* Errors Display */}
                                {importErrors.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                        <h3 className="text-red-800 dark:text-red-200 font-medium mb-2">
                                            Erreurs détectées ({importErrors.length})
                                        </h3>
                                        <div className="max-h-32 overflow-y-auto">
                                            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                                                {importErrors.slice(0, 10).map((error, index) => (
                                                    <li key={index}>• {error}</li>
                                                ))}
                                                {importErrors.length > 10 && (
                                                    <li className="font-medium">... et {importErrors.length - 10} autres erreurs</li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                {/* Preview */}
                                {importPreview.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                            Aperçu des données ({importPreview.length} lignes)
                                        </h3>
                                        <div className="overflow-x-auto max-h-64 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ligne</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Code Module</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nom Module</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Crédits</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Statut</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                    {importPreview.slice(0, 20).map((item, index) => (
                                                        <tr key={index} className={`${item.hasErrors ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-800'}`}>
                                                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.rowNumber}</td>
                                                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100 font-mono">{item.codeModule}</td>
                                                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.nomModule}</td>
                                                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.typeModule}</td>
                                                            <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{item.credits}</td>
                                                            <td className="px-3 py-2">
                                                                {item.hasErrors ? (
                                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                                                        Erreur
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                                        Valide
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {importPreview.length > 20 && (
                                                <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
                                                    ... et {importPreview.length - 20} autres lignes
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Summary */}
                                {importPreview.length > 0 && (
                                    <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                {importPreview.length}
                                            </div>
                                            <div className="text-sm text-blue-800 dark:text-blue-200">Total lignes</div>
                                        </div>
                                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {importPreview.filter(item => !item.hasErrors).length}
                                            </div>
                                            <div className="text-sm text-green-800 dark:text-green-200">Valides</div>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                {importPreview.filter(item => item.hasErrors).length}
                                            </div>
                                            <div className="text-sm text-red-800 dark:text-red-200">Erreurs</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={closeImportModal}
                                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                                    disabled={isImporting}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={handleImport}
                                    disabled={importPreview.length === 0 || importErrors.length > 0 || importPreview.filter(item => !item.hasErrors).length === 0 || isImporting}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
                                >
                                    {isImporting ? 'Import en cours...' : `Importer ${importPreview.filter(item => !item.hasErrors).length > 0 ? `(${importPreview.filter(item => !item.hasErrors).length})` : ''}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">
                            {modalType === 'add' 
                                ? entityType === 'module' ? 'Ajouter un Module' : 'Ajouter un Élément'
                                : entityType === 'module' ? 'Modifier le Module' : 'Modifier l\'Élément'
                            }
                        </h2>
                        <form onSubmit={entityType === 'module' ? handleModuleSubmit : handleElementSubmit} className="space-y-4">
                            {entityType === 'module' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nom du Module</label>
                                        <input
                                            type="text"
                                            value={moduleForm.data.nom_module}
                                            onChange={(e) => moduleForm.setData('nom_module', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        />
                                        {moduleForm.errors.nom_module && (
                                            <div className="text-red-500 text-sm mt-1">{moduleForm.errors.nom_module}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Code du Module</label>
                                        <input
                                            type="text"
                                            value={moduleForm.data.code_module}
                                            onChange={(e) => moduleForm.setData('code_module', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 font-mono"
                                            required
                                        />
                                        {moduleForm.errors.code_module && (
                                            <div className="text-red-500 text-sm mt-1">{moduleForm.errors.code_module}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Type de Module</label>
                                        <select
                                            value={moduleForm.data.type_module}
                                            onChange={(e) => moduleForm.setData('type_module', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        >
                                            <option value="CONNAISSANCE">CONNAISSANCE</option>
                                            <option value="HORIZONTAL">HORIZONTAL</option>
                                            <option value="STAGE">STAGE</option>
                                            <option value="THESE">THESE</option>
                                        </select>
                                        {moduleForm.errors.type_module && (
                                            <div className="text-red-500 text-sm mt-1">{moduleForm.errors.type_module}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Crédits</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={moduleForm.data.credits}
                                            onChange={(e) => moduleForm.setData('credits', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                            min="0"
                                        />
                                        {moduleForm.errors.credits && (
                                            <div className="text-red-500 text-sm mt-1">{moduleForm.errors.credits}</div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nom de l'Élément</label>
                                        <input
                                            type="text"
                                            value={elementForm.data.nom_element}
                                            onChange={(e) => elementForm.setData('nom_element', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        />
                                        {elementForm.errors.nom_element && (
                                            <div className="text-red-500 text-sm mt-1">{elementForm.errors.nom_element}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Code de l'Élément</label>
                                        <input
                                            type="text"
                                            value={elementForm.data.code_element}
                                            onChange={(e) => elementForm.setData('code_element', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 font-mono"
                                            required
                                        />
                                        {elementForm.errors.code_element && (
                                            <div className="text-red-500 text-sm mt-1">{elementForm.errors.code_element}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Type d'Élément</label>
                                        <select
                                            value={elementForm.data.type_element}
                                            onChange={(e) => elementForm.setData('type_element', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                        >
                                            <option value="">--Sélectionner un type--</option>
                                            <option value="PRE_CLINIQUE">Pré-clinique</option>
                                            <option value="TP">Travaux Pratiques</option>
                                            <option value="COURS">Cours</option>
                                            <option value="TD">Travaux Dirigés</option>
                                            <option value="STAGE_ELEMENT">Stage</option>
                                            <option value="AUTRE">Autre</option>
                                        </select>
                                        {elementForm.errors.type_element && (
                                            <div className="text-red-500 text-sm mt-1">{elementForm.errors.type_element}</div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Coefficient</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={elementForm.data.coefficient}
                                            onChange={(e) => elementForm.setData('coefficient', e.target.value)}
                                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                                            required
                                            min="0"
                                            max="99.99"
                                        />
                                        {elementForm.errors.coefficient && (
                                            <div className="text-red-500 text-sm mt-1">{elementForm.errors.coefficient}</div>
                                        )}
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Maximum: 99.99
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Module</label>
                                        <input
                                            type="text"
                                            value={selectedModule?.nom_module || ''}
                                            disabled
                                            className="w-full px-3 py-2 border rounded dark:border-gray-600 bg-gray-100 dark:bg-gray-600"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={entityType === 'module' ? moduleForm.processing : elementForm.processing}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
                                >
                                    {entityType === 'module' 
                                        ? (moduleForm.processing ? 'Enregistrement...' : modalType === 'add' ? 'Ajouter' : 'Sauvegarder')
                                        : (elementForm.processing ? 'Enregistrement...' : modalType === 'add' ? 'Ajouter' : 'Sauvegarder')
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    </div>
    );
}