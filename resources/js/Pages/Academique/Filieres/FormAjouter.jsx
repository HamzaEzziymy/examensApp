import { useRef } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { useForm } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import Swal from 'sweetalert2';

function FormAjouter({ anneesUniv }) {
  const formRef = useRef(null);

  const { setData, data, post, errors, processing } = useForm({
    nom_filiere: '',
    code_filiere: '',
    id_annee: '',
  });

  const submit = (e) => {
    e.preventDefault();

    post(route('academique.filieres.store'), {
      forceFormData: true,
      onSuccess: () => {
        setData({
          nom_filiere: '',
          code_filiere: '',
          id_annee: '',
        });
        formRef.current?.reset();

        Swal.fire({
          icon: 'success',
          title: 'Ajouté !',
          text: 'La filière a été ajoutée avec succès.',
          timer: 2000,
          showConfirmButton: false
        });
      },
      onError: () => {
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Une erreur est survenue lors de l\'ajout.',
        });
      }
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 p-6 shadow-md transition-all rounded-md">
      <div className="border-b border-gray-300 dark:border-gray-700 pb-4 mb-6">
        <h2 className="text-2xl font-semibold flex items-center text-blue-700 dark:text-blue-400">
          <FaPlus className="mr-2" />
          Ajouter Filière
        </h2>
      </div>

      <div className="space-y-6">
        {/* Nom de la Filière */}
        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
            Nom de la Filière
          </label>
          <input
            required
            type="text"
            placeholder="e.g., Informatique"
            value={data.nom_filiere}
            onChange={(e) => setData('nom_filiere', e.target.value)}
            className="w-full rounded-lg border border-blue-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 py-3 px-4 text-black dark:text-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
          <InputError className="mt-1 text-sm" message={errors.nom_filiere} />
        </div>

        {/* Code Filière */}
        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
            Code Filière
          </label>
          <input
            type="number"
            placeholder="e.g., 101"
            value={data.code_filiere}
            onChange={(e) => setData('code_filiere', e.target.value)}
            className="w-full rounded-lg border border-blue-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 py-3 px-4 text-black dark:text-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
          <InputError className="mt-1 text-sm" message={errors.code_filiere} />
        </div>

        {/* Année Universitaire */}
        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
            Année Universitaire
          </label>
          <select
            value={data.id_annee}
            onChange={(e) => setData('id_annee', e.target.value)}
            className="w-full rounded-lg border border-blue-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 py-3 px-4 text-black dark:text-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            <option value="">Sélectionner une année</option>
            {anneesUniv?.map((annee) => (
              <option key={annee.id_annee} value={annee.id_annee}>
                {annee.annee_univ}
              </option>
            ))}
          </select>
          <InputError className="mt-1 text-sm" message={errors.id_annee} />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="button"
            onClick={submit}
            disabled={processing}
            className={`inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-500 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition ${
              processing && 'opacity-75 cursor-not-allowed'
            }`}
          >
            {processing && (
              <svg
                aria-hidden="true"
                role="status"
                className="inline w-4 h-4 mr-2 text-white animate-spin"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="#E5E7EB"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentColor"
                />
              </svg>
            )}
            <FaPlus className="mr-2" />
            Ajouter Filière
          </button>
        </div>
      </div>
    </div>
  );
}

export default FormAjouter;