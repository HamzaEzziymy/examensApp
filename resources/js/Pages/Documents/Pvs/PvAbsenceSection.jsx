import React from 'react';
import CreateForm from './CreateForm';
import DisplayDocuments from './DisplayDocuments';

export default function PvAbsenceSection({
    documents = [],
    formProps = {},
    formKey = 'pv-absence-form',
    className = '',
}) {
    return (
        <div className={`flex flex-col gap-4 lg:flex-row lg:gap-6 ${className}`.trim()}>
            <CreateForm key={formKey} {...formProps} />
            <DisplayDocuments documents={documents} />
        </div>
    );
}
