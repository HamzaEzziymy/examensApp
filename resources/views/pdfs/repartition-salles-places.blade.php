<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Repartition salles & places - {{ $displayLabel ?? ($examLabel ?? ($examen->module->nom_module ?? 'Examen')) }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Roboto", Arial, sans-serif; padding: 0; color: #000; }
        .page { width: 100%; display: flex; flex-direction: column; gap: 8px; padding: 0 10px 10px; }
        .masthead img { width: 100%; height: 90px; object-fit: contain; }
        h1 { text-align: center; font-size: 16px; font-weight: bold; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
        .meta { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px; }
        .meta td { border: 1px solid #000; padding: 5px; }
        .meta .label { background: #efefef; font-weight: bold; width: 22%; }
        .meta .value { font-weight: bold; text-transform: uppercase; text-align: center; }
        table.list { width: 100%; border-collapse: collapse; margin-top: 6px; }
        table.list th, table.list td { border: 1px solid #000; padding: 3px 5px; font-size: 10.5px; }
        table.list th { background: #d9d9d9; text-align: center; font-weight: bold; }
        table.list td.center { text-align: center; }
        table.list tbody tr:nth-child(odd) { background: #f2f2f2; }
        .student-name { font-size: 11px; }
        .student-cne { font-size: 9px; color: #444; margin-left: 6px; }
        .footer { display: flex; justify-content: space-between; font-size: 10px; margin-top: 6px; }
        .section-row td { background: #cfe2f3 !important; font-weight: bold; text-align: center; }
    </style>
</head>
<body>
    @php
        $groups = collect($groups ?? [[
            'salle' => $examen->salle,
            'rows' => collect($rows ?? []),
            'total' => collect($rows ?? [])->count(),
            'salle_index' => 1,
        ]]);
        $sallesCount = $groups->count();
        $sessionLabel = $sessionLabel ?? ($examen->sessionExamen->nom_session ?? '-');
        $displayLabel = $displayLabel ?? ($elementLabel ?? $moduleLabel ?? ($examen->module->nom_module ?? '-'));
    @endphp

    @foreach($groups as $groupIndex => $group)
        @php
            $groupRows = collect($group['rows'] ?? []);
            $normalRows = $groupRows->reject(fn ($row) => !empty($row['is_credit']))->values();
            $creditRows = $groupRows->filter(fn ($row) => !empty($row['is_credit']))->values();
            $formatPlace = function ($place) {
                $value = trim((string) ($place ?? ''));
                if ($value === '') {
                    return '-';
                }

                if (str_contains($value, '-')) {
                    $parts = explode('-', $value);
                    return trim((string) end($parts)) ?: '-';
                }

                return $value;
            };
        @endphp
        <div class="page" style="{{ $groupIndex > 0 ? 'page-break-before: always;' : '' }}">
            <div class="masthead">
                <img src="{{ public_path('/logo.png') }}" alt="Logo">
            </div>

            <h1>REPARTITION PAR SALLE ET PLACE</h1>

            <table class="meta">
                <tr>
                    <td class="label">Session</td>
                    <td class="value">{{ $sessionLabel }}</td>
                    <td class="label">Date</td>
                    <td class="value">{{ optional($examen->date_examen)->format('d/m/Y') ?? '-' }}</td>
                </tr>
                <tr>
                    <td class="label">Niveau / Filiere</td>
                    <td class="value">{{ $niveauFiliere ?: '-' }}</td>
                    <td class="label">Salle</td>
                    <td class="value">{{ $group['salle']->nom_salle ?? ('Salle '.$group['salle_index']) }}</td>
                </tr>
                <tr>
                    <td class="label">Examen</td>
                    <td class="value" colspan="3">{{ $displayLabel }}</td>
                </tr>
            </table>

            <table class="list">
                <thead>
                    <tr>
                        <th style="width: 20%;">CNE</th>
                        <th style="width: 55%;">Nom et Prenom</th>
                        <th style="width: 25%;">Place</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($normalRows as $row)
                        <tr>
                            <td class="center">{{ $row['cne'] ?? '-' }}</td>
                            <td>
                                <span class="student-name">{{ trim(($row['nom'] ?? '') . ' ' . ($row['prenom'] ?? '')) }}</span>
                            </td>
                            <td class="center">{{ $formatPlace($row['numero_place'] ?? null) }}</td>
                        </tr>
                    @endforeach
                    @if($creditRows->isNotEmpty())
                        <tr class="section-row">
                            <td colspan="3">Etudiants en credit</td>
                        </tr>
                        @foreach($creditRows as $row)
                            <tr>
                                <td class="center">{{ $row['cne'] ?? '-' }}</td>
                                <td>
                                    <span class="student-name">{{ trim(($row['nom'] ?? '') . ' ' . ($row['prenom'] ?? '')) }}</span>
                                </td>
                                <td class="center">{{ $formatPlace($row['numero_place'] ?? null) }}</td>
                            </tr>
                        @endforeach
                    @endif
                </tbody>
            </table>

            <div class="footer">
                <div>Fes ; Le {{ $generatedAt->format('d/m/Y') }}</div>
                <div>Genere le {{ $generatedAt->format('d/m/Y H:i') }}</div>
            </div>
        </div>
    @endforeach
</body>
</html>
