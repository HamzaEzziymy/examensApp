import { usePage } from "@inertiajs/react";

export default function ApplicationLogo(props) {
    const faculte = usePage().props.faculte;
    return (
        <div  {...props}>
            <img src={`/storage/${faculte.logo}`} alt="Logo" className="h-14 w-auto" />
        </div>
    );
}
