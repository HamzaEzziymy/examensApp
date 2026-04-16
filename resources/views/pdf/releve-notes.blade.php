<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@700;900&display=swap" rel="stylesheet">
<style>
    @page {
        margin: 0.3mm;
        size: A4 portrait;
    }
    
    * { 
        margin: 0; 
        padding: 0; 
        box-sizing: border-box; 
    }
    
    body {
        font-family: "Arial Black", "Arial Bold", "Arial", sans-serif;
        font-size: 12px;
        font-weight: 900;
        color: #000;
        line-height: 1.2;
        background: #fff;
        padding: 5mm;
        text-shadow: 0.3px 0.3px 0px #000;
    }

    /* ── Header Section ── */
    .header-top {
        width: 100%;
        text-align: center;
        margin: 0 auto 6px auto;
    }
    
    .university-logo {
        max-height: 35px;
        display: block;
        margin: 0 auto;
    }

    /* ── Title Section ── */
    .title-main {
        text-align: center;
        font-size: 26px;
        font-weight: 900;
        margin: 5px 0 3px 0;
        letter-spacing: 0.5px;
        text-shadow: 0.5px 0.5px 0px #000;
    }
    
    .session-info {
        text-align: center;
        font-size: 16px;
        font-weight: 900;
        margin-bottom: 3px;
        text-shadow: 0.4px 0.4px 0px #000;
    }
    
    .year-info {
        text-align: center;
        font-size: 16px;
        font-weight: 900;
        margin-bottom: 5px;
        text-shadow: 0.4px 0.4px 0px #000;
    }

    /* ── Module Section ── */
    .module-info {
        text-align: center;
        font-size: 16px;
        font-weight: 900;
        margin-bottom: 4px;
        text-shadow: 0.4px 0.4px 0px #000;
    }
    
    .element-header {
        background-color: #d4e9f7;
        text-align: center;
        font-size: 15px;
        font-weight: 900;
        padding: 5px 0;
        margin-bottom: 5px;
        border: 1px solid #999;
        text-shadow: 0.4px 0.4px 0px #000;
    }

    /* ── Tables Layout ── */
    .tables-container {
        display: table;
        width: 100%;
        margin-bottom: 12px;
    }
    
    .table-column {
        display: table-cell;
        width: 50%;
        vertical-align: top;
        padding-right: 5px;
    }
    
    .table-column:last-child {
        padding-right: 0;
        padding-left: 5px;
    }

    /* ── Notes Table ── */
    .notes-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        font-weight: 500;
    }
    
    .notes-table thead th {
        background-color: #e8e8e8;
        color: #000;
        border: 1px solid #000;
        padding: 6px 8px;
        text-align: center;
        font-weight: 900;
        font-size: 12px;
        text-transform: uppercase;
        text-shadow: 0.3px 0.3px 0px #000;
    }
    
    .notes-table tbody td {
        border: 1px solid #000;
        padding: 5px 8px;
        vertical-align: middle;
        background-color: #fff;
        line-height: 1.3;
        font-weight: 500;
        text-transform: uppercase;
        text-shadow: 0.3px 0.3px 0px #000;
    }
    
    .col-cne {
        width: 23%;
        font-size: 12px;
        text-align: left;
        font-weight: bold;
    }
    
    .col-name {
        width: 62%;
        font-size: 12px;
        text-transform: uppercase;
        text-align: left;
        font-weight: bold;
    }
    
    .col-grade {
        width: 15%;
        text-align: center;
        font-weight: 900;
        font-size: 12px;
    }
    
    .grade-abs {
        color: #c00;
        font-weight: 900;
    }

    /* ── Footer Section ── */
    .footer-container {
        position: fixed;
        bottom: 5mm;
        left: 5mm;
        right: 5mm;
        page-break-inside: avoid;
    }
    
    .signature-footer-box {
        border: 1.5px solid #000;
        width: 280px;
        min-height: 80px;
        margin: 0 auto 6px auto;
        padding: 0;
        background-color: #fff;
    }
    
    .signature-footer-box legend {
        font-size: 12px;
        font-weight: 900;
        padding: 0 8px;
        margin-left: 8px;
        text-shadow: 0.3px 0.3px 0px #000;
    }
    
    .student-count {
        text-align: right;
        font-size: 12px;
        font-weight: 900;
        margin-bottom: 5px;
        text-shadow: 0.3px 0.3px 0px #000;
    }
    
    .footer-bottom {
        display: table;
        width: 100%;
        margin-top: 6px;
    }
    
    .footer-left {
        display: table-cell;
        width: 33.33%;
        font-size: 10px;
        font-weight: 900;
        vertical-align: bottom;
        text-shadow: 0.3px 0.3px 0px #000;
    }
    
    .footer-center {
        display: table-cell;
        width: 33.33%;
        text-align: center;
        font-size: 10px;
        font-weight: 900;
        vertical-align: bottom;
        text-shadow: 0.3px 0.3px 0px #000;
    }
    
    .footer-right {
        display: table-cell;
        width: 33.33%;
        text-align: right;
        font-size: 10px;
        font-weight: 900;
        vertical-align: bottom;
        text-shadow: 0.3px 0.3px 0px #000;
    }

    /* ── Page Break Control ── */
    .page-content {
        margin-bottom: 110px;
    }

    /* ── Print Optimization ── */
    @media print {
        .element-header, .notes-table thead th {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
    }
</style>
</head>
<body>

{{-- ══ LOGO CENTERED ══ --}}
<div class="header-top">
    @if($faculte && $faculte->entete)
        @php $logoPath = storage_path('app/public/' . $faculte->entete); @endphp
        @if(file_exists($logoPath))
            <img src="{{ $logoPath }}" class="university-logo" alt="Logo">
        @endif
    @endif
</div>

{{-- ══ TITLE SECTION ══ --}}
<div class="title-main">RELEVÉ DE NOTES</div>
<div class="session-info">
    {{ $session }} - {{ $semestre }} // {{ $annee }}
</div>
<div class="year-info">
    {{ $niveau ? $niveau . ' - ' : '' }}{{ $filiere }}
</div>

{{-- ══ MODULE SECTION ══ --}}
<div class="module-info">
    Module : {{ $module->nom_module }}
</div>

{{-- ══ ELEMENT SECTION ══ --}}
@if($element)
<div class="element-header">
    Élément : {{ $element->nom_element }}
</div>
@else
<div class="element-header">
    Élément : {{ $module->nom_module }}
</div>
@endif

{{-- ══ NOTES TABLES ══ --}}
@php
    $notesArr = collect($notes);
    $total = $notesArr->count();
    
    // Get note_sur from first note (all notes should have same note_sur)
    $noteSur = $notesArr->isNotEmpty() ? ($notesArr->first()['note_sur'] ?? 20) : 20;
    
    // Split into pages of 60 students (30 per column)
    $studentsPerPage = 50;
    $studentsPerColumn = 25;
    $pages = $notesArr->chunk($studentsPerPage);
@endphp

<div class="page-content">
@foreach($pages as $pageIndex => $pageNotes)
    @if($pageIndex > 0)
        <div style="page-break-before: always;"></div>
        
        {{-- Repeat header for new page --}}
        <div class="header-top">
            @if($faculte && $faculte->entete)
                @php $logoPath = storage_path('app/public/' . $faculte->entete); @endphp
                @if(file_exists($logoPath))
                    <img src="{{ $logoPath }}" class="university-logo" alt="Logo">
                @endif
            @endif
        </div>

        <div class="title-main">RELEVÉ DE NOTES</div>
        <div class="session-info">
            {{ $session }} - {{ $semestre }} // {{ $annee }}
        </div>
        <div class="year-info">
            {{ $niveau ? $niveau . ' - ' : '' }}{{ $filiere }}
        </div>

        <div class="module-info">
            Module : {{ $module->nom_module }}
        </div>

        @if($element)
        <div class="element-header">
            Élément : {{ $element->nom_element }}
        </div>
        @else
        <div class="element-header">
            Élément : {{ $module->nom_module }}
        </div>
        @endif
    @endif

    @php
        $leftCol = $pageNotes->take($studentsPerColumn)->values();
        $rightCol = $pageNotes->slice($studentsPerColumn)->values();
        $startIndex = $pageIndex * $studentsPerPage;
    @endphp

    <div class="tables-container">
        {{-- LEFT TABLE --}}
        <div class="table-column">
            <table class="notes-table">
                <thead>
                    <tr>
                        <th class="col-cne">CNE/C.MASSAR</th>
                        <th class="col-name">Nom et Prénom</th>
                        <th class="col-grade">/ {{ $noteSur }}</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($leftCol as $index => $note)
                    <tr>
                        <td class="col-cne">{{ $note['cne'] }}</td>
                        <td class="col-name">
                            {{ strtoupper($note['nom']) }} {{ strtoupper($note['prenom']) }}
                        </td>
                        <td class="col-grade">
                            @if(strtoupper($note['note']) === 'ABS')
                                <span class="grade-abs">ABS</span>
                            @elseif(strtoupper($note['note']) === 'CAP')
                                <span>CAP</span>
                            @else
                                {{ number_format((float)$note['note'], 2, ',', '') }}
                            @endif
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        {{-- RIGHT TABLE --}}
        <div class="table-column">
            <table class="notes-table">
                <thead>
                    <tr>
                        <th class="col-cne">CNE/C.MASSAR</th>
                        <th class="col-name">Nom et Prénom</th>
                        <th class="col-grade">/ {{ $noteSur }}</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($rightCol as $index => $note)
                    <tr>
                        <td class="col-cne">{{ $note['cne'] }}</td>
                        <td class="col-name">
                            {{ strtoupper($note['nom']) }} {{ strtoupper($note['prenom']) }}
                        </td>
                        <td class="col-grade">
                            @if(strtoupper($note['note']) === 'ABS')
                                <span class="grade-abs">ABS</span>
                            @elseif(strtoupper($note['note']) === 'CAP')
                                <span>CAP</span>
                            @else
                                {{ number_format((float)$note['note'], 2, ',', '') }}
                            @endif
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
@endforeach
</div>

{{-- ══ FOOTER SECTION (FIXED AT BOTTOM OF EACH PAGE) ══ --}}
<div class="footer-container">
    <fieldset class="signature-footer-box">
        <legend>Cachet et Signature du Correcteur :</legend>
    </fieldset>
    
    <div class="student-count">
        Nombre des Etudiants : {{ $total }}
    </div>
    
    <div class="footer-bottom">
        <div class="footer-left">
            {{ now()->format('d/m/Y H:i:s') }}
        </div>
        <div class="footer-center"></div>
        <div class="footer-right"></div>
    </div>
</div>

@php $totalPages = ceil($total / 60); @endphp

<script type="text/php">
if (isset($pdf)) {
    $font = $fontMetrics->getFont("Arial", "bold");
    $size = 10;
    $text = $PAGE_NUM . " sur " . {!! $totalPages !!};
    $textWidth = $fontMetrics->getTextWidth($text, $font, $size);
    $x = ($pdf->get_width() - $textWidth) / 2;
    $y = $pdf->get_height() - 15;
    $pdf->text($x, $y, $text, $font, $size, array(0, 0, 0));
}
</script>

</body>
</html>
