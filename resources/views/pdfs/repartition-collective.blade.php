<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Liste de Presence - {{ $sessionName ?? 'Session' }}</title>
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
        .presence-table { table-layout: fixed; }
        th, td { border: 1px solid #000; padding: 4px 6px; font-size: 11px; text-align: left; }
        th { background: #FFD966; text-align: center; }
        .module-label {
            display: block;
            font-size: 10px;
            line-height: 1.15;
            white-space: normal;
            word-break: break-word;
            overflow-wrap: anywhere;
        }
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
        $modules = $modules ?? collect();
        $groups = $groups ?? collect([[
            'salle'       => $examen->salle,
            'rows'        => $students ?? collect(),
            'total'       => ($students ?? collect())->count(),
            'salle_index' => 1,
        ]]);
        $sessionName = $sessionName ?? ($examen->sessionExamen->nom_session ?? '-');
        $semesterName = $examen->offreFormation?->semestre?->nom_semestre;
        $periodLabel = optional($examen->date_examen)->format('F Y');
        $primaryOffre = $examen->offreFormation;
        $filiereName = $primaryOffre?->section?->filiere?->nom_filiere;
        $sectionName = $primaryOffre?->section?->nom_section;
        $moduleCount = max($modules->count(), 1);
        $indexColumnWidth = 6;

        if ($moduleCount === 1) {
            $moduleColumnWidth = 22;
            $studentColumnWidth = 72;
        } elseif ($moduleCount === 2) {
            $moduleColumnWidth = 18;
            $studentColumnWidth = 58;
        } elseif ($moduleCount === 3) {
            $moduleColumnWidth = 15;
            $studentColumnWidth = 49;
        } else {
            $studentColumnWidth = 30;
            $moduleColumnWidth = round((100 - $indexColumnWidth - $studentColumnWidth) / $moduleCount, 2);
        }

        $formatWidth = function ($width) {
            return rtrim(rtrim(number_format($width, 2, '.', ''), '0'), '.');
        };

        $indexColumnWidthCss = $formatWidth($indexColumnWidth);
        $studentColumnWidthCss = $formatWidth($studentColumnWidth);
        $moduleColumnWidthCss = $formatWidth($moduleColumnWidth);
        $moduleInlineLimit = match (true) {
            $moduleCount === 1 => 26,
            $moduleCount === 2 => 20,
            $moduleCount === 3 => 15,
            default => 12,
        };
        $modulePreviewLength = match (true) {
            $moduleCount === 1 => 18,
            $moduleCount === 2 => 14,
            $moduleCount === 3 => 10,
            default => 8,
        };
        $moduleWordAbbreviationLength = match (true) {
            $moduleCount === 1 => 8,
            $moduleCount === 2 => 6,
            $moduleCount === 3 => 5,
            default => 4,
        };
        $abbreviateModuleWord = function (string $word) use ($moduleWordAbbreviationLength): string {
            $word = trim($word);

            if ($word === '') {
                return '';
            }

            preg_match('/[.,;:!?)]*$/u', $word, $suffixMatch);
            $suffix = $suffixMatch[0] ?? '';
            $core = $suffix !== '' ? mb_substr($word, 0, mb_strlen($word) - mb_strlen($suffix)) : $word;

            if ($core === '' || mb_strlen($core) <= $moduleWordAbbreviationLength) {
                return $word;
            }

            return mb_substr($core, 0, $moduleWordAbbreviationLength).'.'.$suffix;
        };
        $formatModuleLines = function (?string $label) use ($moduleInlineLimit, $modulePreviewLength, $abbreviateModuleWord) {
            $label = trim((string) preg_replace('/\s+/', ' ', (string) $label));

            if ($label === '') {
                return ['-'];
            }

            $words = array_values(array_filter(preg_split('/\s+/', $label, -1, PREG_SPLIT_NO_EMPTY) ?: []));

            if ($words === []) {
                return ['-'];
            }

            if (mb_strlen($label) <= $moduleInlineLimit) {
                return [$label];
            }

            $abbreviatedWords = array_map($abbreviateModuleWord, $words);
            $abbreviatedLabel = implode(' ', $abbreviatedWords);

            if (mb_strlen($abbreviatedLabel) <= $moduleInlineLimit) {
                return [$abbreviatedLabel];
            }

            if (count($words) <= 1) {
                return [\Illuminate\Support\Str::limit($abbreviatedLabel, $moduleInlineLimit, '...')];
            }

            if (count($words) === 2) {
                return $abbreviatedWords;
            }

            return [
                $abbreviatedWords[0],
                $abbreviatedWords[1],
                \Illuminate\Support\Str::limit(implode(' ', array_slice($abbreviatedWords, 2)), $modulePreviewLength, '...'),
            ];
        };
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

            <h1>Liste de Presence</h1>
            <h2>
                {{ $niveauFiliere ?: ($examLabel ?? ($examen->module->nom_module ?? 'Module')) }}
                @if($sectionName)
                    - Section {{ $sectionName }}
                @endif
            </h2>

            <table class="info-table">

                
                <tr>
                    <td class="label">Semestres</td>
                    <td class="value">{{ $modules->pluck('semestre')->filter()->unique()->implode(' | ') }}</td>
                    <td class="label">Salle</td>
                    <td class="value">{{ $group['salle']->nom_salle ?? ('#'.$group['salle_index']) }}</td>
                </tr>
                <tr>
                    <td class="label">Session</td>
                    <td class="value">{{ $sessionName }}</td>
                    <td class="label">Date</td>
                    <td class="value">{{ optional($firstExamDate ?? $examen->date_examen)->format('d/m/Y') ?? '-' }}</td>
                </tr>
            </table>

            <div class="counts">
                <div class="count-box">Modules: {{ $modules->count() }}</div>
                <div class="count-box">Etudiants: {{ $group['total'] }}</div>
            </div>

            <table class="presence-table">
                <colgroup>
                    <col style="width: {{ $indexColumnWidthCss }}%;">
                    <col style="width: {{ $studentColumnWidthCss }}%;">
                    @foreach($modules as $module)
                        <col style="width: {{ $moduleColumnWidthCss }}%;">
                    @endforeach
                </colgroup>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nom et Prenom</th>
                        @foreach($modules as $module)
                            @php
                                $moduleLines = $formatModuleLines($module['name'] ?? '');
                            @endphp
                            <th>
                                <span class="module-label">
                                    @foreach($moduleLines as $line)
                                        {{ $line }}@if(! $loop->last)<br>@endif
                                    @endforeach
                                </span>
                            </th>
                        @endforeach
                    </tr>
                </thead>
                <tbody>
                    @foreach($normalRows as $index => $student)
                        <tr>
                            <td class="text-center ">{{ $student['global_index'] ?? ($index + 1) }}</td>
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
                            @foreach($modules as $module)
                                @php
                                    $status = $student['modules'][$module['id_examen']] ?? 'none';
                                    $cellClass = $status === 'pass' ? '' : 'cap';
                                @endphp
                                <td class="text-center {{ $cellClass }}">
                                    @if($status === 'cap')
                                        CAP
                                    @elseif($status === 'none')
                                       X
                                    @endif
                                </td>
                            @endforeach
                        </tr>
                    @endforeach
                    @if($creditRows->isNotEmpty())
                        <tr class="section-row">
                            <td colspan="{{ 2 + $modules->count() }}">Etudiants en credit</td>
                        </tr>
                        @foreach($creditRows as $index => $student)
                            <tr>
                                <td class="text-center ">{{ $student['global_index'] ?? ($normalRows->count() + $index + 1) }}</td>
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
                                @foreach($modules as $module)
                                    @php
                                        $status = $student['modules'][$module['id_examen']] ?? 'none';
                                        $cellClass = $status === 'pass' ? '' : 'cap';
                                    @endphp
                                    <td class="text-center {{ $cellClass }}">
                                        @if($status === 'cap')
                                            CAP
                                        @elseif($status === 'none')
                                           X
                                        @endif
                                    </td>
                                @endforeach
                            </tr>
                        @endforeach
                    @endif
                </tbody>
            </table>

            <div class="date-service" style="margin-top: 6px; width: 100%; display: flex; justify-content: flex-end;">
          
            </div>
        </div>
    @endforeach
</body>
</html>
