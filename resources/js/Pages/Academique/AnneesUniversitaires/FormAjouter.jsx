import { useRef } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { useForm } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import Swal from 'sweetalert2';


function FormAjouter() {
  const formRef = useRef(null);

  const { setData, data, post, errors, processing } = useForm({
    annee_univ: null,
    date_debut: null,
    date_cloture: null,
    est_active: false,
  });

  const submit = (e) => {
      e.preventDefault();

      post(route('academique.annees-universitaires.store'), {
          forceFormData: true,
          onSuccess: () => {
              setData({
                  annee_univ: null,
                  date_debut: null,
                  date_cloture: null,
                  est_active: false,
              });
              formRef.current?.reset();

              Swal.fire({
                  icon: 'success',
                  title: 'Ajouté !',
                  text: 'L\'année universitaire a été ajoutée avec succès.',
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
    <form
      ref={formRef}
      onSubmit={submit}
      className=" bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 p-6  shadow-md transition-all rounded-md"
    >
      <div className="border-b border-gray-300 dark:border-gray-700 pb-4 mb-6">
        <h2 className="text-2xl font-semibold flex items-center text-blue-700 dark:text-blue-400">
          <FaPlus className="mr-2" />
          Ajouter Année Universitaire
        </h2>
      </div>

      <div className="space-y-6">
        {/* Année Universitaire */}
        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
            Année Universitaire
          </label>
          <input
            required
            type="text"
            placeholder="e.g., 2024/2025"
            onChange={(e) => setData('annee_univ', e.target.value)}
            className="w-full rounded-lg border border-blue-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 py-3 px-4 text-black dark:text-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
          <InputError className="mt-1 text-sm" message={errors.annee_univ} />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
              Date de début
            </label>
            <input
              required
              type="date"
              onChange={(e) => setData('date_debut', e.target.value)}
              className="w-full rounded-lg border border-blue-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 py-3 px-4 text-black dark:text-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
            <InputError className="mt-1 text-sm" message={errors.date_debut} />
          </div>
          <div>
            <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">
              Date de fin
            </label>
            <input
              required
              type="date"
              onChange={(e) => setData('date_cloture', e.target.value)}
              className="w-full rounded-lg border border-blue-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 py-3 px-4 text-black dark:text-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
            <InputError className="mt-1 text-sm" message={errors.date_cloture} />
          </div>
        </div>

        {/* Est Active */}
        <div>
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-200">
            Est Active
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="est_active"
              checked={data.est_active}
              onChange={(e) => setData('est_active', e.target.checked)}
              className="sr-only"
            />
            <label htmlFor="est_active" className="relative cursor-pointer">
              <div className={`w-12 h-6 rounded-full transition-colors duration-300 
                ${data.est_active ? 'bg-blue-600' : 'bg-gray-400'} 
                dark:${data.est_active ? 'bg-blue-500' : 'bg-gray-600'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300
                  transform ${data.est_active ? 'translate-x-6' : ''}`}>
                </div>
              </div>
            </label>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {data.est_active ? 'Oui' : 'Non'}
            </span>
          </div>
          <InputError className="mt-1 text-sm" message={errors.est_active} />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
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
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591..."
                  fill="#E5E7EB"
                />
                <path
                  d="M93.9676 39.0409C96.393 ..."
                  fill="currentColor"
                />
              </svg>
            )}
            <FaPlus className="mr-2" />
            Ajouter Année Universitaire
          </button>
        </div>
      </div>
    </form>
  );
}

export default FormAjouter;
