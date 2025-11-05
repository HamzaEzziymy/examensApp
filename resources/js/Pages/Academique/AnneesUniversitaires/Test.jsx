import React, { useState } from "react";
import { ChevronRight, ChevronDown, Database } from "lucide-react";

const fakeData = [
  {
    id_annee: 1,
    annee_univ: "2024-2025",
    date_debut: "2024-09-01",
    date_cloture: "2025-07-31",
    est_active: true,
    filieres: [
      {
        id_filiere: 1,
        nom_filiere: "Informatique Décisionnelle",
        code_filiere: 101,
        niveaux: [
          {
            id_niveau: 1,
            code_niveau: "L1",
            nom_niveau: "Licence 1",
            semestre: 1,
            credits_requis: 60,
            semestres: [
              {
                id_semestre: 1,
                code_semestre: "S1",
                nom_semestre: "Semestre 1",
                modules: [
                  {
                    id_module: 1,
                    code_module: "INF101",
                    nom_module: "Introduction à l’informatique",
                    abreviation_module: "Intro Info",
                    nature: "Fondamentale",
                    quadrimestre: 1,
                    coefficient_module: 3.0,
                    elements: [
                      {
                        id_element: 1,
                        nom_element: "Cours",
                        type_element: "COURS",
                        coefficient_element: 1.5,
                      },
                      {
                        id_element: 2,
                        nom_element: "Travaux Dirigés",
                        type_element: "TD",
                        coefficient_element: 1.5,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

const TreeNode = ({ label, children }) => {
  const [open, setOpen] = useState(false);
  const hasChildren = children && children.length > 0;

  return (
    <div className="ml-4 border-l border-gray-400 pl-3">
      <div
        className="flex items-center gap-2 cursor-pointer hover:text-blue-500"
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )
        ) : (
          <div className="w-4" />
        )}
        <span>{label}</span>
      </div>
      {open && <div className="ml-4">{children}</div>}
    </div>
  );
};

export default function Test() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-200 p-8">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-6">
        <div className="flex items-center mb-4">
          <Database className="text-blue-500 mr-2" />
          <h1 className="text-2xl font-bold">University Database Structure</h1>
        </div>

        {fakeData.map((annee) => (
          <TreeNode
            key={annee.id_annee}
            label={`Année Universitaire: ${annee.annee_univ}`}
          >
            {annee.filieres.map((filiere) => (
              <TreeNode
                key={filiere.id_filiere}
                label={`Filière: ${filiere.nom_filiere} (Code: ${filiere.code_filiere})`}
              >
                {filiere.niveaux.map((niveau) => (
                  <TreeNode
                    key={niveau.id_niveau}
                    label={`Niveau: ${niveau.nom_niveau} (${niveau.code_niveau})`}
                  >
                    {niveau.semestres.map((semestre) => (
                      <TreeNode
                        key={semestre.id_semestre}
                        label={`Semestre: ${semestre.nom_semestre}`}
                      >
                        {semestre.modules.map((module) => (
                          <TreeNode
                            key={module.id_module}
                            label={`Module: ${module.nom_module} (${module.code_module})`}
                          >
                            {module.elements.map((el) => (
                              <TreeNode
                                key={el.id_element}
                                label={`Élément: ${el.nom_element} [${el.type_element}] (Coef: ${el.coefficient_element})`}
                              />
                            ))}
                          </TreeNode>
                        ))}
                      </TreeNode>
                    ))}
                  </TreeNode>
                ))}
              </TreeNode>
            ))}
          </TreeNode>
        ))}
      </div>
    </div>
  );
}
