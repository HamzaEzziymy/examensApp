<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Releve semestre</title>
    <style>
        :root {
            --page-padding-top: 6mm;
            --page-padding-side: 5mm;
            --page-padding-bottom: 6mm;
            --logo-height: 17mm;
            --title-gap: 2.8mm;
            --title-size: 22px;
            --subtitle-size: 15px;
            --student-info-margin: 4mm;
            --info-cell-padding-y: 1.7mm;
            --info-cell-padding-x: 2.2mm;
            --info-font-size: 11px;
            --table-margin-top: 4mm;
            --head-font-size: 9px;
            --subhead-font-size: 8.3px;
            --body-font-size: 9px;
            --element-font-size: 8.1px;
            --semester-font-size: 10px;
            --cell-padding-y: 1.15mm;
            --cell-padding-x: 1.2mm;
            --row-line-height: 1.22;
            --element-indent: 4mm;
            --signature-height: 42px;
            --signature-font-size: 9px;
            --summary-width: 320px;
            --footer-gap: 8mm;
            --footer-padding-top: 5mm;
            --generated-font-size: 9px;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: "Segoe UI", "DejaVu Sans", sans-serif;
            color: #1f2933;
            background: #fff;
            font-feature-settings: "kern" 1;
        }

        .page {
            width: 100%;
            min-height: 262mm;
            padding: var(--page-padding-top) var(--page-padding-side) var(--page-padding-bottom);
            display: flex;
            flex-direction: column;
        }

        .brand img { width: 100%; height: var(--logo-height); object-fit: contain; }
        .brand-rule { height: 1px; background: #8d96a3; margin-top: 1.2mm; }

        .title {
            margin-top: var(--title-gap);
            text-align: center;
            font-size: var(--title-size);
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #111827;
        }

        .subtitle {
            margin-top: 0.8mm;
            text-align: center;
            font-size: var(--subtitle-size);
            font-weight: 700;
            letter-spacing: 0.3px;
            color: #475569;
        }

        .content-flow {
            display: flex;
            flex: 1;
            flex-direction: column;
            min-height: 0;
        }

        .student-info {
            width: 100%;
            margin-top: var(--student-info-margin);
            border-collapse: collapse;
        }

        .student-info td {
            border: 1px solid #98a2af;
            background: #eceff3;
            padding: var(--info-cell-padding-y) var(--info-cell-padding-x);
            font-size: var(--info-font-size);
            font-weight: 700;
            color: #111827;
        }

        .student-info .left { width: 55%; }
        .student-info .right { width: 45%; text-align: right; }

        .student-label {
            color: #5f6b7a;
            font-size: 0.92em;
            font-weight: 800;
            letter-spacing: 0.4px;
            text-transform: uppercase;
        }

        .notes-table {
            width: 100%;
            margin-top: var(--table-margin-top);
            border-collapse: collapse;
            table-layout: fixed;
        }

        .notes-table th,
        .notes-table td {
            border: 1px solid #98a2af;
            padding: var(--cell-padding-y) var(--cell-padding-x);
            vertical-align: middle;
        }

        .notes-table th {
            background: #d6dbe2;
            color: #1f2937;
            font-size: var(--head-font-size);
            font-weight: 800;
            text-transform: uppercase;
            text-align: center;
            letter-spacing: 0.45px;
        }

        .notes-table td {
            font-size: var(--body-font-size);
            line-height: var(--row-line-height);
        }

        .notes-table .subhead th {
            font-size: var(--subhead-font-size);
            padding-top: calc(var(--cell-padding-y) - 0.15mm);
            padding-bottom: calc(var(--cell-padding-y) - 0.15mm);
        }

        .notes-table tr { page-break-inside: avoid; }
        .semester-col { width: 8%; }
        .module-col { width: 33%; }
        .session-col { width: 7.5%; }
        .final-col { width: 9.5%; }
        .result-col { width: 8.5%; }
        .notes-table.single-session .semester-col { width: 9%; }
        .notes-table.single-session .module-col { width: 43%; }
        .notes-table.single-session .session-col { width: 9.5%; }
        .notes-table.single-session .final-col { width: 10.5%; }
        .notes-table.single-session .result-col { width: 9%; }

        .module-row td {
            font-weight: 800;
            background: #f3f4f6;
            color: #111827;
        }

        .element-row td {
            font-size: var(--element-font-size);
            color: #4b5563;
            background: #fcfcfd;
        }

        .semester-cell { padding: 0; background: #e5e7eb; text-align: center; }

        .semester-label {
            display: inline-block;
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: var(--semester-font-size);
            font-weight: 900;
            color: #374151;
        }

        .module-name {
            margin-top: 0;
            font-weight: 800;
            letter-spacing: 0.15px;
            word-break: break-word;
        }

        .element-label {
            padding-left: var(--element-indent);
            font-style: normal;
            font-weight: 600;
            letter-spacing: 0.1px;
            color: #374151;
            word-break: break-word;
        }

        .text-center { text-align: center; }
        .score-low { color: #b45309; font-weight: 700; }
        .score-high { color: #111827; font-weight: 700; }
        .result-ok { color: #166534; font-weight: 800; }
        .result-ko { color: #b91c1c; font-weight: 800; }
        .result-neutral { color: #4b5563; font-weight: 700; }

        .footer-panel {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: var(--footer-gap);
            margin-top: auto;
            padding-top: var(--footer-padding-top);
        }

        .footer-panel.summary-hidden { justify-content: flex-start; }

        .signature-box {
            width: 172px;
            height: var(--signature-height);
            border: 1px dashed #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
            font-size: var(--signature-font-size);
            background: #fafafa;
        }

        .year-box {
            width: var(--summary-width);
            margin-left: auto;
            border: 1px solid #98a2af;
            background: #fbfbfc;
        }

        .year-title {
            padding: 1.3mm 2mm;
            border-bottom: 1px solid #98a2af;
            text-align: center;
            font-size: calc(var(--body-font-size) + 1px);
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: #1f2937;
        }

        .year-average {
            display: flex;
            justify-content: space-between;
            gap: 6mm;
            padding: 2mm 2.2mm 1.4mm;
            font-size: calc(var(--body-font-size) + 2px);
            font-weight: 800;
            color: #111827;
        }

        .year-pill {
            margin: 0 1.8mm 1.8mm;
            border-radius: 4px;
            padding: 1.8mm 2.2mm;
            font-size: calc(var(--body-font-size) + 1px);
            font-weight: 800;
        }

        .year-pill.ok { background: #e7f1ea; border: 1px solid #a6c6ae; color: #22663b; }
        .year-pill.ko { background: #f4e9e7; border: 1px solid #d6b1aa; color: #8d1f1f; }

        .generated-at {
            margin-top: 2.4mm;
            font-size: var(--generated-font-size);
            color: #6b7280;
        }
    </style>
</head>
<body>
@php
    $releves = collect($releves ?? []);
    $filiereLabel = $filiereLabel ?? '-';
    $anneeLabel = $anneeLabel ?? '-';
    $selectedSemesterSession = $selectedSemesterSession ?? null;
    $selectedSemesterSessionLabel = $selectedSemesterSessionLabel ?? null;
    $includeSemesterSummaryBox = $includeSemesterSummaryBox ?? true;
    $formatScore = function ($score) {
        if ($score === null || $score === '') {
            return '-';
        }

        return number_format((float) $score, 2, '.', '');
    };
    $scoreClass = function ($score) {
        if ($score === null || $score === '') {
            return 'result-neutral';
        }

        return (float) $score < 10 ? 'score-low' : 'score-high';
    };
    $resultClass = function ($status) {
        $value = strtoupper(trim((string) $status));

        if (in_array($value, ['V', 'VALIDE', 'CAP', 'CAPITALISE'], true)) {
            return 'result-ok';
        }

        if (in_array($value, ['NV', 'VAR', 'DET'], true)) {
            return 'result-ko';
        }

        return 'result-neutral';
    };
    $pageDensityStyle = function (int $rowCount) {
        if ($rowCount >= 34) {
            return [
                '--page-padding-top' => '4.8mm',
                '--page-padding-side' => '4.2mm',
                '--page-padding-bottom' => '4.6mm',
                '--logo-height' => '14mm',
                '--title-gap' => '1.8mm',
                '--title-size' => '18px',
                '--subtitle-size' => '12px',
                '--student-info-margin' => '2.7mm',
                '--info-cell-padding-y' => '1.15mm',
                '--info-cell-padding-x' => '1.6mm',
                '--info-font-size' => '9.5px',
                '--table-margin-top' => '2.6mm',
                '--head-font-size' => '7.6px',
                '--subhead-font-size' => '7px',
                '--body-font-size' => '7.5px',
                '--element-font-size' => '6.9px',
                '--semester-font-size' => '8.5px',
                '--cell-padding-y' => '0.72mm',
                '--cell-padding-x' => '0.8mm',
                '--row-line-height' => '1.12',
                '--element-indent' => '2.4mm',
                '--signature-height' => '32px',
                '--signature-font-size' => '7.5px',
                '--summary-width' => '286px',
                '--footer-gap' => '5mm',
                '--footer-padding-top' => '3.2mm',
                '--generated-font-size' => '7.6px',
            ];
        }

        if ($rowCount >= 24) {
            return [
                '--page-padding-top' => '5.3mm',
                '--page-padding-side' => '4.5mm',
                '--page-padding-bottom' => '5mm',
                '--logo-height' => '15.2mm',
                '--title-gap' => '2.2mm',
                '--title-size' => '20px',
                '--subtitle-size' => '13px',
                '--student-info-margin' => '3.2mm',
                '--info-cell-padding-y' => '1.35mm',
                '--info-cell-padding-x' => '1.9mm',
                '--info-font-size' => '10px',
                '--table-margin-top' => '3mm',
                '--head-font-size' => '8.2px',
                '--subhead-font-size' => '7.5px',
                '--body-font-size' => '8.1px',
                '--element-font-size' => '7.4px',
                '--semester-font-size' => '9px',
                '--cell-padding-y' => '0.9mm',
                '--cell-padding-x' => '0.95mm',
                '--row-line-height' => '1.16',
                '--element-indent' => '3mm',
                '--signature-height' => '36px',
                '--signature-font-size' => '8px',
                '--summary-width' => '300px',
                '--footer-gap' => '6mm',
                '--footer-padding-top' => '3.8mm',
                '--generated-font-size' => '8.2px',
            ];
        }

        if ($rowCount <= 10) {
            return [
                '--page-padding-top' => '6.3mm',
                '--page-padding-side' => '5mm',
                '--page-padding-bottom' => '6.2mm',
                '--logo-height' => '17.5mm',
                '--title-gap' => '3mm',
                '--title-size' => '23px',
                '--subtitle-size' => '15px',
                '--student-info-margin' => '4.2mm',
                '--info-cell-padding-y' => '1.8mm',
                '--info-cell-padding-x' => '2.3mm',
                '--info-font-size' => '11.2px',
                '--table-margin-top' => '4.2mm',
                '--head-font-size' => '9.2px',
                '--subhead-font-size' => '8.4px',
                '--body-font-size' => '9.1px',
                '--element-font-size' => '8.3px',
                '--semester-font-size' => '10.1px',
                '--cell-padding-y' => '1.18mm',
                '--cell-padding-x' => '1.25mm',
                '--row-line-height' => '1.24',
                '--element-indent' => '4.1mm',
                '--signature-height' => '44px',
                '--signature-font-size' => '9px',
                '--summary-width' => '320px',
                '--footer-gap' => '8mm',
                '--footer-padding-top' => '5.2mm',
                '--generated-font-size' => '9px',
            ];
        }

        return [];
    };
    $styleString = function (array $styles) {
        return collect($styles)
            ->map(function ($value, $property) {
                return $property.': '.$value;
            })
            ->implode('; ');
    };
    $displayNormalSession = $selectedSemesterSession !== 'rattrapage';
    $displayRattrapageSession = $selectedSemesterSession !== 'normale';
    $singleSessionLayout = ($displayNormalSession xor $displayRattrapageSession);
@endphp

@foreach($releves as $releveIndex => $releve)
    @php
        $modules = collect($releve['modules'] ?? []);
        $semesterRows = max((int) $modules->sum(function (array $module) {
            return 1 + collect($module['elements'] ?? [])->count();
        }), 1);
        $moduleScores = $modules
            ->pluck('moyenne_module')
            ->filter(function ($score) {
                return $score !== null && $score !== '';
            })
            ->map(function ($score) {
                return (float) $score;
            });
        $averageScore = $moduleScores->isNotEmpty() ? round((float) $moduleScores->avg(), 2) : null;
        $validatedModules = $modules->filter(function (array $module) {
            return in_array(strtolower(trim((string) ($module['statut_module'] ?? ''))), ['valide', 'capitalise'], true);
        })->count();
        $allValidated = $modules->isNotEmpty() && $validatedModules === $modules->count();
        $resultMessage = $allValidated
            ? "Le semestre est valide : tous les modules sont valides."
            : "Le semestre est non valide : ".max($modules->count() - $validatedModules, 0)." modules restants.";
        $pageStyles = $pageDensityStyle($semesterRows);
        if ($releveIndex > 0) {
            $pageStyles['page-break-before'] = 'always';
        }
    @endphp
    <div class="page" style="{{ $styleString($pageStyles) }}">
        <div class="brand">
            <img src="{{ public_path('/logo.png') }}" alt="Logo">
            <div class="brand-rule"></div>
        </div>

        <div class="title">RELEVE SEMESTRE</div>
        <div class="subtitle">
            {{ $releve['semestre_nom'] ?: ($selectedSemesterLabel ?: 'Semestre') }} - Annee Universitaire {{ $anneeLabel ?: '-' }}
            @if($selectedSemesterSessionLabel)
                - {{ $selectedSemesterSessionLabel }}
            @endif
        </div>

        <div class="content-flow">
            <table class="student-info">
                <tr>
                    <td class="left"><span class="student-label">CNE</span> {{ $releve['cne'] ?: '-' }}</td>
                    <td class="right"><span class="student-label">Niveau</span> {{ $releve['niveau'] ?: '-' }}</td>
                </tr>
                <tr>
                    <td class="left"><span class="student-label">Nom prenom</span> {{ strtoupper((string) ($releve['nom_complet'] ?: '-')) }}</td>
                    <td class="right"><span class="student-label">Filiere</span> {{ $filiereLabel ?: '-' }}</td>
                </tr>
            </table>

            <table class="notes-table {{ $singleSessionLayout ? 'single-session' : '' }}">
                <thead>
                <tr>
                    <th class="semester-col" rowspan="2">Semestre</th>
                    <th class="module-col" rowspan="2">Modules</th>
                    @if($displayNormalSession)
                        <th colspan="3">Session Normale</th>
                    @endif
                    @if($displayRattrapageSession)
                        <th colspan="3">Session Rattrapage</th>
                    @endif
                    <th class="final-col" rowspan="2">Note Finale</th>
                    <th class="result-col" rowspan="2">Resultats</th>
                </tr>
                <tr class="subhead">
                    @if($displayNormalSession)
                        <th class="session-col">TP</th>
                        <th class="session-col">Exam</th>
                        <th class="session-col">Note</th>
                    @endif
                    @if($displayRattrapageSession)
                        <th class="session-col">TP</th>
                        <th class="session-col">Exam</th>
                        <th class="session-col">Note</th>
                    @endif
                </tr>
                </thead>
                <tbody>
                @foreach($modules as $moduleIndex => $module)
                    @php
                        $moduleResult = $module['statut_module_short'] ?? ($module['statut_module'] ?? '-');
                        $isFirstModule = $moduleIndex === 0;
                    @endphp
                    <tr class="module-row">
                        @if($isFirstModule)
                            <td class="semester-cell" rowspan="{{ $semesterRows }}">
                                <div class="semester-label">{{ $releve['semestre_nom'] ?: ($selectedSemesterLabel ?: '-') }}</div>
                            </td>
                        @endif
                        <td>
                            <div class="module-name">{{ $module['nom_module'] ?: '-' }}</div>
                        </td>
                        @if($displayNormalSession)
                            <td class="text-center {{ $scoreClass($module['session_normale_tp'] ?? null) }}">{{ $formatScore($module['session_normale_tp'] ?? null) }}</td>
                            <td class="text-center {{ $scoreClass($module['session_normale_exam'] ?? null) }}">{{ $formatScore($module['session_normale_exam'] ?? null) }}</td>
                            <td class="text-center {{ $scoreClass($module['session_normale_note'] ?? null) }}">{{ $formatScore($module['session_normale_note'] ?? null) }}</td>
                        @endif
                        @if($displayRattrapageSession)
                            <td class="text-center {{ $scoreClass($module['session_rattrapage_tp'] ?? null) }}">{{ $formatScore($module['session_rattrapage_tp'] ?? null) }}</td>
                            <td class="text-center {{ $scoreClass($module['session_rattrapage_exam'] ?? null) }}">{{ $formatScore($module['session_rattrapage_exam'] ?? null) }}</td>
                            <td class="text-center {{ $scoreClass($module['session_rattrapage_note'] ?? null) }}">{{ $formatScore($module['session_rattrapage_note'] ?? null) }}</td>
                        @endif
                        <td class="text-center {{ $scoreClass($module['moyenne_module'] ?? null) }}">{{ $formatScore($module['moyenne_module'] ?? null) }}</td>
                        <td class="text-center {{ $resultClass($moduleResult) }}">{{ $moduleResult }}</td>
                    </tr>

                    @foreach(collect($module['elements'] ?? []) as $element)
                        @php
                            $percentage = $element['coefficient_percent'] ?? null;
                            $elementLabel = trim(collect([
                                $element['code_element'] ? $element['code_element'].':' : null,
                                $element['nom_element'] ?: null,
                                $percentage !== null ? '('.rtrim(rtrim(number_format((float) $percentage, 2, '.', ''), '0'), '.').'%)' : null,
                            ])->filter()->implode(' '));
                        @endphp
                        <tr class="element-row">
                            <td class="element-label">{{ $elementLabel !== '' ? $elementLabel : '-' }}</td>
                            @if($displayNormalSession)
                                <td class="text-center {{ $scoreClass($element['session_normale_tp'] ?? null) }}">{{ $formatScore($element['session_normale_tp'] ?? null) }}</td>
                                <td class="text-center {{ $scoreClass($element['session_normale_exam'] ?? null) }}">{{ $formatScore($element['session_normale_exam'] ?? null) }}</td>
                                <td class="text-center {{ $scoreClass($element['session_normale_note'] ?? null) }}">{{ $formatScore($element['session_normale_note'] ?? null) }}</td>
                            @endif
                            @if($displayRattrapageSession)
                                <td class="text-center {{ $scoreClass($element['session_rattrapage_tp'] ?? null) }}">{{ $formatScore($element['session_rattrapage_tp'] ?? null) }}</td>
                                <td class="text-center {{ $scoreClass($element['session_rattrapage_exam'] ?? null) }}">{{ $formatScore($element['session_rattrapage_exam'] ?? null) }}</td>
                                <td class="text-center {{ $scoreClass($element['session_rattrapage_note'] ?? null) }}">{{ $formatScore($element['session_rattrapage_note'] ?? null) }}</td>
                            @endif
                            <td class="text-center {{ $scoreClass($element['moyenne_element'] ?? null) }}">{{ $formatScore($element['moyenne_element'] ?? null) }}</td>
                            <td class="text-center result-neutral">-</td>
                        </tr>
                    @endforeach
                @endforeach
                </tbody>
            </table>

            <div class="footer-panel {{ $includeSemesterSummaryBox ? '' : 'summary-hidden' }}">
                <div class="signature-box">Cachet et Signature</div>

                @if($includeSemesterSummaryBox)
                    <div class="year-box">
                        <div class="year-title">Resultat du semestre</div>
                        <div class="year-average">
                            <span>Moyenne Generale :</span>
                            <span>{{ $formatScore($averageScore) }} / 20</span>
                        </div>
                        <div class="year-pill {{ $allValidated ? 'ok' : 'ko' }}">
                            {{ $resultMessage }}
                        </div>
                    </div>
                @endif
            </div>

            <div class="generated-at">Genere le : {{ $generatedAt->format('d/m/Y \\a H:i') }}</div>
        </div>
    </div>
@endforeach
</body>
</html>
