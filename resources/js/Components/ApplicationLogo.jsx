import { usePage } from "@inertiajs/react";

export default function ApplicationLogo(props) {
    const faculte = usePage().props.faculte;
    
    // Handle case when faculte is null (first migration)
    if (!faculte || !faculte.logo) {
        return (
            <div {...props}>
                <div className="h-14 w-14 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">F</span>
                </div>
            </div>
        );
    }
    
    return (
        <div {...props}>
            <img src={`/storage/${faculte.logo}`} alt="Logo" className="h-14 w-auto" />
        </div>
    );
}
