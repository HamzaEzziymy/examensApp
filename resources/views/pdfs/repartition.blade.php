<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Repartition - {{ $displayLabel ?? ($examLabel ?? ($examen->module->nom_module ?? 'Examen')) }}</title>
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
        .section-row td { background: #cfe2f3 !important; font-weight: bold; text-align: center; }
    </style>
</head>
<body>
    @php
        $columnDefinitions = [
            'cne' => 'CNE',
            'etudiant' => 'Etudiant',
            'nom' => 'Nom',
            'prenom' => 'Prenom',
            'grille' => 'Grille',
            'place' => 'Place',
            'anonymat' => 'Anonymat',
            'presence' => 'Presence',
        ];
        $columns = collect($columns ?? array_keys($columnDefinitions))
            ->map(fn ($column) => (string) $column)
            ->filter(fn ($column) => array_key_exists($column, $columnDefinitions))
            ->values();
        if ($columns->isEmpty()) {
            $columns = collect(array_keys($columnDefinitions));
        }
        $presenceFilled = $presenceFilled ?? true;
        $sessionLabel = $sessionLabel ?? ($examen->sessionExamen->nom_session ?? '-');
        $displayLabel = $displayLabel ?? ($elementLabel ?? $moduleLabel ?? ($examen->module->nom_module ?? '-'));
        $columnCount = $columns->count();
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
        @php
            $groupRows = collect($group['rows'] ?? []);
            $normalRows = $groupRows
                ->reject(fn ($rep) => strtolower((string) ($rep->inscriptionPedagogique->type_inscription ?? '')) === 'credit')
                ->values();
            $creditRows = $groupRows
                ->filter(fn ($rep) => strtolower((string) ($rep->inscriptionPedagogique->type_inscription ?? '')) === 'credit')
                ->values();
        @endphp
        <div class="container" style="{{ $groupIndex > 0 ? 'page-break-before: always;' : '' }}">
            <img src="{{ public_path('/logo.png') }}" alt="Logo" style="top: 10px; left: 20px; width: 100%; height: 55px;">
            <div class="date-service" style="margin-top: 6px; width: 100%; display: flex; justify-content: space-between;">
                <div class="header">{{ $sessionLabel }}</div>
                <div class="date">Fes le : {{ $generatedAt->format('d/m/Y') }}</div>
            </div>

            <h1>REPARTITION</h1>
            <h2>{{ $niveauFiliere ?: ($examLabel ?? ($examen->module->nom_module ?? 'Module')) }}</h2>

            <table class="info-table">
                <tr>
                    <td class="label">Session</td>
                    <td class="value">{{ $sessionLabel }}</td>
                    <td class="label">Salle</td>
                    <td class="value">{{ $group['salle']->nom_salle ?? ('Salle '.$group['salle_index']) }}</td>
                </tr>
                <tr>
                    <td class="label">Examen</td>
                    <td class="value">{{ $displayLabel }}</td>
                    <td class="label">Date</td>
                    <td class="value">{{ optional($examen->date_examen)->format('d/m/Y') ?? '-' }}</td>
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
                        @foreach($columns as $column)
                            <th>{{ $columnDefinitions[$column] }}</th>
                        @endforeach
                    </tr>
                </thead>
                <tbody>
                    @foreach($normalRows as $rep)
                        <tr>
                            @foreach($columns as $column)
                                @switch($column)
                                    @case('cne')
                                        <td>{{ $rep->inscriptionPedagogique->etudiant->cne ?? '-' }}</td>
                                        @break
                                    @case('etudiant')
                                        <td>{{ $rep->inscriptionPedagogique->etudiant->nom ?? '' }} {{ $rep->inscriptionPedagogique->etudiant->prenom ?? '' }}</td>
                                        @break
                                    @case('nom')
                                        <td>{{ $rep->inscriptionPedagogique->etudiant->nom ?? '' }}</td>
                                        @break
                                    @case('prenom')
                                        <td>{{ $rep->inscriptionPedagogique->etudiant->prenom ?? '' }}</td>
                                        @break
                                    @case('grille')
                                        <td class="text-center">{{ $rep->code_grille ?? '-' }}</td>
                                        @break
                                    @case('place')
                                        <td class="text-center">{{ $rep->numero_place ?? '-' }}</td>
                                        @break
                                    @case('anonymat')
                                        <td class="text-center">{{ $rep->code_anonymat ?? '-' }}</td>
                                        @break
                                    @case('presence')
                                        <td class="text-center">{{ $presenceFilled ? ($rep->present ? 'Present' : 'Absent') : '' }}</td>
                                        @break
                                @endswitch
                            @endforeach
                        </tr>
                    @endforeach
                    @if($creditRows->isNotEmpty())
                        <tr class="section-row">
                            <td colspan="{{ $columnCount }}">Etudiants en credit</td>
                        </tr>
                        @foreach($creditRows as $rep)
                            <tr>
                                @foreach($columns as $column)
                                    @switch($column)
                                        @case('cne')
                                            <td>{{ $rep->inscriptionPedagogique->etudiant->cne ?? '-' }}</td>
                                            @break
                                        @case('etudiant')
                                            <td>{{ $rep->inscriptionPedagogique->etudiant->nom ?? '' }} {{ $rep->inscriptionPedagogique->etudiant->prenom ?? '' }}</td>
                                            @break
                                        @case('nom')
                                            <td>{{ $rep->inscriptionPedagogique->etudiant->nom ?? '' }}</td>
                                            @break
                                        @case('prenom')
                                            <td>{{ $rep->inscriptionPedagogique->etudiant->prenom ?? '' }}</td>
                                            @break
                                        @case('grille')
                                            <td class="text-center">{{ $rep->code_grille ?? '-' }}</td>
                                            @break
                                        @case('place')
                                            <td class="text-center">{{ $rep->numero_place ?? '-' }}</td>
                                            @break
                                        @case('anonymat')
                                            <td class="text-center">{{ $rep->code_anonymat ?? '-' }}</td>
                                            @break
                                        @case('presence')
                                            <td class="text-center">{{ $presenceFilled ? ($rep->present ? 'Present' : 'Absent') : '' }}</td>
                                            @break
                                    @endswitch
                                @endforeach
                            </tr>
                        @endforeach
                    @endif
                </tbody>
            </table>

            <div style="width: 100%; text-align: right; font-size: 11px; margin-top: 4px;">
                Genere le {{ $generatedAt->format('d/m/Y H:i') }}
            </div>
        </div>
    @endforeach
</body>
</html>
