<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Repartition - {{ $examen->module->code_module ?? 'Examen' }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Roboto", Arial, sans-serif; padding: 0; }
        .container { width: 100%; max-width: none; margin: 0; display: flex; flex-direction: column; align-items: stretch; padding: 8px 12px 12px; }
        .header { text-align: right; font-size: 10px; margin-bottom: 2px; color: #666; }
        .date { font-size: 11px; font-weight: bold; }
        h1 { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 4px; letter-spacing: 1px; }
        h2 { text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 8px; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .info-table td { border: 2px solid #000; padding: 6px; font-size: 12px; }
        .info-table .label { font-weight: bold; width: 20%; }
        .info-table .value { text-transform: uppercase; font-weight: 800; text-align: center; font-size: 14px; }
        .counts { width: 100%; display: flex; gap: 8px; margin-bottom: 8px; }
        .count-box { flex: 1; border: 2px solid #000; padding: 6px; text-align: center; font-size: 11px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px 6px; font-size: 11px; text-align: left; }
        th { background: #FFD966; text-align: center; }
        tbody tr:nth-child(odd) { background: #e5e5e5; }
        .text-center { text-align: center; }
        .student-cell { display: flex; align-items: baseline; gap: 6px; }
        .student-name { font-size: 11px; line-height: 1.2; font-family: Arial, Helvetica, sans-serif; font-weight: bold; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .student-cne { font-size: 9px; color: #444; line-height: 1.1; font-weight: bold; flex: 0 0 auto; }
        .cap { background: #d9d9d9; font-weight: bold; }
    </style>
</head>
<body>
    @php
        $columns = $columns ?? ['cne', 'etudiant', 'grille', 'place', 'anonymat', 'presence'];
        $showCne = in_array('cne', $columns);
        $showEtudiant = in_array('etudiant', $columns);
        $showGrille = in_array('grille', $columns);
        $showPlace = in_array('place', $columns);
        $showAnonymat = in_array('anonymat', $columns);
        $showPresence = in_array('presence', $columns);
        $presenceFilled = $presenceFilled ?? true;
        $groups = $salleGroups ?? collect([[
            'salle' => $examen->salle,
            'rows' => $repartitions,
            'present' => $presentCount,
            'absent' => $absentCount,
            'total' => $total,
            'salle_index' => 1,
        ]]);
    @endphp

    @foreach($groups as $groupIndex => $group)
        <div class="container" style="{{ $groupIndex > 0 ? 'page-break-before: always;' : '' }}">
            <img src="{{ public_path('/logo.png') }}" alt="Logo" style="top: 10px; left: 20px; width: 100%; height: 55px;">
            <div class="date-service" style="margin-top: 6px; width: 100%; display: flex; justify-content: space-between;">
                <div class="header">{{ $examen->sessionExamen->nom_session ?? '-' }}</div>
                <div class="date">Fes le : {{ $generatedAt->format('d/m/Y') }}</div>
            </div>

            <h1>REPARTITION</h1>
            <h2>{{ $niveauFiliere ?: ($examen->module->nom_module ?? 'Module') }}</h2>

            <table class="info-table">
                <tr>
                    <td class="label">Module</td>
                    <td class="value">{{ $examen->module->nom_module ?? '-' }}</td>
                    <td class="label">Salle</td>
                    <td class="value">{{ $group['salle']->nom_salle ?? ('nb place'.$group['salle_index']) }}</td>
                </tr>
                <tr>
                    <td class="label">Date</td>
                    <td class="value">{{ optional($examen->date_examen)->format('d/m/Y') ?? '-' }}</td>
                    <!-- <td class="label">Horaire</td> --><td></td>
                    <td></td><!-- <td class="value">{{ optional($examen->date_debut)->format('H:i') ?? '-' }} - {{ optional($examen->date_fin)->format('H:i') ?? '-' }}</td> -->
                </tr>
            </table>

            <div class="counts">
                <div class="count-box">Total: {{ $group['total'] }}</div>
                @if($presenceFilled)
                    <div class="count-box">Presents: {{ $group['present'] }}</div>
                    <div class="count-box">Absents: {{ $group['absent'] }}</div>
                @endif
            </div>

            <table>
                <thead>
                    <tr>
                        <th>N de place</th>
                        @if($showCne)
                            <th>CNE</th>
                        @endif
                        @if($showEtudiant)
                            <th>Etudiant</th>
                        @endif
                        @if($showGrille)
                            <th>Grille</th>
                        @endif
                        @if($showPlace)
                            <th>Place</th>
                        @endif
                        @if($showAnonymat)
                            <th>Anonymat</th>
                        @endif
                        @if($showPresence)
                            <th>Presence</th>
                        @endif
                    </tr>
                </thead>
                <tbody>
                    @foreach($group['rows'] as $index => $rep)
                        <tr>
                            <td class="text-center">{{ $index + 1 }}</td>
                            @if($showCne)
                                <td>{{ $rep->inscriptionPedagogique->etudiant->cne ?? '-' }}</td>
                            @endif
                            @if($showEtudiant)
                                <td>{{ $rep->inscriptionPedagogique->etudiant->nom ?? '' }} {{ $rep->inscriptionPedagogique->etudiant->prenom ?? '' }}</td>
                            @endif
                            @if($showGrille)
                                <td class="text-center">{{ $rep->code_grille ?? '-' }}</td>
                            @endif
                            @if($showPlace)
                                <td class="text-center">{{ $rep->numero_place ?? '-' }}</td>
                            @endif
                            @if($showAnonymat)
                                <td class="text-center">{{ $rep->code_anonymat ?? '-' }}</td>
                            @endif
                            @if($showPresence)
                                <td class="text-center">{{ $presenceFilled ? ($rep->present ? 'Present' : 'Absent') : '' }}</td>
                            @endif
                        </tr>
                    @endforeach
                </tbody>
            </table>

            <div style="width: 100%; text-align: right; font-size: 11px; margin-top: 4px;">
                Genere le {{ $generatedAt->format('d/m/Y H:i') }}
            </div>
        </div>
    @endforeach
</body>
</html>
