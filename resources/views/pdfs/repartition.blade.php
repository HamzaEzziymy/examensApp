<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Repartition - {{ $examen->module->code_module ?? 'Examen' }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; padding-bottom: 50px; counter-reset: page; }
        .container { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; }
        .header { text-align: right; font-size: 11px; margin-bottom: 5px; color: #666; }
        .date { font-size: 12px; font-weight: bold; }
        h1 { text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 5px; letter-spacing: 2px; }
        h2 { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 15px; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .info-table td { border: 2px solid #000; padding: 8px; font-size: 13px; }
        .info-table .label { font-weight: bold; width: 20%; }
        .info-table .value { text-transform: uppercase; font-weight: 800; text-align: center; font-size: 16px; }
        .counts { width: 100%; display: flex; gap: 12px; margin-bottom: 10px; }
        .count-box { flex: 1; border: 2px solid #000; padding: 8px; text-align: center; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; text-align: left; }
        th { background: #FFD966; text-align: center; }
        tbody tr:nth-child(odd) { background: #d6d6d6; }
        .text-center { text-align: center; }
        .page-break { page-break-before: always; }

        @page {
            margin: 40px 10px 50px 20px;
            counter-increment: page;
        }
        .footer {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 10px;
            text-align: center;
            font-size: 10px;
            color: #333;
        }
        .footer .pagenum:before { content: counter(page+1); }
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
        <div class="container" style="padding-right: 30px; {{ $groupIndex > 0 ? 'page-break-before: always;' : '' }}">
            <img src="{{ public_path('/logo.png') }}" alt="Logo" style="top: 20px; left: 20px; width: 100%; height: 70px;">
            <div class="date-service" style="margin-top: 10px; width: 100%; display: flex; justify-content: space-between;">
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
                    <td class="value">{{ $group['salle']->nom_salle ?? ('#'.$group['salle_index']) }}</td>
                </tr>
                <tr>
                    <td class="label">Date</td>
                    <td class="value">{{ optional($examen->date_examen)->format('d/m/Y') ?? '-' }}</td>
                    <td class="label">Horaire</td>
                    <td class="value">{{ optional($examen->date_debut)->format('H:i') ?? '-' }} - {{ optional($examen->date_fin)->format('H:i') ?? '-' }}</td>
                </tr>
            </table>

            <div class="counts">
                <div class="count-box">Total: {{ $group['total'] }}</div>
                <div class="count-box">Presents: {{ $group['present'] }}</div>
                <div class="count-box">Absents: {{ $group['absent'] }}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>#</th>
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

            <div style="width: 100%; text-align: right; font-size: 11px; margin-top: 5px;">
                Genere le {{ $generatedAt->format('d/m/Y H:i') }}
            </div>
        </div>
    @endforeach

    <div class="footer">
        Page <span class="pagenum"></span>
    </div>
</body>
</html>
