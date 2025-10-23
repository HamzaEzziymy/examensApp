export default function ApplicationLogo(props) {
    const src="icon.png";
    return (
        <div  {...props}>
            <img src={`/${src}`} alt="Logo" className="h-14 w-auto" />
        </div>
    );
}
