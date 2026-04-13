<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Releves des notes</title>
    <style>
        :root {
            --page-padding-top: 3mm;
            --page-padding-side: 4mm;
            --page-padding-bottom: 2mm;
            --title-size: 16px;
            --subtitle-size: 9px;
            --details-size: 6.5px;
            --grid-columns: 4;
            --card-height: 58mm;
            --grid-gap: 1.4mm;
            --card-head-padding-top: 1.1mm;
            --card-head-padding-side: 1.3mm;
            --student-name-size: 6.1px;
            --student-cne-size: 5.4px;
            --student-meta-size: 4.9px;
            --student-semesters-size: 4.8px;
            --table-head-size: 4.7px;
            --table-body-size: 4.6px;
            --table-padding-y: 0.45mm;
            --table-padding-x: 0.7mm;
            --row-line-height: 1;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: "Segoe UI", "DejaVu Sans", sans-serif;
            color: #111827;
            background: #fff;
        }

        .page {
            width: 100%;
            padding: var(--page-padding-top) var(--page-padding-side) var(--page-padding-bottom);
        }

        .page-header { margin-bottom: 1.8mm; }

        .page-meta {
            margin-top: 1mm;
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .scope {
            font-size: 7px;
            color: #64748b;
            font-weight: 600;
        }

        .date {
            font-size: 8px;
            font-weight: 700;
            color: #374151;
        }

        h1 {
            text-align: center;
            font-size: var(--title-size);
            font-weight: 900;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            margin-top: 0.6mm;
            color: #111827;
        }

        h2 {
            text-align: center;
            font-size: var(--subtitle-size);
            font-weight: 800;
            letter-spacing: 0.35px;
            text-transform: uppercase;
            margin-top: 0.55mm;
            color: #475569;
        }

        .page-details {
            margin-top: 1.8mm;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 1.2mm 3mm;
        }

        .page-detail {
            font-size: var(--details-size);
            line-height: 1.2;
        }

        .page-detail-label {
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }

        .page-detail-value {
            margin-left: 1mm;
            font-weight: 700;
            color: #111827;
        }

        .students-grid {
            display: grid;
            grid-template-columns: repeat(var(--grid-columns), minmax(0, 1fr));
            gap: var(--grid-gap);
        }

        .student-card {
            border: 1px solid #98a2af;
            min-height: var(--card-height);
            height: var(--card-height);
            overflow: hidden;
            background: #fff;
        }

        .student-card.empty { border-color: transparent; background: transparent; }

        .student-head {
            padding: var(--card-head-padding-top) var(--card-head-padding-side) 0.8mm;
            border-bottom: 1px solid #98a2af;
            background: #eef1f5;
        }

        .student-name {
            font-size: var(--student-name-size);
            font-weight: 800;
            text-transform: uppercase;
            line-height: 1.08;
            max-height: 8mm;
            overflow: hidden;
            color: #111827;
        }

        .student-cne {
            font-size: var(--student-cne-size);
            margin-top: 0.5mm;
            font-weight: 700;
            color: #374151;
        }

        .student-meta {
            display: flex;
            justify-content: space-between;
            gap: 0.7mm;
            font-size: var(--student-meta-size);
            margin-top: 0.5mm;
            text-transform: uppercase;
            color: #5f6b7a;
            font-weight: 700;
        }

        .student-semesters {
            font-size: var(--student-semesters-size);
            margin-top: 0.55mm;
            color: #475569;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 600;
        }

        .marks-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .marks-table th,
        .marks-table td {
            border: 1px solid #98a2af;
            padding: var(--table-padding-y) var(--table-padding-x);
            font-size: var(--table-body-size);
            line-height: var(--row-line-height);
            vertical-align: top;
        }

        .marks-table th {
            background: #d6dbe2;
            text-align: center;
            font-weight: 800;
            font-size: var(--table-head-size);
            color: #1f2937;
            text-transform: uppercase;
            letter-spacing: 0.2px;
        }

        .marks-table .code { width: 17%; }
        .marks-table .label-col { width: 47%; }
        .marks-table .note { width: 13%; text-align: center; }
        .marks-table .status { width: 23%; text-align: center; }

        .module-row td {
            background: #edf1f5;
            font-weight: 800;
            color: #111827;
        }

        .element-row td { background: #fff; }

        .element-row .label-text {
            padding-left: 2mm;
            color: #4b5563;
            font-weight: 600;
        }

        .status-ok { color: #166534; font-weight: 800; }
        .status-ko { color: #b91c1c; font-weight: 800; }
    </style>
</head>
<body>
@php
    $students = collect($students ?? []);
    $scopeLabel = $scopeLabel ?? '-';
    $filiereLabel = $filiereLabel ?? '-';
    $anneeLabel = $anneeLabel ?? '-';
    $formatScore = function ($score) {
        if ($score === null || $score === '') {
            return '-';
        }

        return number_format((float) $score, 2, ',', ' ');
    };
    $studentRowCount = function (array $student) {
        return collect($student['modules'] ?? [])->sum(function (array $module) {
            return 1 + collect($module['elements'] ?? [])->count();
        });
    };
    $maxRowCount = (int) $students
        ->map(function (array $student) use ($studentRowCount) {
            return $studentRowCount($student);
        })
        ->max();

    if ($maxRowCount >= 18) {
        $studentsPerPage = 6;
        $pageStyles = [
            '--grid-columns' => '3',
            '--card-height' => '87mm',
            '--grid-gap' => '1.8mm',
            '--title-size' => '15px',
            '--subtitle-size' => '8.8px',
            '--details-size' => '6.1px',
            '--student-name-size' => '6.4px',
            '--student-cne-size' => '5.6px',
            '--student-meta-size' => '5.1px',
            '--student-semesters-size' => '4.9px',
            '--table-head-size' => '5px',
            '--table-body-size' => '4.9px',
            '--table-padding-y' => '0.5mm',
            '--table-padding-x' => '0.72mm',
        ];
    } elseif ($maxRowCount >= 12) {
        $studentsPerPage = 8;
        $pageStyles = [
            '--grid-columns' => '4',
            '--card-height' => '72mm',
            '--grid-gap' => '1.6mm',
            '--title-size' => '15.5px',
            '--subtitle-size' => '8.9px',
            '--details-size' => '6.2px',
            '--student-name-size' => '5.9px',
            '--student-cne-size' => '5.2px',
            '--student-meta-size' => '4.8px',
            '--student-semesters-size' => '4.7px',
            '--table-head-size' => '4.6px',
            '--table-body-size' => '4.5px',
            '--table-padding-y' => '0.42mm',
            '--table-padding-x' => '0.65mm',
        ];
    } else {
        $studentsPerPage = 12;
        $pageStyles = [];
    }

    $styleString = function (array $styles) {
        return collect($styles)
            ->map(function ($value, $property) {
                return $property.': '.$value;
            })
            ->implode('; ');
    };
@endphp

@foreach($students->chunk($studentsPerPage) as $pageIndex => $studentPage)
    @php
        $currentPageStyles = $pageStyles;
        if ($pageIndex > 0) {
            $currentPageStyles['page-break-before'] = 'always';
        }
    @endphp
    <div class="page" style="{{ $styleString($currentPageStyles) }}">
        <div class="page-header">
            <img src="{{ public_path('/logo.png') }}" alt="Logo" style="width: 100%; height: 10mm; object-fit: contain;">
            <div class="page-meta">
                <div class="scope">{{ $scopeLabel !== '' ? $scopeLabel : '-' }}</div>
                <div class="date">Genere le : {{ $generatedAt->format('d/m/Y') }}</div>
            </div>

            <h1>RELEVES DES NOTES</h1>
            <h2>{{ $filiereLabel ?: '-' }}</h2>

            <div class="page-details">
                <div class="page-detail">
                    <span class="page-detail-label">Annee :</span>
                    <span class="page-detail-value">{{ $anneeLabel ?: '-' }}</span>
                </div>
                <div class="page-detail">
                    <span class="page-detail-label">Etudiants :</span>
                    <span class="page-detail-value">{{ $studentPage->count() }}</span>
                </div>
                <div class="page-detail">
                    <span class="page-detail-label">Generation :</span>
                    <span class="page-detail-value">{{ $generatedAt->format('d/m/Y H:i') }}</span>
                </div>
            </div>
        </div>

        <div class="students-grid">
            @foreach($studentPage as $student)
                @php
                    $modules = collect($student['modules'] ?? []);
                    $semesters = $modules->pluck('semestre_nom')->filter()->unique()->implode(' | ');
                @endphp
                <div class="student-card">
                    <div class="student-head">
                        <div class="student-name">{{ $student['nom_complet'] ?: '-' }}</div>
                        <div class="student-cne">CNE : {{ $student['cne'] ?: '-' }}</div>
                        <div class="student-meta">
                            <span>{{ $student['niveau'] ?: '-' }}</span>
                            <span>{{ $student['section'] ?: '-' }}</span>
                        </div>
                        <div class="student-semesters">{{ $semesters !== '' ? $semesters : 'SEMESTRE -' }}</div>
                    </div>

                    <table class="marks-table">
                        <thead>
                        <tr>
                            <th class="code">Code</th>
                            <th class="label-col">Intitule</th>
                            <th class="note">Note</th>
                            <th class="status">Statut</th>
                        </tr>
                        </thead>
                        <tbody>
                        @foreach($modules as $module)
                            @php
                                $moduleStatus = trim((string) ($module['statut_module'] ?? ''));
                                $moduleStatusClass = in_array(strtolower($moduleStatus), ['valide', 'capitalise'], true) ? 'status-ok' : 'status-ko';
                                $elements = collect($module['elements'] ?? []);
                            @endphp
                            <tr class="module-row">
                                <td>{{ $module['code_module'] ?: '-' }}</td>
                                <td>
                                    {{ $module['nom_module'] ?: '-' }}
                                    @if(!empty($module['semestre_nom']))
                                        ({{ $module['semestre_nom'] }})
                                    @endif
                                </td>
                                <td class="note">{{ $formatScore($module['moyenne_module'] ?? null) }}</td>
                                <td class="status {{ $moduleStatusClass }}">{{ $moduleStatus !== '' ? $moduleStatus : '-' }}</td>
                            </tr>

                            @foreach($elements as $element)
                                @php
                                    $elementStatus = trim((string) ($element['statut_element'] ?? ''));
                                    $elementStatusClass = in_array(strtolower($elementStatus), ['valide', 'capitalise'], true) ? 'status-ok' : 'status-ko';
                                @endphp
                                <tr class="element-row">
                                    <td>{{ $element['code_element'] ?: '-' }}</td>
                                    <td class="label-text">{{ $element['nom_element'] ?: '-' }}</td>
                                    <td class="note">{{ $formatScore($element['moyenne_element'] ?? null) }}</td>
                                    <td class="status {{ $elementStatusClass }}">{{ $elementStatus !== '' ? $elementStatus : '-' }}</td>
                                </tr>
                            @endforeach
                        @endforeach
                        </tbody>
                    </table>
                </div>
            @endforeach

            @for($emptySlot = $studentPage->count(); $emptySlot < $studentsPerPage; $emptySlot++)
                <div class="student-card empty">&nbsp;</div>
            @endfor
        </div>
    </div>
@endforeach
</body>
</html>
