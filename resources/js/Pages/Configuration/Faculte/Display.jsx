import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Building2, Upload, X, Save, Image, Mail, Phone, Globe, Printer, MapPin } from 'lucide-react';

export default function Display({ faculte }) {
    const [previewEntete, setPreviewEntete] = useState(faculte?.entete || null);
    const [previewLogo, setPreviewLogo] = useState(faculte?.logo || null);
    const [isDraggingEntete, setIsDraggingEntete] = useState(false);
    const [isDraggingLogo, setIsDraggingLogo] = useState(false);

    const { data, setData, post, put, processing, errors } = useForm({
        nom_faculte: faculte?.nom_faculte || '',
        entete: null,
        logo: null,
        adress: faculte?.adress || '',
        phone: faculte?.phone || '',
        email: faculte?.email || '',
        web: faculte?.web || '',
        fax: faculte?.fax || '',
        _method: faculte ? 'PUT' : 'POST'
    });

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            if (type === 'entete') {
                setData('entete', file);
                setPreviewEntete(URL.createObjectURL(file));
            } else {
                setData('logo', file);
                setPreviewLogo(URL.createObjectURL(file));
            }
        }
    };

    const handleDrop = (e, type) => {
        e.preventDefault();
        if (type === 'entete') {
            setIsDraggingEntete(false);
        } else {
            setIsDraggingLogo(false);
        }

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            if (type === 'entete') {
                setData('entete', file);
                setPreviewEntete(URL.createObjectURL(file));
            } else {
                setData('logo', file);
                setPreviewLogo(URL.createObjectURL(file));
            }
        }
    };

    const handleDragOver = (e, type) => {
        e.preventDefault();
        if (type === 'entete') {
            setIsDraggingEntete(true);
        } else {
            setIsDraggingLogo(true);
        }
    };

    const handleDragLeave = (e, type) => {
        e.preventDefault();
        if (type === 'entete') {
            setIsDraggingEntete(false);
        } else {
            setIsDraggingLogo(false);
        }
    };

    const removeImage = (type) => {
        if (type === 'entete') {
            setData('entete', null);
            setPreviewEntete(null);
        } else {
            setData('logo', null);
            setPreviewLogo(null);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== '') {
                formData.append(key, data[key]);
            }
        });

        if (faculte) {
            post(route('faculte.update', faculte.id_faculte), {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Mise à jour réussie',
                        text: 'Les informations de la faculté ont été mises à jour.',
                        showConfirmButton: false,
                        timer: 2000
                    });
                },
                onError: () => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erreur',
                        text: 'Une erreur est survenue lors de la mise à jour.'
                    });
                }
            });
        } else {
            post(route('faculte.store'), {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Configuration enregistrée',
                        text: 'La faculté a été configurée avec succès.',
                        showConfirmButton: false,
                        timer: 2000
                    });
                },
                onError: () => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erreur',
                        text: 'Une erreur est survenue lors de l\'enregistrement.'
                    });
                }
            });
        }
    };

    const ImageUploadZone = ({ type, preview, title, description }) => (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {title}
            </label>
            <div
                className={`relative border-2 border-dashed rounded-lg p-6 transition-all ${
                    (type === 'entete' ? isDraggingEntete : isDraggingLogo)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                onDrop={(e) => handleDrop(e, type)}
                onDragOver={(e) => handleDragOver(e, type)}
                onDragLeave={(e) => handleDragLeave(e, type)}
            >
                {preview ? (
                    <div className="relative">
                        <img
                            src={preview.startsWith('blob:') ? preview : `/storage/${preview}`}
                            alt={title}
                            className="max-h-48 mx-auto rounded"
                        />
                        <button
                            type="button"
                            onClick={() => removeImage(type)}
                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="mt-2">
                            <label
                                htmlFor={`${type}-upload`}
                                className="cursor-pointer text-blue-600 hover:text-blue-500 dark:text-blue-400"
                            >
                                <span className="font-medium">Cliquez pour télécharger</span>
                                <span className="text-gray-500 dark:text-gray-400"> ou glissez-déposez</span>
                            </label>
                            <input
                                id={`${type}-upload`}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, type)}
                                className="hidden"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {description}
                        </p>
                    </div>
                )}
            </div>
            {errors[type] && (
                <div className="text-red-500 text-sm">{errors[type]}</div>
            )}
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 rounded-lg shadow-lg">
            <div className="border-b border-gray-300 dark:border-gray-700 pb-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                        <Building2 size={28} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">
                            {faculte ? 'Configuration de la Faculté' : 'Configuration Initiale de la Faculté'}
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {faculte 
                                ? 'Modifiez les informations de votre faculté' 
                                : 'Cette configuration ne peut être effectuée qu\'une seule fois'
                            }
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Informations de base */}
                <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Building2 size={20} />
                        Informations Générales
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Nom de la Faculté <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.nom_faculte}
                                onChange={(e) => setData('nom_faculte', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Ex: Faculté des Sciences et Techniques"
                                required
                            />
                            {errors.nom_faculte && (
                                <div className="text-red-500 text-sm mt-1">{errors.nom_faculte}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Images */}
                <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Image size={20} />
                        Images et Logos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ImageUploadZone
                            type="entete"
                            preview={previewEntete}
                            title="En-tête de la Faculté"
                            description="PNG, JPG jusqu'à 10MB (Recommandé: 1920x400px)"
                        />
                        <ImageUploadZone
                            type="logo"
                            preview={previewLogo}
                            title="Logo de la Faculté"
                            description="PNG, JPG jusqu'à 5MB (Recommandé: 512x512px)"
                        />
                    </div>
                </div>

                {/* Coordonnées */}
                <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Mail size={20} />
                        Coordonnées
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-2 flex items-center gap-2">
                                <MapPin size={16} />
                                Adresse
                            </label>
                            <input
                                type="text"
                                value={data.adress}
                                onChange={(e) => setData('adress', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Ex: Avenue Abdelkrim Khattabi, Guéliz"
                            />
                            {errors.adress && (
                                <div className="text-red-500 text-sm mt-1">{errors.adress}</div>
                            )}
                        </div>

                        <div>
                            <label className=" text-sm font-medium mb-2 flex items-center gap-2">
                                <Phone size={16} />
                                Téléphone
                            </label>
                            <input
                                type="tel"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Ex: +212 5XX-XXXXXX"
                            />
                            {errors.phone && (
                                <div className="text-red-500 text-sm mt-1">{errors.phone}</div>
                            )}
                        </div>

                        <div>
                            <label className=" text-sm font-medium mb-2 flex items-center gap-2">
                                <Mail size={16} />
                                Email
                            </label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Ex: contact@faculte.ac.ma"
                            />
                            {errors.email && (
                                <div className="text-red-500 text-sm mt-1">{errors.email}</div>
                            )}
                        </div>

                        <div>
                            <label className=" text-sm font-medium mb-2 flex items-center gap-2">
                                <Globe size={16} />
                                Site Web
                            </label>
                            <input
                                type="url"
                                value={data.web}
                                onChange={(e) => setData('web', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Ex: https://www.faculte.ac.ma"
                            />
                            {errors.web && (
                                <div className="text-red-500 text-sm mt-1">{errors.web}</div>
                            )}
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Printer size={16} />
                                Fax
                            </label>
                            <input
                                type="tel"
                                value={data.fax}
                                onChange={(e) => setData('fax', e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Ex: +212 5XX-XXXXXX"
                            />
                            {errors.fax && (
                                <div className="text-red-500 text-sm mt-1">{errors.fax}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-4 pt-4">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={processing}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={20} />
                        {processing 
                            ? 'Enregistrement...' 
                            : (faculte ? 'Mettre à jour' : 'Enregistrer la configuration')
                        }
                    </button>
                </div>

                {!faculte && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Note importante :</strong> Cette configuration initiale est permanente. 
                            Assurez-vous que toutes les informations sont correctes avant de soumettre.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}