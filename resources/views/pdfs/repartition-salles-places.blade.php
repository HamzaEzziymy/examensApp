<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Repartition salles & places</title>
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
        $rows = collect($rows ?? []);
        $normalRows = $rows->reject(fn ($row) => !empty($row['is_credit']))->values();
        $creditRows = $rows->filter(fn ($row) => !empty($row['is_credit']))->values();
        $sallesCount = $rows->pluck('salle')->unique()->count();
        $sessionName = $examen->sessionExamen->nom_session ?? '-';
    @endphp

    <div class="page">
        <div class="masthead">
            <img src="{{ public_path('/logo.png') }}" alt="Logo">
        </div>

        <h1>REPARTITION PAR SALLE ET PLACE</h1>

        <table class="meta">
            <tr>
                <td class="label">Session</td>
                <td class="value">{{ $sessionName }}</td>
                <td class="label">Date</td>
                <td class="value">{{ optional($examen->date_examen)->format('d/m/Y') ?? '-' }}</td>
            </tr>
            <tr>
                <td class="label">Niveau / Filiere</td>
                <td class="value">{{ $niveauFiliere ?: '-' }}</td>
                <td class="label">Salles</td>
                <td class="value">{{ $sallesCount }}</td>
            </tr>
        </table>

        <table class="list">
            <thead>
                <tr>
                    <th style="width: 8%;">No</th>
                    <th style="width: 47%;">Nom et Prenom</th>
                    <th style="width: 25%;">Salle</th>
                    <th style="width: 20%;">Place</th>
                </tr>
            </thead>
            <tbody>
                @foreach($normalRows as $index => $row)
                    <tr>
                        <td class="center">{{ $index + 1 }}</td>
                        <td>
                            <span class="student-name">{{ trim(($row['nom'] ?? '') . ' ' . ($row['prenom'] ?? '')) }}</span>
                            @if(!empty($row['cne']))
                                <span class="student-cne">({{ $row['cne'] }})</span>
                            @endif
                        </td>
                        <td class="center">{{ $row['salle'] ?? '-' }}</td>
                        <td class="center">{{ $row['numero_place'] ?? '-' }}</td>
                    </tr>
                @endforeach
                @if($creditRows->isNotEmpty())
                    <tr class="section-row">
                        <td colspan="4">Etudiants en credit</td>
                    </tr>
                    @foreach($creditRows as $creditIndex => $row)
                        <tr>
                            <td class="center">{{ $normalRows->count() + $creditIndex + 1 }}</td>
                            <td>
                                <span class="student-name">{{ trim(($row['nom'] ?? '') . ' ' . ($row['prenom'] ?? '')) }}</span>
                                @if(!empty($row['cne']))
                                    <span class="student-cne">({{ $row['cne'] }})</span>
                                @endif
                            </td>
                            <td class="center">{{ $row['salle'] ?? '-' }}</td>
                            <td class="center">{{ $row['numero_place'] ?? '-' }}</td>
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
</body>
</html>
