// import React, { useState } from 'react';
// import { router } from '@inertiajs/react';
// import { Upload, Plus, Search, Edit, Trash2, Download, X } from 'lucide-react';
// import * as XLSX from 'xlsx';

// export default function StudentDataTable({ students = [], filieres = [] }) {
//     console.log('Filieres:', filieres);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showExcelModal, setShowExcelModal] = useState(false);
//   const [formData, setFormData] = useState({
//     cne: '',
//     nom: '',
//     prenom: '',
//     mail_academique: '',
//     mail_personnel: '',
//     date_naissance: '',
//     telephone: '',
//     id_filiere: ''
//   });
//   const [excelData, setExcelData] = useState([]);
//   const [excelFile, setExcelFile] = useState(null);

//   const filteredStudents = students.filter(student =>
//     student.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     student.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     student.cne?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     student.mail_academique?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const handleInputChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     router.post('/etudiants', formData, {
//       onSuccess: () => {
//         setShowAddModal(false);
//         setFormData({
//           cne: '', nom: '', prenom: '', mail_academique: '',
//           mail_personnel: '', date_naissance: '', telephone: '', id_filiere: ''
//         });
//       }
//     });
//   };

//   const handleDelete = (id) => {
//     if (confirm('Êtes-vous sûr de vouloir supprimer cet étudiant?')) {
//       router.delete(`/etudiants/${id}`);
//     }
//   };

//   const handleExcelUpload = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     setExcelFile(file);
//     const reader = new FileReader();
    
//     reader.onload = (event) => {
//       const workbook = XLSX.read(event.target.result, { type: 'binary' });
//       const sheetName = workbook.SheetNames[0];
//       const worksheet = workbook.Sheets[sheetName];
//       const data = XLSX.utils.sheet_to_json(worksheet);
      
//       setExcelData(data);
//     };
    
//     reader.readAsBinaryString(file);
//   };

//   const handleExcelSubmit = () => {
//     router.post('/etudiants/import', { students: excelData }, {
//       onSuccess: () => {
//         setShowExcelModal(false);
//         setExcelData([]);
//         setExcelFile(null);
//       }
//     });
//   };

//   const downloadTemplate = () => {
//     const template = [{
//       cne: 'N1234567',
//       nom: 'DOE',
//       prenom: 'John',
//       mail_academique: 'john.doe@etu.example.com',
//       mail_personnel: 'john@example.com',
//       date_naissance: '2000-01-15',
//       telephone: '0612345678',
//       id_filiere: '1'
//     }];
    
//     const ws = XLSX.utils.json_to_sheet(template);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, 'Etudiants');
//     XLSX.writeFile(wb, 'template_etudiants.xlsx');
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-7xl mx-auto">
//         <div className="bg-white rounded-lg shadow-md p-6">
//           {/* Header */}
//           <div className="flex justify-between items-center mb-6">
//             <h1 className="text-3xl font-bold text-gray-800">Gestion des Étudiants</h1>
//             <div className="flex gap-3">
//               <button
//                 onClick={() => setShowAddModal(true)}
//                 className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
//               >
//                 <Plus size={20} />
//                 Ajouter
//               </button>
//               <button
//                 onClick={() => setShowExcelModal(true)}
//                 className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
//               >
//                 <Upload size={20} />
//                 Importer Excel
//               </button>
//             </div>
//           </div>

//           {/* Search Bar */}
//           <div className="mb-6">
//             <div className="relative">
//               <Search className="absolute left-3 top-3 text-gray-400" size={20} />
//               <input
//                 type="text"
//                 placeholder="Rechercher par nom, prénom, CNE ou email..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//               />
//             </div>
//           </div>

//           {/* Table */}
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-gray-100 border-b-2 border-gray-200">
//                 <tr>
//                   <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">CNE</th>
//                   <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
//                   <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
//                   <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email Académique</th>
//                   <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Téléphone</th>
//                   <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Filière</th>
//                   <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200">
//                 {filteredStudents.map((student) => (
//                   <tr key={student.id_etudiant} className="hover:bg-gray-50">
//                     <td className="px-4 py-3 text-sm text-gray-900">{student.cne}</td>
//                     <td className="px-4 py-3 text-sm text-gray-900">{student.nom}</td>
//                     <td className="px-4 py-3 text-sm text-gray-900">{student.prenom}</td>
//                     <td className="px-4 py-3 text-sm text-gray-600">{student.mail_academique}</td>
//                     <td className="px-4 py-3 text-sm text-gray-600">{student.telephone || '-'}</td>
//                     <td className="px-4 py-3 text-sm text-gray-600">
//                       {student.filiere?.nom_filiere || '-'}
//                     </td>
//                     <td className="px-4 py-3 text-center">
//                       <div className="flex justify-center gap-2">
//                         <button
//                           onClick={() => router.visit(`/etudiants/${student.id_etudiant}/edit`)}
//                           className="text-blue-600 hover:text-blue-800 transition"
//                         >
//                           <Edit size={18} />
//                         </button>
//                         <button
//                           onClick={() => handleDelete(student.id_etudiant)}
//                           className="text-red-600 hover:text-red-800 transition"
//                         >
//                           <Trash2 size={18} />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//             {filteredStudents.length === 0 && (
//               <div className="text-center py-12 text-gray-500">
//                 Aucun étudiant trouvé
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Add Student Modal */}
//       {showAddModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//             <div className="flex justify-between items-center mb-6">
//               <h2 className="text-2xl font-bold text-gray-800">Ajouter un Étudiant</h2>
//               <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
//                 <X size={24} />
//               </button>
//             </div>
//             <form onSubmit={handleSubmit} className="space-y-4">
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">CNE *</label>
//                   <input
//                     type="text"
//                     name="cne"
//                     value={formData.cne}
//                     onChange={handleInputChange}
//                     required
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
//                   <input
//                     type="text"
//                     name="nom"
//                     value={formData.nom}
//                     onChange={handleInputChange}
//                     required
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
//                   <input
//                     type="text"
//                     name="prenom"
//                     value={formData.prenom}
//                     onChange={handleInputChange}
//                     required
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Email Académique *</label>
//                   <input
//                     type="email"
//                     name="mail_academique"
//                     value={formData.mail_academique}
//                     onChange={handleInputChange}
//                     required
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Email Personnel</label>
//                   <input
//                     type="email"
//                     name="mail_personnel"
//                     value={formData.mail_personnel}
//                     onChange={handleInputChange}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Date de Naissance</label>
//                   <input
//                     type="date"
//                     name="date_naissance"
//                     value={formData.date_naissance}
//                     onChange={handleInputChange}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
//                   <input
//                     type="tel"
//                     name="telephone"
//                     value={formData.telephone}
//                     onChange={handleInputChange}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Filière</label>
//                   <select
//                     name="id_filiere"
//                     value={formData.id_filiere}
//                     onChange={handleInputChange}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   >
//                     <option value="">Sélectionner une filière</option>
//                     {filieres.map(filiere => (
//                       <option key={filiere.id_filiere} value={filiere.id_filiere}>
//                         {filiere.nom_filiere}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>
//               <div className="flex justify-end gap-3 mt-6">
//                 <button
//                   type="button"
//                   onClick={() => setShowAddModal(false)}
//                   className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
//                 >
//                   Annuler
//                 </button>
//                 <button
//                   type="submit"
//                   className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
//                 >
//                   Enregistrer
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Excel Import Modal */}
//       {showExcelModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
//             <div className="flex justify-between items-center mb-6">
//               <h2 className="text-2xl font-bold text-gray-800">Importer des Étudiants (Excel)</h2>
//               <button onClick={() => setShowExcelModal(false)} className="text-gray-500 hover:text-gray-700">
//                 <X size={24} />
//               </button>
//             </div>

//             <div className="mb-6 p-4 bg-blue-50 rounded-lg">
//               <p className="text-sm text-blue-800 mb-2">
//                 Téléchargez le modèle Excel pour voir le format requis
//               </p>
//               <button
//                 onClick={downloadTemplate}
//                 className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
//               >
//                 <Download size={18} />
//                 Télécharger le Modèle
//               </button>
//             </div>

//             <div className="mb-6">
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Sélectionner un fichier Excel
//               </label>
//               <input
//                 type="file"
//                 accept=".xlsx,.xls"
//                 onChange={handleExcelUpload}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             {excelData.length > 0 && (
//               <div>
//                 <h3 className="text-lg font-semibold mb-3">
//                   Aperçu des données ({excelData.length} étudiants)
//                 </h3>
//                 <div className="overflow-x-auto max-h-96 border rounded-lg">
//                   <table className="w-full text-sm">
//                     <thead className="bg-gray-100 sticky top-0">
//                       <tr>
//                         <th className="px-3 py-2 text-left">CNE</th>
//                         <th className="px-3 py-2 text-left">Nom</th>
//                         <th className="px-3 py-2 text-left">Prénom</th>
//                         <th className="px-3 py-2 text-left">Email</th>
//                         <th className="px-3 py-2 text-left">Téléphone</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y">
//                       {excelData.map((row, idx) => (
//                         <tr key={idx} className="hover:bg-gray-50">
//                           <td className="px-3 py-2">{row.cne}</td>
//                           <td className="px-3 py-2">{row.nom}</td>
//                           <td className="px-3 py-2">{row.prenom}</td>
//                           <td className="px-3 py-2">{row.mail_academique}</td>
//                           <td className="px-3 py-2">{row.telephone}</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//                 <div className="flex justify-end gap-3 mt-6">
//                   <button
//                     onClick={() => {
//                       setExcelData([]);
//                       setExcelFile(null);
//                     }}
//                     className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
//                   >
//                     Annuler
//                   </button>
//                   <button
//                     onClick={handleExcelSubmit}
//                     className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
//                   >
//                     Importer {excelData.length} Étudiants
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// import React, { useState } from 'react';
// import { router } from '@inertiajs/react';
// import { Upload, Plus, Search, Edit, Trash2, Download, X } from 'lucide-react';
// import * as XLSX from 'xlsx';

// export default function StudentDataTable({ students = [], filieres = [] }) {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showExcelModal, setShowExcelModal] = useState(false);
//   const [formData, setFormData] = useState({
//     cne: '',
//     nom: '',
//     prenom: '',
//     mail_academique: '',
//     mail_personnel: '',
//     date_naissance: '',
//     telephone: '',
//     id_filiere: ''
//   });
//   const [excelData, setExcelData] = useState([]);
//   const [excelFile, setExcelFile] = useState(null);

//   const filteredStudents = students.filter(student =>
//     student.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     student.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     student.cne?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     student.mail_academique?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const handleInputChange = (e) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     router.post('/etudiants', formData, {
//       onSuccess: () => {
//         setShowAddModal(false);
//         setFormData({
//           cne: '', nom: '', prenom: '', mail_academique: '',
//           mail_personnel: '', date_naissance: '', telephone: '', id_filiere: ''
//         });
//       }
//     });
//   };

//   const handleDelete = (id) => {
//     if (confirm('Êtes-vous sûr de vouloir supprimer cet étudiant?')) {
//       router.delete(`/etudiants/${id}`);
//     }
//   };

//   const handleExcelUpload = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     setExcelFile(file);
//     const reader = new FileReader();
    
//     reader.onload = (event) => {
//       const workbook = XLSX.read(event.target.result, { type: 'binary' });
//       const sheetName = workbook.SheetNames[0];
//       const worksheet = workbook.Sheets[sheetName];
//       const data = XLSX.utils.sheet_to_json(worksheet);
      
//       setExcelData(data);
//     };
    
//     reader.readAsBinaryString(file);
//   };

//   const handleExcelSubmit = () => {
//     router.post('/etudiants/import', { students: excelData }, {
//       onSuccess: () => {
//         setShowExcelModal(false);
//         setExcelData([]);
//         setExcelFile(null);
//       }
//     });
//   };

//   const downloadTemplate = () => {
//     const template = [{
//       cne: 'N1234567',
//       nom: 'DOE',
//       prenom: 'John',
//       mail_academique: 'john.doe@etu.example.com',
//       mail_personnel: 'john@example.com',
//       date_naissance: '2000-01-15',
//       telephone: '0612345678',
//       id_filiere: '1'
//     }];
    
//     const ws = XLSX.utils.json_to_sheet(template);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, 'Etudiants');
//     XLSX.writeFile(wb, 'template_etudiants.xlsx');
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-7xl mx-auto">
//         <div className="bg-white rounded-lg shadow-md p-6">
//           {/* Header */}
//           <div className="flex justify-between items-center mb-6">
//             <h1 className="text-3xl font-bold text-gray-800">Gestion des Étudiants</h1>
//             <div className="flex gap-3">
//               <button
//                 onClick={() => setShowAddModal(true)}
//                 className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
//               >
//                 <Plus size={20} />
//                 Ajouter
//               </button>
//               <button
//                 onClick={() => setShowExcelModal(true)}
//                 className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
//               >
//                 <Upload size={20} />
//                 Importer Excel
//               </button>
//             </div>
//           </div>

//           {/* Search Bar */}
//           <div className="mb-6">
//             <div className="relative">
//               <Search className="absolute left-3 top-3 text-gray-400" size={20} />
//               <input
//                 type="text"
//                 placeholder="Rechercher par nom, prénom, CNE ou email..."
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//               />
//             </div>
//           </div>

//           {/* Table */}
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-gray-100 border-b-2 border-gray-200">
//                 <tr>
//                   <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">CNE</th>
//                   <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
//                   <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
//                   <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email Académique</th>
//                   <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Téléphone</th>
//                   <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Filière</th>
//                   <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200">
//                 {filteredStudents.map((student) => (
//                   <tr key={student.id_etudiant} className="hover:bg-gray-50">
//                     <td className="px-4 py-3 text-sm text-gray-900">{student.cne}</td>
//                     <td className="px-4 py-3 text-sm text-gray-900">{student.nom}</td>
//                     <td className="px-4 py-3 text-sm text-gray-900">{student.prenom}</td>
//                     <td className="px-4 py-3 text-sm text-gray-600">{student.mail_academique}</td>
//                     <td className="px-4 py-3 text-sm text-gray-600">{student.telephone || '-'}</td>
//                     <td className="px-4 py-3 text-sm text-gray-600">
//                       {student.filiere?.nom || '-'}
//                     </td>
//                     <td className="px-4 py-3 text-center">
//                       <div className="flex justify-center gap-2">
//                         <button
//                           onClick={() => router.visit(`/etudiants/${student.id_etudiant}/edit`)}
//                           className="text-blue-600 hover:text-blue-800 transition"
//                         >
//                           <Edit size={18} />
//                         </button>
//                         <button
//                           onClick={() => handleDelete(student.id_etudiant)}
//                           className="text-red-600 hover:text-red-800 transition"
//                         >
//                           <Trash2 size={18} />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//             {filteredStudents.length === 0 && (
//               <div className="text-center py-12 text-gray-500">
//                 Aucun étudiant trouvé
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Add Student Modal */}
//       {showAddModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//             <div className="flex justify-between items-center mb-6">
//               <h2 className="text-2xl font-bold text-gray-800">Ajouter un Étudiant</h2>
//               <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
//                 <X size={24} />
//               </button>
//             </div>
//             <div className="space-y-4">
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">CNE *</label>
//                   <input
//                     type="text"
//                     name="cne"
//                     value={formData.cne}
//                     onChange={handleInputChange}
//                     required
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
//                   <input
//                     type="text"
//                     name="nom"
//                     value={formData.nom}
//                     onChange={handleInputChange}
//                     required
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
//                   <input
//                     type="text"
//                     name="prenom"
//                     value={formData.prenom}
//                     onChange={handleInputChange}
//                     required
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Email Académique *</label>
//                   <input
//                     type="email"
//                     name="mail_academique"
//                     value={formData.mail_academique}
//                     onChange={handleInputChange}
//                     required
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Email Personnel</label>
//                   <input
//                     type="email"
//                     name="mail_personnel"
//                     value={formData.mail_personnel}
//                     onChange={handleInputChange}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Date de Naissance</label>
//                   <input
//                     type="date"
//                     name="date_naissance"
//                     value={formData.date_naissance}
//                     onChange={handleInputChange}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
//                   <input
//                     type="tel"
//                     name="telephone"
//                     value={formData.telephone}
//                     onChange={handleInputChange}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1">Filière</label>
//                   <select
//                     name="id_filiere"
//                     value={formData.id_filiere}
//                     onChange={handleInputChange}
//                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                   >
//                     <option value="">Sélectionner une filière</option>
//                     {filieres.map(filiere => (
//                       <option key={filiere.id_filiere} value={filiere.id_filiere}>
//                         {filiere.nom}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>
//               <div className="flex justify-end gap-3 mt-6">
//                 <button
//                   type="button"
//                   onClick={() => setShowAddModal(false)}
//                   className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
//                 >
//                   Annuler
//                 </button>
//                 <button
//                   type="submit"
//                   className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
//                 >
//                   Enregistrer
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Excel Import Modal */}
//       {showExcelModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
//             <div className="flex justify-between items-center mb-6">
//               <h2 className="text-2xl font-bold text-gray-800">Importer des Étudiants (Excel)</h2>
//               <button onClick={() => setShowExcelModal(false)} className="text-gray-500 hover:text-gray-700">
//                 <X size={24} />
//               </button>
//             </div>

//             <div className="mb-6 p-4 bg-blue-50 rounded-lg">
//               <p className="text-sm text-blue-800 mb-2">
//                 Téléchargez le modèle Excel pour voir le format requis
//               </p>
//               <button
//                 onClick={downloadTemplate}
//                 className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
//               >
//                 <Download size={18} />
//                 Télécharger le Modèle
//               </button>
//             </div>

//             <div className="mb-6">
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Sélectionner un fichier Excel
//               </label>
//               <input
//                 type="file"
//                 accept=".xlsx,.xls"
//                 onChange={handleExcelUpload}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             {excelData.length > 0 && (
//               <div>
//                 <h3 className="text-lg font-semibold mb-3">
//                   Aperçu des données ({excelData.length} étudiants)
//                 </h3>
//                 <div className="overflow-x-auto max-h-96 border rounded-lg">
//                   <table className="w-full text-sm">
//                     <thead className="bg-gray-100 sticky top-0">
//                       <tr>
//                         <th className="px-3 py-2 text-left">CNE</th>
//                         <th className="px-3 py-2 text-left">Nom</th>
//                         <th className="px-3 py-2 text-left">Prénom</th>
//                         <th className="px-3 py-2 text-left">Email</th>
//                         <th className="px-3 py-2 text-left">Téléphone</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y">
//                       {excelData.map((row, idx) => (
//                         <tr key={idx} className="hover:bg-gray-50">
//                           <td className="px-3 py-2">{row.cne}</td>
//                           <td className="px-3 py-2">{row.nom}</td>
//                           <td className="px-3 py-2">{row.prenom}</td>
//                           <td className="px-3 py-2">{row.mail_academique}</td>
//                           <td className="px-3 py-2">{row.telephone}</td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//                 <div className="flex justify-end gap-3 mt-6">
//                   <button
//                     onClick={() => {
//                       setExcelData([]);
//                       setExcelFile(null);
//                     }}
//                     className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
//                   >
//                     Annuler
//                   </button>
//                   <button
//                     onClick={handleExcelSubmit}
//                     className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
//                   >
//                     Importer {excelData.length} Étudiants
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Upload, Plus, Search, Edit, Trash2, Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function StudentDataTable({ students = [], filieres = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [formData, setFormData] = useState({
    cne: '',
    nom: '',
    prenom: '',
    mail_academique: '',
    mail_personnel: '',
    date_naissance: '',
    telephone: '',
    id_filiere: ''
  });
  const [excelData, setExcelData] = useState([]);
  const [excelFile, setExcelFile] = useState(null);

  const filteredStudents = students.filter(student =>
    student.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.cne?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.mail_academique?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    router.post('/etudiants', formData, {
      onSuccess: () => {
        setShowAddModal(false);
        setFormData({
          cne: '', nom: '', prenom: '', mail_academique: '',
          mail_personnel: '', date_naissance: '', telephone: '', id_filiere: ''
        });
      }
    });
  };

  const handleDelete = (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet étudiant?')) {
      router.delete(`/etudiants/${id}`);
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelFile(file);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      setExcelData(data);
    };
    
    reader.readAsBinaryString(file);
  };

  const handleExcelSubmit = () => {
    router.post('/etudiants/import', { students: excelData }, {
      onSuccess: () => {
        setShowExcelModal(false);
        setExcelData([]);
        setExcelFile(null);
      }
    });
  };

  const downloadTemplate = () => {
    const template = [{
      cne: 'N1234567',
      nom: 'DOE',
      prenom: 'John',
      mail_academique: 'john.doe@etu.example.com',
      mail_personnel: 'john@example.com',
      date_naissance: '2000-01-15',
      telephone: '0612345678',
      id_filiere: '1'
    }];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Etudiants');
    XLSX.writeFile(wb, 'template_etudiants.xlsx');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Gestion des Étudiants</h1>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={20} />
                Ajouter
              </button>
              <button
                onClick={() => setShowExcelModal(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                <Upload size={20} />
                Importer Excel
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par nom, prénom, CNE ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">CNE</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email Académique</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Téléphone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Filière</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id_etudiant} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{student.cne}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{student.nom}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{student.prenom}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.mail_academique}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{student.telephone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {student.filiere?.nom || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => router.visit(`/etudiants/${student.id_etudiant}/edit`)}
                          className="text-blue-600 hover:text-blue-800 transition"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id_etudiant)}
                          className="text-red-600 hover:text-red-800 transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Aucun étudiant trouvé
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Ajouter un Étudiant</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNE *</label>
                  <input
                    type="text"
                    name="cne"
                    value={formData.cne}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input
                    type="text"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Académique *</label>
                  <input
                    type="email"
                    name="mail_academique"
                    value={formData.mail_academique}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Personnel</label>
                  <input
                    type="email"
                    name="mail_personnel"
                    value={formData.mail_personnel}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de Naissance</label>
                  <input
                    type="date"
                    name="date_naissance"
                    value={formData.date_naissance}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filière</label>
                  <select
                    name="id_filiere"
                    value={formData.id_filiere}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner une filière</option>
                    {filieres.map(filiere => (
                      <option key={filiere.id_filiere} value={filiere.id_filiere}>
                        {filiere.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      {showExcelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Importer des Étudiants (Excel)</h2>
              <button onClick={() => setShowExcelModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                Téléchargez le modèle Excel pour voir le format requis
              </p>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Download size={18} />
                Télécharger le Modèle
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sélectionner un fichier Excel
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {excelData.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Aperçu des données ({excelData.length} étudiants)
                </h3>
                <div className="overflow-x-auto max-h-96 border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">CNE</th>
                        <th className="px-3 py-2 text-left">Nom</th>
                        <th className="px-3 py-2 text-left">Prénom</th>
                        <th className="px-3 py-2 text-left">Email</th>
                        <th className="px-3 py-2 text-left">Téléphone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {excelData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{row.cne}</td>
                          <td className="px-3 py-2">{row.nom}</td>
                          <td className="px-3 py-2">{row.prenom}</td>
                          <td className="px-3 py-2">{row.mail_academique}</td>
                          <td className="px-3 py-2">{row.telephone}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setExcelData([]);
                      setExcelFile(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleExcelSubmit}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    Importer {excelData.length} Étudiants
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}