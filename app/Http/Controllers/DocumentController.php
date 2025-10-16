<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\LaravelPdf\Facades\Pdf;
class DocumentController extends Controller
{
    public function indexPv()
    {
        // fetch dis by date desc created_at

        $documents = Document::orderBy('created_at', 'desc')->get();

        return Inertia::render('Documents/Pvs/Index', [
            'documents' => $documents,
        ]);
    }

    public function storePv(Request $request)
    {
        // date know with a second format
        $now = now()->format('Y-m-d_H-i-s');
        // dd($now);
        Pdf::view('pdfs.pv_absence', ['data' => $request->all()])
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
