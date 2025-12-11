<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\LaravelPdf\Facades\Pdf;
use Illuminate\Support\Facades\File;
class DocumentController extends Controller
{
    public function indexPv()
    {
        // fetch documents by date desc created_at
        $documents = Document::orderBy('created_at', 'desc')->get();

        // Fetch real data for the form
        $sessions = \App\Models\SessionExamen::select('id_session_examen', 'nom_session')
            ->orderBy('nom_session')
            ->get();
            
        $niveaux = \App\Models\Niveau::select('id_niveau', 'nom_niveau')
            ->orderBy('nom_niveau')
            ->get();
            
        $salles = \App\Models\Salle::select('id_salle', 'code_salle', 'nom_salle')
            ->where('est_disponible', true)
            ->orderBy('code_salle')
            ->get();
            
        $modules = \App\Models\Module::select('id_module', 'nom_module')
            ->orderBy('nom_module')
            ->get();
            
        $filieres = \App\Models\Filiere::select('id_filiere', 'nom_filiere')
            ->orderBy('nom_filiere')
            ->get();
            
        $sections = \App\Models\Section::select('id_section', 'nom_section', 'id_filiere')
            ->orderBy('nom_section')
            ->get();

        return Inertia::render('Documents/Pvs/Index', [
            'documents' => $documents,
            'sessions' => $sessions,
            'niveaux' => $niveaux,
            'salles' => $salles,
            'modules' => $modules,
            'filieres' => $filieres,
            'sections' => $sections,
        ]);
    }

    public function storePv(Request $request)
    {
        // date know with a second format
        $now = now()->format('Y-m-d_H-i-s');
        // Ensure target directory exists under public/storage for Browsershot write
        $publicStoragePvPath = public_path('storage/pvs_absence');
        if (! File::exists($publicStoragePvPath)) {
            File::makeDirectory($publicStoragePvPath, 0755, true);
        }

        // Prepare data for PDF - convert IDs to names
        $pdfData = $request->all();
        
        // Convert filiere ID to name
        if (!empty($pdfData['filiere'])) {
            $filiere = \App\Models\Filiere::find($pdfData['filiere']);
            $pdfData['filiere'] = $filiere ? $filiere->nom_filiere : '';
        }

        Pdf::view('pdfs.pv_absence', ['data' => $pdfData])
            ->format('a4')
            ->save('storage/pvs_absence/'.$now.'pv_absence.pdf');
        
        
        $docUrl = 'storage/pvs_absence/'.$now.'pv_absence.pdf';

        // set a url request
        $request->merge(['url' => $docUrl]);
        // Validate the incoming request data
        $validated = $request->validate([
            'nomDoc' => 'required|string|max:255',
            'descripDoc' => 'nullable|string',
            'url' => 'required|string|max:255',
        ]);

        // // Create a new Document record
        Document::create($validated);

        // Redirect or return a response
        return Redirect()->back();
    }

    public function destroyPv(Document $document)
    {
        // Delete the document record
        $document->delete();

        // Optionally, delete the associated file from storage
        if (file_exists($document->url)) {
            unlink($document->url);
        }

        // Redirect or return a response
        return Redirect()->back();
    }
}
