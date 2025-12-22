<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Presence collective - {{ $sessionName ?? 'Session' }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 12px 14px 26px; }
        .container { width: 100%; max-width: none; margin: 0; display: flex; flex-direction: column; align-items: stretch; }
        .header { text-align: right; font-size: 10px; margin-bottom: 2px; color: #666; }
        .date { font-size: 11px; font-weight: bold; }
        h1 { text-align: center; font-size: 23px; font-weight: bold; margin-bottom: 4px; letter-spacing: 1px; }
        h2 { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .info-table td { border: 2px solid #000; padding: 6px; font-size: 12px; }
        .info-table .label { font-weight: bold; width: 20%; }
        .info-table .value { text-transform: uppercase; font-weight: 800; text-align: center; font-size: 13px; }
        .counts { width: 100%; display: flex; gap: 8px; margin-bottom: 8px; }
        .count-box { flex: 1; border: 2px solid #000; padding: 6px; text-align: center; font-weight: bold; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px 6px; font-size: 11px; text-align: left; }
        th { background: #FFD966; text-align: center; }
        th.module { font-size: 10px; }
        th .module-sub { display: block; font-size: 9px; color: #333; font-weight: 600; }
        tbody tr:nth-child(odd) { background: #e5e5e5; }
        .text-center { text-align: center; }
        .checkbox { display: inline-block; width: 14px; height: 14px; border: 2px solid #000; border-radius: 2px; }
        .muted { color: #666; font-size: 10px; }
    </style>
</head>
<body>
    @php
        $modules = $modules ?? collect();
        $students = $students ?? collect();
        $groups = $groups ?? collect([[
            'salle'       => $examen->salle,
            'rows'        => $students ?? collect(),
            'total'       => ($students ?? collect())->count(),
            'salle_index' => 1,
        ]]);
        $sessionName = $sessionName ?? ($examen->sessionExamen->nom_session ?? '-');
    @endphp

    @foreach($groups as $groupIndex => $group)
        <div class="container" style="{{ $groupIndex > 0 ? 'page-break-before: always;' : '' }}">
            <img src="{{ public_path('/logo.png') }}" alt="Logo" style="top: 10px; left: 20px; width: 100%; height: 55px;">
            <div class="date-service" style="margin-top: 6px; width: 100%; display: flex; justify-content: space-between;">
                <div class="header">{{ $sessionName }}</div>
                <div class="date">Fait le : {{ $generatedAt->format('d/m/Y') }}</div>
            </div>

            <h1>REPARTITION COLLECTIVE</h1>
            <h2>{{ $niveauFiliere ?: ($examen->module->nom_module ?? 'Module') }}</h2>

            <table class="info-table">
                <tr>
                    <td class="label">Module ref</td>
                    <td class="value">{{ $examen->module->code_module ?? '-' }}</td>
                    <td class="label">Salle</td>
                    <td class="value">{{ $group['salle']->nom_salle ?? ('#'.$group['salle_index']) }}</td>
                </tr>
                <tr>
                    <td class="label">Session</td>
                    <td class="value">{{ $sessionName }}</td>
                    <td class="label">Modules</td>
                    <td class="value">{{ $modules->pluck('code')->implode(' | ') }}</td>
                </tr>
            </table>

            <div class="counts">
                <div class="count-box">Modules: {{ $modules->count() }}</div>
                <div class="count-box">Etudiants: {{ $group['total'] }}</div>
                <div class="count-box">Date: {{ optional($examen->date_examen)->format('d/m/Y') ?? '-' }}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>CNE</th>
                        <th>Etudiant</th>
                        @foreach($modules as $module)
                            <th class="module">
                                {{ $module['code'] }}
                                <span class="module-sub">{{ $module['name'] }}</span>
                            </th>
                        @endforeach
                    </tr>
                </thead>
                <tbody>
                    @foreach($group['rows'] as $index => $student)
                        <tr>
                            <td class="text-center">{{ $index + 1 }}</td>
                            <td>{{ $student['cne'] ?? '-' }}</td>
                            <td>{{ trim(($student['nom'] ?? '') . ' ' . ($student['prenom'] ?? '')) }}</td>
                            @foreach($modules as $module)
                                <td class="text-center">
                                    <!-- @if(($student['modules'][$module['id_examen']] ?? false))
                                        <span class="checkbox"></span>
                                    @else
                                        <span class="muted">&ndash;</span>
                                    @endif -->
                                </td>
                            @endforeach
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
