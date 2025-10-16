<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\LaravelPdf\Facades\Pdf;
class DocumentController extends Controller
{
    // Custom method to display "proces-verbal" documents
    public function indexPv()
    {
        $documents = [
            [
                'id' => 1,
                'nomDoc' => 'Procès-verbal de réunion - Projet A',
                'descripDoc' => 'Compte rendu de la réunion du 15 octobre 2025 pour le Projet A.',
                'url' => '/docs/proces-verbal-projet-a.pdf',
            ],
            [
                'id' => 2,
                'nomDoc' => 'Procès-verbal de réunion - Projet B',
                'descripDoc' => 'Compte rendu de la réunion du 20 octobre 2025 pour le Projet B.',
                'url' => '/docs/proces-verbal-projet-b.pdf',
            ],
            [
                'id' => 3,
                'nomDoc' => 'Procès-verbal de réunion - Projet C',
                'descripDoc' => 'Compte rendu de la réunion du 25 octobre 2025 pour le Projet C.',
                'url' => '/docs/proces-verbal-projet-c.pdf',
            ],
        ];
        // dd( $documents);

        return Inertia::render('Documents/Pvs/Index', [
            'documents' => $documents,
        ]);
    }

    public function storePv(Request $request)
    {
        Pdf::view('pdfs.pv_absence', ['data' => $request->all()])
            ->format('a4')
            ->save('aanvoice.pdf');
            
        dd($request->all());
        // Validate the incoming request data
        // $validated = $request->validate([
        //     'nomDoc' => 'required|string|max:255',
        //     'descripDoc' => 'nullable|string',
        //     'url' => 'required|url|max:255',
        // ]);

        // // Create a new Document record
        // Document::create($validated);

        // // Redirect back with a success message
        // return redirect()->route('proces-v')->with('success', 'Document created successfully.');
    }
}
