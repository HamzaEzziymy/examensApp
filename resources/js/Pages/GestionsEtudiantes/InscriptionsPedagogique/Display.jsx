// import React, { useState, useMemo, useEffect } from 'react';
// import { router } from '@inertiajs/react';
// import { Search, Plus, Upload, Download, Trash2, X, FileSpreadsheet, Users, ChevronLeft, ChevronRight, Eye, BookOpen, CreditCard, Calendar, Filter, Check, AlertCircle } from 'lucide-react';
// import * as XLSX from 'xlsx';

// const PedagogicalInscriptionDataTable = ({ 
//   inscriptions: initialInscriptions = [],
//   etudiants = [],
//   modules = [],
//   offreFormations = [],
//   inscriptionsAdmin = [],
//   filters: initialFilters = {}
// }) => {

//   const [inscriptions, setInscriptions] = useState(initialInscriptions);
//   const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showImportModal, setShowImportModal] = useState(false);
//   const [showAssignModal, setShowAssignModal] = useState(false);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(25);
//   const [selectedInscriptions, setSelectedInscriptions] = useState([]);
//   const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
//   const [selectedModuleFilter, setSelectedModuleFilter] = useState('all');

//   // Form state for adding inscription
//   const [formData, setFormData] = useState({
//     id_etudiant: '',
//     id_module: '',
//     id_offre: '',
//     id_inscription_admin: '',
//     type_inscription: 'Normal',
//     credits_acquis: 0
//   });

//   // Form for bulk assignment
//   const [bulkFormData, setBulkFormData] = useState({
//     type_inscription: 'Normal',
//     credits_acquis: 0,
//     id_module: '',
//     id_offre: '',
//     id_inscription_admin: ''
//   });

//   // Import state
//   const [importFile, setImportFile] = useState(null);
//   const [importPreview, setImportPreview] = useState([]);
//   const [importErrors, setImportErrors] = useState([]);

//   // Filter inscriptions
//   const filteredInscriptions = useMemo(() => {
//     return inscriptions.filter(inscription => {
//       // Search term filter
//       const matchesSearch = !searchTerm || 
//         inscription.etudiant?.cne?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         inscription.etudiant?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         inscription.etudiant?.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         inscription.module?.nom_module?.toLowerCase().includes(searchTerm.toLowerCase());

//       // Type filter
//       const matchesType = selectedTypeFilter === 'all' || 
//         inscription.type_inscription === selectedTypeFilter;

//       // Module filter
//       const matchesModule = selectedModuleFilter === 'all' || 
//         inscription.id_module?.toString() === selectedModuleFilter;

//       return matchesSearch && matchesType && matchesModule;
//     });
//   }, [inscriptions, searchTerm, selectedTypeFilter, selectedModuleFilter]);

//   // Pagination
//   const totalPages = Math.ceil(filteredInscriptions.length / itemsPerPage);
//   const paginatedInscriptions = useMemo(() => {
//     const start = (currentPage - 1) * itemsPerPage;
//     return filteredInscriptions.slice(start, start + itemsPerPage);
//   }, [filteredInscriptions, currentPage, itemsPerPage]);

//   // Handle form input
//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleBulkInputChange = (e) => {
//     const { name, value } = e.target;
//     setBulkFormData(prev => ({ ...prev, [name]: value }));
//   };

//   // Submit single inscription
//   const handleSubmit = () => {
//     router.post('/inscriptions-pedagogiques', formData, {
//       onSuccess: () => {
//         setShowAddModal(false);
//         setFormData({
//           id_etudiant: '',
//           id_module: '',
//           id_offre: '',
//           id_inscription_admin: '',
//           type_inscription: 'Normal',
//           credits_acquis: 0
//         });
//       }
//     });
//   };

//   // Bulk assign to selected students
//   const handleBulkAssign = () => {
//     if (selectedInscriptions.length === 0) {
//       alert('Veuillez sélectionner au moins une inscription');
//       return;
//     }

//     const data = {
//       inscriptions: selectedInscriptions,
//       ...bulkFormData
//     };

//     router.post('/inscriptions-pedagogiques/bulk-assign', data, {
//       onSuccess: () => {
//         setShowAssignModal(false);
//         setSelectedInscriptions([]);
//         setBulkFormData({
//           type_inscription: 'Normal',
//           credits_acquis: 0,
//           id_module: '',
//           id_offre: '',
//           id_inscription_admin: ''
//         });
//       }
//     });
//   };

//   // Handle Excel file selection
//   const handleFileSelect = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     setImportFile(file);
//     const reader = new FileReader();

//     reader.onload = (event) => {
//       try {
//         const workbook = XLSX.read(event.target.result, { type: 'binary' });
//         const sheetName = workbook.SheetNames[0];
//         const sheet = workbook.Sheets[sheetName];
//         const data = XLSX.utils.sheet_to_json(sheet);

//         // Validate and format data
//         const errors = [];
//         const preview = data.map((row, index) => {
//           const rowErrors = [];
          
//           if (!row.id_etudiant && !row.cne) rowErrors.push('ID étudiant ou CNE requis');
//           if (!row.id_module && !row.code_module) rowErrors.push('ID module ou code module requis');
//           if (!row.type_inscription) rowErrors.push('Type d\'inscription requis');
          
//           if (rowErrors.length > 0) {
//             errors.push({ row: index + 2, errors: rowErrors });
//           }

//           // Try to find student by CNE if ID not provided
//           let studentId = row.id_etudiant;
//           if (!studentId && row.cne) {
//             const etudiant = etudiants.find(e => e.cne === row.cne);
//             studentId = etudiant?.id_etudiant;
//             if (!studentId) rowErrors.push('CNE étudiant non trouvé');
//           }

//           // Try to find module by code if ID not provided
//           let moduleId = row.id_module;
//           if (!moduleId && row.code_module) {
//             const module = modules.find(m => m.code_module === row.code_module);
//             moduleId = module?.id_module;
//             if (!moduleId) rowErrors.push('Code module non trouvé');
//           }

//           return {
//             id_etudiant: studentId || '',
//             id_module: moduleId || '',
//             id_offre: row.id_offre || '',
//             id_inscription_admin: row.id_inscription_admin || '',
//             type_inscription: row.type_inscription || 'Normal',
//             credits_acquis: row.credits_acquis || 0
//           };
//         });

//         setImportPreview(preview);
//         setImportErrors(errors);
//       } catch (error) {
//         alert('Erreur lors de la lecture du fichier Excel');
//       }
//     };

//     reader.readAsBinaryString(file);
//   };

//   // Submit bulk import
//   const handleBulkImport = () => {
//     if (importErrors.length > 0) {
//       alert('Veuillez corriger les erreurs avant d\'importer');
//       return;
//     }

//     router.post('/inscriptions-pedagogiques/bulk', { inscriptions: importPreview }, {
//       onSuccess: () => {
//         setShowImportModal(false);
//         setImportFile(null);
//         setImportPreview([]);
//         setImportErrors([]);
//       }
//     });
//   };

//   // Download Excel template
//   const downloadTemplate = () => {
//     const template = [
//       {
//         id_etudiant: '1',
//         cne: 'R123456789',
//         id_module: '101',
//         code_module: 'MATH101',
//         type_inscription: 'Normal',
//         credits_acquis: 6,
//         id_offre: '1',
//         id_inscription_admin: '1'
//       },
//       {
//         id_etudiant: '',
//         cne: 'R987654321',
//         id_module: '',
//         code_module: 'PHY101',
//         type_inscription: 'Credit',
//         credits_acquis: 3,
//         id_offre: '1',
//         id_inscription_admin: '2'
//       }
//     ];

//     const ws = XLSX.utils.json_to_sheet(template);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, 'Inscriptions');
//     XLSX.writeFile(wb, 'template_inscriptions_pedagogiques.xlsx');
//   };

//   // Select/deselect inscriptions
//   const toggleSelectInscription = (id) => {
//     setSelectedInscriptions(prev => 
//       prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
//     );
//   };

//   const toggleSelectAll = () => {
//     if (selectedInscriptions.length === paginatedInscriptions.length) {
//       setSelectedInscriptions([]);
//     } else {
//       setSelectedInscriptions(paginatedInscriptions.map(i => i.id_inscription_pedagogique));
//     }
//   };

//   // Stats calculations
//   const stats = useMemo(() => {
//     const total = inscriptions.length;
//     const normal = inscriptions.filter(i => i.type_inscription === 'Normal').length;
//     const credit = inscriptions.filter(i => i.type_inscription === 'Credit').length;
//     const anticipe = inscriptions.filter(i => i.type_inscription === 'Anticipe').length;
//     const totalCredits = inscriptions.reduce((sum, i) => sum + (i.credits_acquis || 0), 0);
    
//     return { total, normal, credit, anticipe, totalCredits };
//   }, [inscriptions]);

//   return (
//     <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
//       <div className="p-4">
//         {/* Header */}
//         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 mb-6 transition-colors">
//           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
//             <div className="flex items-center gap-3">
//               <BookOpen className="w-8 h-8 text-purple-600 dark:text-purple-400" />
//               <div>
//                 <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inscriptions Pédagogiques</h1>
//                 <p className="text-sm text-gray-600 dark:text-gray-400">Gestion des inscriptions aux modules</p>
//               </div>
//             </div>
//             <div className="flex items-center gap-3 flex-wrap">
//               <button
//                 onClick={downloadTemplate}
//                 className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
//               >
//                 <Download className="w-4 h-4" />
//                 <span className="hidden sm:inline">Template</span>
//               </button>
//               <button
//                 onClick={() => setShowImportModal(true)}
//                 className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
//               >
//                 <Upload className="w-4 h-4" />
//                 <span className="hidden sm:inline">Importer</span>
//               </button>
//               {selectedInscriptions.length > 0 && (
//                 <button
//                   onClick={() => setShowAssignModal(true)}
//                   className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg transition-colors"
//                 >
//                   <Check className="w-4 h-4" />
//                   <span className="hidden sm:inline">Affecter ({selectedInscriptions.length})</span>
//                 </button>
//               )}
//               <button
//                 onClick={() => setShowAddModal(true)}
//                 className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg transition-colors"
//               >
//                 <Plus className="w-4 h-4" />
//                 <span className="hidden sm:inline">Ajouter</span>
//               </button>
//             </div>
//           </div>

//           {/* Search and Filters */}
//           <div className="flex flex-col lg:flex-row gap-4">
//             <div className="flex-1 relative">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
//               <input
//                 type="text"
//                 placeholder="Rechercher par CNE, étudiant, module..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent"
//               />
//             </div>
            
//             <div className="flex flex-wrap gap-3">
//               <div className="relative">
//                 <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
//                 <select
//                   value={selectedTypeFilter}
//                   onChange={(e) => setSelectedTypeFilter(e.target.value)}
//                   className="pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
//                 >
//                   <option value="all">Tous les types</option>
//                   <option value="Normal">Normal</option>
//                   <option value="Credit">Crédit</option>
//                   <option value="Anticipe">Anticipé</option>
//                 </select>
//               </div>
              
//               <select
//                 value={selectedModuleFilter}
//                 onChange={(e) => setSelectedModuleFilter(e.target.value)}
//                 className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
//               >
//                 <option value="all">Tous les modules</option>
//                 {modules.map(module => (
//                   <option key={module.id_module} value={module.id_module}>
//                     {module.code_module} - {module.nom_module}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Stats */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
//           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
//             <div className="flex items-center justify-between">
//               <div>
//                 <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Inscriptions</div>
//                 <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
//               </div>
//               <BookOpen className="w-10 h-10 text-purple-500 dark:text-purple-400 opacity-50" />
//             </div>
//           </div>
//           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
//             <div className="flex items-center justify-between">
//               <div>
//                 <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Type Normal</div>
//                 <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.normal}</div>
//               </div>
//               <Users className="w-10 h-10 text-blue-500 dark:text-blue-400 opacity-50" />
//             </div>
//           </div>
//           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
//             <div className="flex items-center justify-between">
//               <div>
//                 <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Type Crédit</div>
//                 <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.credit}</div>
//               </div>
//               <CreditCard className="w-10 h-10 text-green-500 dark:text-green-400 opacity-50" />
//             </div>
//           </div>
//           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
//             <div className="flex items-center justify-between">
//               <div>
//                 <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Type Anticipé</div>
//                 <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.anticipe}</div>
//               </div>
//               <Calendar className="w-10 h-10 text-yellow-500 dark:text-yellow-400 opacity-50" />
//             </div>
//           </div>
//           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
//             <div className="flex items-center justify-between">
//               <div>
//                 <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Crédits Totaux</div>
//                 <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalCredits}</div>
//               </div>
//               <FileSpreadsheet className="w-10 h-10 text-red-500 dark:text-red-400 opacity-50" />
//             </div>
//           </div>
//         </div>

//         {/* Table */}
//         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors">
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
//                 <tr>
//                   <th className="px-6 py-3 text-left w-12">
//                     <input
//                       type="checkbox"
//                       checked={paginatedInscriptions.length > 0 && selectedInscriptions.length === paginatedInscriptions.length}
//                       onChange={toggleSelectAll}
//                       className="rounded border-gray-300 dark:border-gray-600 text-purple-600 dark:text-purple-400 focus:ring-purple-500 dark:focus:ring-purple-400"
//                     />
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Étudiant</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Module</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Crédits</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Offre</th>
//                   <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
//                 {paginatedInscriptions.map((inscription) => {
//                   const typeColors = {
//                     'Normal': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
//                     'Credit': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
//                     'Anticipe': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
//                   };

//                   return (
//                     <tr key={inscription.id_inscription_pedagogique} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
//                       <td className="px-6 py-4">
//                         <input
//                           type="checkbox"
//                           checked={selectedInscriptions.includes(inscription.id_inscription_pedagogique)}
//                           onChange={() => toggleSelectInscription(inscription.id_inscription_pedagogique)}
//                           className="rounded border-gray-300 dark:border-gray-600 text-purple-600 dark:text-purple-400 focus:ring-purple-500 dark:focus:ring-purple-400"
//                         />
//                       </td>
//                       <td className="px-6 py-4">
//                         <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                           {inscription.etudiant?.nom} {inscription.etudiant?.prenom}
//                         </div>
//                         <div className="text-xs text-gray-600 dark:text-gray-400">
//                           {inscription.etudiant?.cne}
//                         </div>
//                       </td>
//                       <td className="px-6 py-4">
//                         <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                           {inscription.module?.nom_module}
//                         </div>
//                         <div className="text-xs text-gray-600 dark:text-gray-400">
//                           {inscription.module?.code_module}
//                         </div>
//                       </td>
//                       <td className="px-6 py-4">
//                         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColors[inscription.type_inscription] || ''}`}>
//                           {inscription.type_inscription}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4">
//                         <div className="flex items-center gap-2">
//                           <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
//                             {inscription.credits_acquis}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
//                         {inscription.offre_formation?.nom_offre || '-'}
//                       </td>
//                       <td className="px-6 py-4 text-right text-sm font-medium">
//                         <div className="flex justify-end gap-2">
//                           <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1">
//                             <Eye className="w-4 h-4" />
//                           </button>
//                           <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1">
//                             <Trash2 className="w-4 h-4" />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>

//           {/* Pagination - Same as previous component */}
//           <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
//             <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
//               <div className="text-sm text-gray-600 dark:text-gray-400">
//                 {itemsPerPage >= filteredInscriptions.length ? (
//                   `Affichage de tous les ${filteredInscriptions.length} résultats`
//                 ) : (
//                   `Affichage ${((currentPage - 1) * itemsPerPage) + 1} à ${Math.min(currentPage * itemsPerPage, filteredInscriptions.length)} sur ${filteredInscriptions.length} résultats`
//                 )}
//               </div>
//               <div className="flex items-center gap-3">
//                 <span className="text-sm text-gray-600 dark:text-gray-400">Afficher:</span>
//                 <div className="flex gap-2">
//                   <select
//                     className="px-8 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
//                     value={itemsPerPage}
//                     onChange={(e) => {
//                       setItemsPerPage(parseInt(e.target.value));
//                       setCurrentPage(1);
//                     }}
//                   >
//                     <option value={10}>10</option>
//                     <option value={25}>25</option>
//                     <option value={50}>50</option>
//                     <option value={100}>100</option>
//                   </select>
//                   <button
//                     onClick={() => {
//                       setItemsPerPage(filteredInscriptions.length);
//                       setCurrentPage(1);
//                     }}
//                     className={`px-3 py-1 border rounded-lg text-sm transition ${
//                       itemsPerPage >= filteredInscriptions.length
//                         ? 'bg-purple-600 dark:bg-purple-500 text-white border-purple-600 dark:border-purple-500'
//                         : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
//                     }`}
//                   >
//                     Tout
//                   </button>
//                 </div>
//               </div>
//             </div>

//             {itemsPerPage < filteredInscriptions.length && (
//               <div className="flex items-center justify-center gap-2">
//                 <button
//                   onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
//                   disabled={currentPage === 1}
//                   className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <ChevronLeft className="w-4 h-4" />
//                 </button>
//                 <span className="text-sm text-gray-600 dark:text-gray-400 min-w-fit">
//                   Page {currentPage} sur {totalPages}
//                 </span>
//                 {[...Array(Math.min(5, totalPages))].map((_, i) => {
//                   let pageNum;
//                   if (totalPages <= 5) {
//                     pageNum = i + 1;
//                   } else if (currentPage <= 3) {
//                     pageNum = i + 1;
//                   } else if (currentPage >= totalPages - 2) {
//                     pageNum = totalPages - 4 + i;
//                   } else {
//                     pageNum = currentPage - 2 + i;
//                   }
                  
//                   return (
//                     <button
//                       key={pageNum}
//                       onClick={() => setCurrentPage(pageNum)}
//                       className={`px-3 py-1 border rounded-lg text-sm ${
//                         currentPage === pageNum
//                           ? 'bg-purple-600 dark:bg-purple-500 text-white border-purple-600 dark:border-purple-500'
//                           : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
//                       }`}
//                     >
//                       {pageNum}
//                     </button>
//                   );
//                 })}
//                 <button
//                   onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
//                   disabled={currentPage === totalPages}
//                   className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <ChevronRight className="w-4 h-4" />
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Add Inscription Modal */}
//         {showAddModal && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
//             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//               <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
//                 <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ajouter une Inscription Pédagogique</h2>
//                 <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
//                   <X className="w-6 h-6" />
//                 </button>
//               </div>
//               <div className="p-6">
//                 <div className="space-y-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Étudiant *</label>
//                     <select
//                       name="id_etudiant"
//                       value={formData.id_etudiant}
//                       onChange={handleInputChange}
//                       required
//                       className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
//                     >
//                       <option value="">-- Sélectionner un étudiant --</option>
//                       {etudiants.map(etudiant => (
//                         <option key={etudiant.id_etudiant} value={etudiant.id_etudiant}>
//                           {etudiant.cne} - {etudiant.nom} {etudiant.prenom}
//                         </option>
//                       ))}
//                     </select>
//                   </div>
                  
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Module *</label>
//                     <select
//                       name="id_module"
//                       value={formData.id_module}
//                       onChange={handleInputChange}
//                       required
//                       className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
//                     >
//                       <option value="">-- Sélectionner un module --</option>
//                       {modules.map(module => (
//                         <option key={module.id_module} value={module.id_module}>
//                           {module.code_module} - {module.nom_module} ({module.credits} crédits)
//                         </option>
//                       ))}
//                     </select>
//                   </div>
                  
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type d'inscription *</label>
//                       <select
//                         name="type_inscription"
//                         value={formData.type_inscription}
//                         onChange={handleInputChange}
//                         required
//                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
//                       >
//                         <option value="Normal">Normal</option>
//                         <option value="Credit">Crédit</option>
//                         <option value="Anticipe">Anticipé</option>
//                       </select>
//                     </div>
                    
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Crédits Acquis</label>
//                       <input
//                         type="number"
//                         name="credits_acquis"
//                         value={formData.credits_acquis}
//                         onChange={handleInputChange}
//                         min="0"
//                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
//                       />
//                     </div>
//                   </div>
                  
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Offre de Formation</label>
//                       <select
//                         name="id_offre"
//                         value={formData.id_offre}
//                         onChange={handleInputChange}
//                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
//                       >
//                         <option value="">-- Sélectionner une offre --</option>
//                         {offreFormations.map(offre => (
//                           <option key={offre.id_offre} value={offre.id_offre}>
//                             {offre.nom_offre}
//                           </option>
//                         ))}
//                       </select>
//                     </div>
                    
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Inscription Administrative</label>
//                       <select
//                         name="id_inscription_admin"
//                         value={formData.id_inscription_admin}
//                         onChange={handleInputChange}
//                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
//                       >
//                         <option value="">-- Sélectionner une inscription admin --</option>
//                         {inscriptionsAdmin.map(inscription => (
//                           <option key={inscription.id_inscription_admin} value={inscription.id_inscription_admin}>
//                             {inscription.annee_universitaire} - {inscription.etat}
//                           </option>
//                         ))}
//                       </select>
//                     </div>
//                   </div>
//                 </div>
                
//                 <div className="mt-6 flex justify-end gap-3">
//                   <button
//                     onClick={() => setShowAddModal(false)}
//                     className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
//                   >
//                     Annuler
//                   </button>
//                   <button
//                     onClick={handleSubmit}
//                     className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg"
//                   >
//                     Ajouter
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Bulk Assign Modal */}
//         {showAssignModal && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
//             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
//               <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
//                 <h2 className="text-xl font-bold text-gray-900 dark:text-white">Affecter en Masse</h2>
//                 <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
//                   <X className="w-6 h-6" />
//                 </button>
//               </div>
//               <div className="p-6">
//                 <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
//                   <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
//                     <AlertCircle className="w-4 h-4" />
//                     <span className="text-sm font-medium">Affecter à {selectedInscriptions.length} inscription(s)</span>
//                   </div>
//                 </div>
                
//                 <div className="space-y-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Module</label>
//                     <select
//                       name="id_module"
//                       value={bulkFormData.id_module}
//                       onChange={handleBulkInputChange}
//                       className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
//                     >
//                       <option value="">-- Conserver les modules actuels --</option>
//                       {modules.map(module => (
//                         <option key={module.id_module} value={module.id_module}>
//                           {module.code_module} - {module.nom_module}
//                         </option>
//                       ))}
//                     </select>
//                   </div>
                  
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type d'inscription</label>
//                       <select
//                         name="type_inscription"
//                         value={bulkFormData.type_inscription}
//                         onChange={handleBulkInputChange}
//                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
//                       >
//                         <option value="Normal">Normal</option>
//                         <option value="Credit">Crédit</option>
//                         <option value="Anticipe">Anticipé</option>
//                       </select>
//                     </div>
                    
//                     <div>
//                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Crédits Acquis</label>
//                       <input
//                         type="number"
//                         name="credits_acquis"
//                         value={bulkFormData.credits_acquis}
//                         onChange={handleBulkInputChange}
//                         min="0"
//                         className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
//                       />
//                     </div>
//                   </div>
//                 </div>
                
//                 <div className="mt-6 flex justify-end gap-3">
//                   <button
//                     onClick={() => setShowAssignModal(false)}
//                     className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
//                   >
//                     Annuler
//                   </button>
//                   <button
//                     onClick={handleBulkAssign}
//                     className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg"
//                   >
//                     Affecter ({selectedInscriptions.length})
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Import Excel Modal (similar to previous component) */}
//         {showImportModal && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
//             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
//               <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
//                 <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Excel - Inscriptions Pédagogiques</h2>
//                 <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
//                   <X className="w-6 h-6" />
//                 </button>
//               </div>
//               <div className="p-6">
//                 <div className="mb-6">
//                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
//                     Sélectionner un fichier Excel
//                   </label>
//                   <input
//                     type="file"
//                     accept=".xlsx,.xls"
//                     onChange={handleFileSelect}
//                     className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
//                   />
//                   <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
//                     Colonnes requises: id_etudiant OU cne, id_module OU code_module, type_inscription<br />
//                     Colonnes optionnelles: credits_acquis, id_offre, id_inscription_admin
//                   </p>
//                 </div>

//                 {/* Import preview table similar to previous component */}
//                 {/* ... */}

//                 <div className="mt-6 flex justify-end gap-3">
//                   <button
//                     onClick={() => setShowImportModal(false)}
//                     className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
//                   >
//                     Annuler
//                   </button>
//                   <button
//                     onClick={handleBulkImport}
//                     disabled={importPreview.length === 0 || importErrors.length > 0}
//                     className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     Importer {importPreview.length} Inscriptions
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default PedagogicalInscriptionDataTable;

import React, { useState, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Search, Plus, Upload, Download, X, FileSpreadsheet, BookOpen, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

// Inertia props from controller
const InscriptionPedagogiqueDataTable = ({ 
  inscriptions_pedagogiques: initialInscriptions = [],
  inscriptions_administratives = [],
  offres_formation = [],
  etudiants = [],
  modules = [],
  filters: initialFilters = {}
}) => {
  const [inscriptions, setInscriptions] = useState(initialInscriptions);
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedInscriptions, setSelectedInscriptions] = useState([]);

  // Using useForm for better error handling
  const inscriptionForm = useForm({
    id_inscription_admin: '',
    id_offre: '',
    id_module: '',
    type_inscription: 'Normal',
    credits_acquis: 0
  });

  // Import state
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [selectedImportOffre, setSelectedImportOffre] = useState('');
  const [selectedImportModule, setSelectedImportModule] = useState('');
  const [importType, setImportType] = useState('Normal');
  const [importCredits, setImportCredits] = useState(0);

  // Filter and search inscriptions
  const filteredInscriptions = useMemo(() => {
    return inscriptions.filter(inscription => {
      const matchesSearch = !searchTerm || 
        inscription.etudiant?.cne?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inscription.etudiant?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inscription.etudiant?.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inscription.module?.nom_module?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [inscriptions, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredInscriptions.length / itemsPerPage);
  const paginatedInscriptions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInscriptions.slice(start, start + itemsPerPage);
  }, [filteredInscriptions, currentPage, itemsPerPage]);

  // Submit single inscription
  const handleSubmit = (e) => {
    e.preventDefault();
    inscriptionForm.post('/inscriptions/pedagogiques', {
      onSuccess: () => {
        setShowAddModal(false);
        inscriptionForm.reset();
        Swal.fire({
          icon: 'success',
          title: 'Inscription Pédagogique ajoutée',
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          router.visit(route('inscriptions.pedagogiques.index'));
        });
      },
      onError: (errors) => {
        console.error('Form errors:', errors);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Veuillez corriger les erreurs dans le formulaire'
        });
      }
    });
  };

  // Handle Excel file selection - only id_inscription_admin is imported
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        // Validate and format data - only id_inscription_admin is required
        const errors = [];
        const preview = data.map((row, index) => {
          const rowErrors = [];
          
          if (!row.id_inscription_admin) rowErrors.push('ID Inscription Admin requis');
          
          if (rowErrors.length > 0) {
            errors.push({ row: index + 2, errors: rowErrors });
          }

          return {
            id_inscription_admin: row.id_inscription_admin || '',
            // Find the related administrative inscription
            adminInscription: inscriptions_administratives.find(i => i.id_inscription_admin == row.id_inscription_admin)
          };
        });

        setImportPreview(preview);
        setImportErrors(errors);
      } catch (error) {
        alert('Erreur lors de la lecture du fichier Excel');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Submit bulk import
  const handleBulkImport = () => {
    if (!selectedImportOffre || !selectedImportModule) {
      alert('Veuillez sélectionner une offre de formation et un module pour l\'import.');
      return;
    }

    if (importErrors.length > 0) {
      alert('Veuillez corriger les erreurs avant d\'importer');
      return;
    }

    const inscriptionsToImport = importPreview
      .filter(item => item.adminInscription) // Only include items with found admin inscriptions
      .map(item => ({
        id_inscription_admin: item.adminInscription.id_inscription_admin,
        id_etudiant: item.adminInscription.id_etudiant,
        id_offre: selectedImportOffre,
        id_module: selectedImportModule,
        type_inscription: importType,
        credits_acquis: importCredits
      }));

    if (inscriptionsToImport.length === 0) {
      alert('Aucune inscription administrative valide trouvée pour l\'import');
      return;
    }

    router.post('/inscriptions/pedagogiques', { inscriptions: inscriptionsToImport }, {
      onSuccess: () => {
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);
        setImportErrors([]);
        setSelectedImportOffre('');
        setSelectedImportModule('');
        setImportType('Normal');
        setImportCredits(0);
        Swal.fire({
          icon: 'success',
          title: 'Inscriptions Pédagogiques ajoutées',
          text: `${inscriptionsToImport.length} inscriptions ont été ajoutées avec succès`,
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          router.visit(route('inscriptions.pedagogiques.index'));
        });
      },
      onError: () => {
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Une erreur est survenue lors de l\'importation des inscriptions'
        });
      }
    });
  };

  // Download Excel template
  const downloadTemplate = () => {
    const template = [
      {
        id_inscription_admin: 1 // Example ID
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscriptions_Pedagogiques');
    XLSX.writeFile(wb, 'template_inscriptions_pedagogiques.xlsx');
  };

  // Select/deselect inscriptions
  const toggleSelectInscription = (id) => {
    setSelectedInscriptions(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedInscriptions.length === paginatedInscriptions.length) {
      setSelectedInscriptions([]);
    } else {
      setSelectedInscriptions(paginatedInscriptions.map(i => i.id_inscription_pedagogique));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="p-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3 mb-6 transition-colors">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestion des Inscriptions Pédagogiques</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Template</span>
              </button>
              <button onClick={() => setShowImportModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Importer</span>
              </button>
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher par étudiant (CNE, nom, prénom) ou module..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Inscriptions</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{inscriptions.length}</div>
              </div>
              <BookOpen className="w-10 h-10 text-blue-500 dark:text-blue-400 opacity-50" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Résultats</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredInscriptions.length}</div>
              </div>
              <Search className="w-10 h-10 text-blue-500 dark:text-blue-400 opacity-50" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Sélectionnées</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedInscriptions.length}</div>
              </div>
              <FileSpreadsheet className="w-10 h-10 text-purple-500 dark:text-purple-400 opacity-50" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Page</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentPage}/{totalPages || 1}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={paginatedInscriptions.length > 0 && selectedInscriptions.length === paginatedInscriptions.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID Inscription Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Étudiant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Module</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Offre de Formation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Crédits Acquis</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedInscriptions.map((inscription) => (
                  <tr key={inscription.id_inscription_pedagogique} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedInscriptions.includes(inscription.id_inscription_pedagogique)}
                        onChange={() => toggleSelectInscription(inscription.id_inscription_pedagogique)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{inscription.id_inscription_admin}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      {inscription.etudiant?.nom} {inscription.etudiant?.prenom}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{inscription.module?.nom_module}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{inscription.offre?.libelle}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        inscription.type_inscription === 'Normal' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                          : inscription.type_inscription === 'Credit'
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                      }`}>
                        {inscription.type_inscription}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{inscription.credits_acquis}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                        <Eye className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination (reusable from previous components) */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {itemsPerPage >= filteredInscriptions.length ? (
                  `Affichage de tous les ${filteredInscriptions.length} résultats`
                ) : (
                  `Affichage ${((currentPage - 1) * itemsPerPage) + 1} à ${Math.min(currentPage * itemsPerPage, filteredInscriptions.length)} sur ${filteredInscriptions.length} résultats`
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Afficher:</span>
                <div className="flex gap-2">
                  <select
                    className="px-8 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <button
                    onClick={() => {
                      setItemsPerPage(filteredInscriptions.length);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 border rounded-lg text-sm transition ${
                      itemsPerPage >= filteredInscriptions.length
                        ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Tout
                  </button>
                </div>
              </div>
            </div>
            {/* ... pagination controls ... */}
             {itemsPerPage < filteredInscriptions.length && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400 min-w-fit">
                  Page {currentPage} sur {totalPages}
                </span>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 border rounded-lg text-sm ${
                        currentPage === pageNum
                          ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Add Inscription Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ajouter une Inscription Pédagogique</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Inscription Administrative *</label>
                    <select
                      name="id_inscription_admin"
                      value={inscriptionForm.data.id_inscription_admin}
                      onChange={(e) => inscriptionForm.setData('id_inscription_admin', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.id_inscription_admin ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">--Sélectionner une inscription administrative--</option>
                      {inscriptions_administratives.map(insc => (
                        <option key={insc.id_inscription_admin} value={insc.id_inscription_admin}>
                          {insc.id_inscription_admin} - {insc.etudiant?.nom} {insc.etudiant?.prenom}
                        </option>
                      ))}
                    </select>
                    {inscriptionForm.errors.id_inscription_admin && (
                      <div className="text-red-500 text-sm mt-1">{inscriptionForm.errors.id_inscription_admin}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Module *</label>
                    <select
                      name="id_module"
                      value={inscriptionForm.data.id_module}
                      onChange={(e) => inscriptionForm.setData('id_module', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.id_module ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">--Sélectionner un module--</option>
                      {modules.map(module => (
                        <option key={module.id_module} value={module.id_module}>
                          {module.nom_module}
                        </option>
                      ))}
                    </select>
                    {inscriptionForm.errors.id_module && (
                      <div className="text-red-500 text-sm mt-1">{inscriptionForm.errors.id_module}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Offre de Formation *</label>
                    <select
                      name="id_offre"
                      value={inscriptionForm.data.id_offre}
                      onChange={(e) => inscriptionForm.setData('id_offre', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.id_offre ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="">--Sélectionner une offre--</option>
                      {offres_formation.map(offre => (
                        <option key={offre.id_offre} value={offre.id_offre}>
                          {offre.libelle}
                        </option>
                      ))}
                    </select>
                    {inscriptionForm.errors.id_offre && (
                      <div className="text-red-500 text-sm mt-1">{inscriptionForm.errors.id_offre}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type d'inscription</label>
                    <select
                      name="type_inscription"
                      value={inscriptionForm.data.type_inscription}
                      onChange={(e) => inscriptionForm.setData('type_inscription', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.type_inscription ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <option value="Normal">Normal</option>
                      <option value="Credit">Crédit</option>
                      <option value="Anticipe">Anticipe</option>
                    </select>
                    {inscriptionForm.errors.type_inscription && (
                      <div className="text-red-500 text-sm mt-1">{inscriptionForm.errors.type_inscription}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Crédits Acquis</label>
                    <input
                      type="number"
                      name="credits_acquis"
                      value={inscriptionForm.data.credits_acquis}
                      onChange={(e) => inscriptionForm.setData('credits_acquis', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                        inscriptionForm.errors.credits_acquis ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {inscriptionForm.errors.credits_acquis && (
                      <div className="text-red-500 text-sm mt-1">{inscriptionForm.errors.credits_acquis}</div>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={inscriptionForm.processing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {inscriptionForm.processing ? 'Enregistrement...' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Excel Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Excel - Inscriptions Pédagogiques</h2>
                <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sélectionner un fichier Excel (ID Inscription Admin uniquement)
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg"
                  />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Le fichier Excel doit contenir uniquement une colonne "id_inscription_admin". Les autres informations seront sélectionnées ci-dessous.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Offre de Formation *
                    </label>
                    <select
                      value={selectedImportOffre}
                      onChange={(e) => setSelectedImportOffre(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="">--Sélectionner une offre--</option>
                      {offres_formation.map(offre => (
                        <option key={offre.id_offre} value={offre.id_offre}>
                          {offre.libelle}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Module *
                    </label>
                    <select
                      value={selectedImportModule}
                      onChange={(e) => setSelectedImportModule(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="">--Sélectionner un module--</option>
                      {modules.map(module => (
                        <option key={module.id_module} value={module.id_module}>
                          {module.nom_module}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type d'inscription
                    </label>
                    <select
                      value={importType}
                      onChange={(e) => setImportType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Credit">Crédit</option>
                      <option value="Anticipe">Anticipe</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Crédits Acquis
                    </label>
                    <input
                      type="number"
                      value={importCredits}
                      onChange={(e) => setImportCredits(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                  </div>
                </div>

                {importErrors.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h3 className="text-red-800 dark:text-red-400 font-medium mb-2">Erreurs détectées:</h3>
                    {importErrors.map((error, i) => (
                      <div key={i} className="text-sm text-red-700 dark:text-red-300">
                        Ligne {error.row}: {error.errors.join(', ')}
                      </div>
                    ))}
                  </div>
                )}

                {importPreview.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                      Aperçu ({importPreview.length} inscriptions)
                    </h3>
                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID Inscription Admin</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Étudiant</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {importPreview.slice(0, 10).map((item, i) => (
                              <tr key={i}>
                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.id_inscription_admin}</td>
                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                  {item.adminInscription ? `${item.adminInscription.etudiant?.nom} ${item.adminInscription.etudiant?.prenom}` : 'Non trouvé'}
                                </td>
                                <td className="px-4 py-2">
                                  {item.adminInscription ? (
                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                                      Trouvé
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                                      Non trouvé
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {importPreview.length > 10 && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        ... et {importPreview.length - 10} autres inscriptions
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleBulkImport}
                    disabled={importPreview.length === 0 || importErrors.length > 0 || !selectedImportOffre || !selectedImportModule}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Importer {importPreview.filter(item => item.adminInscription).length} Inscriptions
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InscriptionPedagogiqueDataTable;