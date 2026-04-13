<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    @page { margin: 8mm; size: A4 portrait; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }

    .header-top { text-align: center; margin-bottom: 6px; }
    .university-logo { max-height: 40px; display: block; margin: 0 auto; }
    .title-main { text-align: center; font-size: 20px; font-weight: 900; margin: 6px 0 2px; letter-spacing: 0.5px; }
    .subtitle { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 2px; }
    .module-bar { background: #d4e9f7; border: 1px solid #999; text-align: center; font-size: 13px; font-weight: 900; padding: 4px 0; margin: 6px 0 8px; }

    .notes-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .notes-table thead th { background: #e8e8e8; border: 1px solid #000; padding: 4px 5px; font-weight: 900; font-size: 10px; text-align: center; }
    .notes-table tbody td { border: 1px solid #000; padding: 3px 5px; vertical-align: middle; }
    .notes-table tbody tr:nth-child(even) td { background: #f9f9f9; }

    .col-num      { width: 4%;  text-align: center; }
    .col-anonymat { width: 8%;  text-align: center; }
    .col-cne      { width: 16%; font-size: 9px; }
    .col-nom      { width: 20%; font-weight: bold; text-transform: uppercase; }
    .col-prenom   { width: 16%; text-transform: uppercase; }
    .col-note     { width: 8%;  text-align: center; font-weight: 900; }
    .col-mention  { width: 10%; text-align: center; }
    .col-enseignant { width: 18%; font-size: 9px; }

    .grade-abs { color: #c00; font-weight: 900; }
    .grade-cap { color: #609; font-weight: 900; }

    .footer-fixed { position: fixed; bottom: 5mm; left: 8mm; right: 8mm; }
    .sig-box { border: 1.5px solid #000; width: 260px; min-height: 70px; margin: 0 auto 5px; }
    .sig-box legend { font-size: 11px; font-weight: bold; padding: 0 6px; margin-left: 6px; }
    .footer-row { display: table; width: 100%; font-size: 9px; }
    .footer-cell { display: table-cell; width: 33.33%; vertical-align: bottom; }
    .footer-cell.center { text-align: center; }
    .footer-cell.right  { text-align: right; }
    .page-content { margin-bottom: 100px; }
</style>
</head>
<body>

@php
    $showNum       = in_array('num',        $columns);
    $showAnonymat  = in_array('anonymat',   $columns);
    $showCne       = in_array('cne',        $columns);
    $showNom       = in_array('nom',        $columns);
    $showPrenom    = in_array('prenom',     $columns);
    $showNote      = in_array('note',       $columns);
    $showMention   = in_array('mention',    $columns);
    $showEnseignant= in_array('enseignant', $columns);

    $notesArr = collect($notes);
    $total    = $notesArr->count();
    $noteSur  = $notesArr->isNotEmpty() ? ($notesArr->first()['note_sur'] ?? 20) : 20;

    function getMentionLabel($note, $noteSur) {
        if (strtoupper($note) === 'ABS') return 'Absent';
        if (strtoupper($note) === 'CAP') return 'Capitalisé';
        $n = (float)$note;
        $base = $noteSur ? ($n / $noteSur) * 20 : $n;
        if ($base >= 16) return 'Très Bien';
        if ($base >= 14) return 'Bien';
        if ($base >= 12) return 'Assez Bien';
        if ($base >= 10) return 'Passable';
        return 'Insuffisant';
    }

    $studentsPerPage = 40;
    $pages = $notesArr->chunk($studentsPerPage);
@endphp

@foreach($pages as $pageIndex => $pageNotes)
    @if($pageIndex > 0)<div style="page-break-before:always;"></div>@endif

    <div class="header-top">
        @if($faculte && $faculte->entete)
            @php $logoPath = storage_path('app/public/' . $faculte->entete); @endphp
            @if(file_exists($logoPath))
                <img src="{{ $logoPath }}" class="university-logo" alt="Logo">
            @endif
        @endif
    </div>

    <div class="title-main">RELEVÉ DE NOTES</div>
    <div class="subtitle">{{ $session }}{{ $semestre ? ' — ' . $semestre : '' }}{{ $annee ? ' — ' . $annee : '' }}</div>
    <div class="subtitle">{{ $niveau ? $niveau . ' — ' : '' }}{{ $filiere }}</div>

    <div class="module-bar">
        Module : {{ $module->nom_module }}
        @if($element) &nbsp;|&nbsp; Élément : {{ $element->nom_element }} @endif
    </div>

    <div class="page-content">
        <table class="notes-table">
            <thead>
                <tr>
                    @if($showNum)        <th class="col-num">#</th> @endif
                    @if($showAnonymat)   <th class="col-anonymat">Anonymat</th> @endif
                    @if($showCne)        <th class="col-cne">CNE / C.Massar</th> @endif
                    @if($showNom)        <th class="col-nom">Nom</th> @endif
                    @if($showPrenom)     <th class="col-prenom">Prénom</th> @endif
                    @if($showNote)       <th class="col-note">/ {{ $noteSur }}</th> @endif
                    @if($showMention)    <th class="col-mention">Mention</th> @endif
                    @if($showEnseignant) <th class="col-enseignant">Enseignant</th> @endif
                </tr>
            </thead>
            <tbody>
                @foreach($pageNotes->values() as $i => $note)
                <tr>
                    @if($showNum)        <td class="col-num">{{ $pageIndex * $studentsPerPage + $i + 1 }}</td> @endif
                    @if($showAnonymat)   <td class="col-anonymat">{{ $note['anonymat'] }}</td> @endif
                    @if($showCne)        <td class="col-cne">{{ $note['cne'] }}</td> @endif
                    @if($showNom)        <td class="col-nom">{{ strtoupper($note['nom']) }}</td> @endif
                    @if($showPrenom)     <td class="col-prenom">{{ strtoupper($note['prenom']) }}</td> @endif
                    @if($showNote)
                        <td class="col-note">
                            @if(strtoupper($note['note']) === 'ABS') <span class="grade-abs">ABS</span>
                            @elseif(strtoupper($note['note']) === 'CAP') <span class="grade-cap">CAP</span>
                            @else {{ number_format((float)$note['note'], 2, ',', '') }}
                            @endif
                        </td>
                    @endif
                    @if($showMention)    <td class="col-mention">{{ getMentionLabel($note['note'], $note['note_sur']) }}</td> @endif
                    @if($showEnseignant) <td class="col-enseignant">{{ $note['enseignant'] ?? '' }}</td> @endif
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
@endforeach

<div class="footer-fixed">
    <fieldset class="sig-box">
        <legend>Cachet et Signature du Correcteur :</legend>
    </fieldset>
    <div style="text-align:right; font-size:11px; font-weight:bold; margin-bottom:4px;">
        Nombre des Étudiants : {{ $total }}
    </div>
    <div class="footer-row">
        <div class="footer-cell">{{ now()->format('d/m/Y H:i') }}</div>
        <div class="footer-cell center"></div>
        <div class="footer-cell right"></div>
    </div>
</div>

</body>
</html>
