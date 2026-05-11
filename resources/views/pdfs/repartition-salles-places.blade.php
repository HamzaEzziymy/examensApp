<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Plan de salle - {{ $sessionLabel ?? 'Session' }}</title>
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
        .plan-table { table-layout: fixed; }
        th, td { border: 1px solid #000; padding: 4px 6px; font-size: 11px; text-align: left; }
        th { background: #FFD966; text-align: center; }
        tbody tr:nth-child(odd) { background: #e5e5e5; }
        .text-center { text-align: center; }
        .student-cell { display: flex; align-items: baseline; gap: 6px; }
        .student-name { font-size: 11px; line-height: 1.2; font-family: Arial, Helvetica, sans-serif; font-weight: bold; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .student-cne { font-size: 9px; color: #444; line-height: 1.1; font-weight: bold; flex: 0 0 auto; }
        .section-row td { background: #cfe2f3 !important; font-weight: bold; text-align: center; }
    </style>
</head>
<body>
    @php
        $groups = collect($groups ?? [[
            'salle'       => $examen->salle,
            'rows'        => collect($rows ?? []),
            'total'       => collect($rows ?? [])->count(),
            'salle_index' => 1,
        ]]);
        $sessionName = $sessionLabel ?? ($examen->sessionExamen->nom_session ?? '-');
        $sectionName = $examen->offreFormation?->section?->nom_section;
        $studentColumnWidth = 94;
        $indexColumnWidth = 6;
        $formatStudentDisplayName = function (array $student): string {
            $studentNom = trim((string) ($student['nom'] ?? ''));
            $studentPrenom = trim((string) ($student['prenom'] ?? ''));
            $fullName = trim($studentNom.' '.$studentPrenom);
            $displayPrenom = $studentPrenom;
            $maxNameLength = 28;

            if ($studentPrenom !== '' && mb_strlen($fullName) > $maxNameLength) {
                $prenomParts = preg_split('/\s+/', $studentPrenom, -1, PREG_SPLIT_NO_EMPTY) ?: [];
                if (count($prenomParts) >= 3) {
                    $first = array_shift($prenomParts);
                    $last = array_pop($prenomParts);
                    $middle = implode(' ', array_map(fn ($part) => mb_substr($part, 0, 1).'.', $prenomParts));
                    $displayPrenom = trim($first.' '.($middle ? $middle.' ' : '').$last);
                } elseif (count($prenomParts) === 2) {
                    $displayPrenom = $prenomParts[0].' '.mb_substr($prenomParts[1], 0, 1).'.';
                }
            }

            return trim($studentNom.' '.$displayPrenom) ?: '-';
        };
    @endphp

    @foreach($groups as $groupIndex => $group)
        @php
            $groupRows = collect($group['rows'] ?? []);
            $normalRows = $groupRows
                ->reject(fn ($student) => !empty($student['is_credit']))
                ->values();
            $creditRows = $groupRows
                ->filter(fn ($student) => !empty($student['is_credit']))
                ->values();
        @endphp
        <div class="container" style="{{ $groupIndex > 0 ? 'page-break-before: always;' : '' }}">
            <img src="{{ public_path('/logo.png') }}" alt="Logo" style="top: 10px; left: 20px; width: 100%; height: 55px;">
            <div class="date-service" style="margin-top: 6px; width: 100%; display: flex; justify-content: space-between;">
                <div class="header">{{ $sessionName }}</div>
                <div class="date">Fes le : {{ $generatedAt->format('d/m/Y') }}</div>
            </div>

            <h1>Plan de salle</h1>
            <h2>
                {{ $niveauFiliere ?: ($examLabel ?? ($examen->module->nom_module ?? 'Module')) }}
                @if($sectionName)
                    - Section {{ $sectionName }}
                @endif
            </h2>

            <table class="info-table">
                <tr>
                    <td class="label">Session</td>
                    <td class="value">{{ $sessionName }}</td>
                    <td class="label">Salle</td>
                    <td class="value">{{ $group['salle']->nom_salle ?? ('#'.$group['salle_index']) }}</td>
                </tr>
                <tr>
                    <td class="label">Niveau / Filiere</td>
                    <td class="value">{{ $niveauFiliere ?: '-' }}</td>
                    <td class="label">Date</td>
                    <td class="value"></td>
                </tr>
            </table>

            <div class="counts">
                <div class="count-box">Etudiants: {{ $group['total'] }}</div>
            </div>

            <table class="plan-table">
                <colgroup>
                    <col style="width: {{ $indexColumnWidth }}%;">
                    <col style="width: {{ $studentColumnWidth }}%;">
                </colgroup>
                <thead>
                    <tr>
                        <th>N place</th>
                        <th>Nom et Prenom</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($normalRows as $index => $student)
                        <tr>
                            <td class="text-center">{{ $student['global_index'] ?? ($index + 1) }}</td>
                            <td>
                                @php
                                    $displayName = $formatStudentDisplayName($student);
                                @endphp
                                <div class="student-cell">
                                    <span class="student-name">{{ $displayName }}</span>
                                    @if(!empty($student['cne']))
                                        <span class="student-cne">({{ $student['cne'] }})</span>
                                    @endif
                                </div>
                            </td>
                        </tr>
                    @endforeach
                    @if($creditRows->isNotEmpty())
                        <tr class="section-row">
                            <td colspan="2">Etudiants en credit</td>
                        </tr>
                        @foreach($creditRows as $index => $student)
                            <tr>
                                <td class="text-center">{{ $student['global_index'] ?? ($normalRows->count() + $index + 1) }}</td>
                                <td>
                                    @php
                                        $displayName = $formatStudentDisplayName($student);
                                    @endphp
                                    <div class="student-cell">
                                        <span class="student-name">{{ $displayName }}</span>
                                        @if(!empty($student['cne']))
                                            <span class="student-cne">({{ $student['cne'] }})</span>
                                        @endif
                                    </div>
                                </td>
                            </tr>
                        @endforeach
                    @endif
                </tbody>
            </table>
        </div>
    @endforeach
</body>
</html>
