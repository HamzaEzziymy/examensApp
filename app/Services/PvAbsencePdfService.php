<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Spatie\LaravelPdf\Facades\Pdf;
use Spatie\LaravelPdf\PdfBuilder;

class PvAbsencePdfService
{
    public function make(
        Collection $pages,
        ?string $documentTitle = null,
        ?string $documentDescription = null,
        $generatedAt = null
    ): PdfBuilder {
        return Pdf::view('pdfs.pv_absence', [
            'generatedAt' => $generatedAt ?? now(),
            'documentTitle' => $documentTitle,
            'documentDescription' => $documentDescription,
            'pages' => $pages,
        ])
            ->format('a4')
            ->margins(12, 10, 14, 10)
            ->footerView('pdfs.partials.footer', ['hideFooterMeta' => true]);
    }
}
