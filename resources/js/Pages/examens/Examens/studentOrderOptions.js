export const studentOrderOptions = [
    {
        value: 'alphabetic',
        label: 'Alphabetique',
        description: 'Ordre stable base sur les inscriptions pedagogiques.',
    },
    {
        value: 'random',
        label: 'Aleatoire',
        description: 'Melange les etudiants avant la repartition tout en gardant les credits a la fin.',
    },
];

export const resolveStudentOrderLabel = (value) =>
    studentOrderOptions.find((option) => option.value === value)?.label ?? studentOrderOptions[0].label;
