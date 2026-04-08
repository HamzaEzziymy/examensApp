<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Releves des notes</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: "Roboto", Arial, sans-serif; padding: 0; color: #000; }
        .page { width: 100%; padding: 8px 10px 10px; }
        .layout-table { width: 100%; border-collapse: separate; border-spacing: 8px 0; table-layout: fixed; }
        .layout-cell { width: 50%; vertical-align: top; }
        .sheet { width: 100%; border: 1.5px solid #000; padding: 8px 10px 10px; }
        .sheet-empty { border-color: transparent; }
        .header { text-align: right; font-size: 10px; margin-bottom: 2px; color: #666; }
        .date { font-size: 11px; font-weight: bold; }
        h1 { text-align: center; font-size: 19px; font-weight: bold; margin-bottom: 4px; letter-spacing: 1px; text-transform: uppercase; }
        h2 { text-align: center; font-size: 12px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .info-table td { border: 1.5px solid #000; padding: 6px; font-size: 9px; }
        .info-table .label { font-weight: bold; width: 20%; }
        .info-table .value { text-transform: uppercase; font-weight: 800; text-align: center; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px 5px; font-size: 8.5px; text-align: left; }
        th { background: #FFD966; text-align: center; }
        tbody tr:nth-child(odd) { background: #f3f3f3; }
        .text-center { text-align: center; }
        .module-row td { background: #dce6f1 !important; font-weight: bold; }
        .element-row td:first-child,
        .element-row td:nth-child(2) { color: #555; font-size: 8px; }
        .element-name { padding-left: 14px; }
        .status-ok { color: #1f6f3d; font-weight: bold; }
        .status-ko { color: #8c1d18; font-weight: bold; }
        .generated-at { width: 100%; text-align: right; font-size: 9px; margin-top: 5px; }
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
@endphp

@foreach($students->chunk(2) as $pageIndex => $studentPair)
    <div class="page" style="{{ $pageIndex > 0 ? 'page-break-before: always;' : '' }}">
        <table class="layout-table">
            <tr>
                @foreach(range(0, 1) as $slot)
                    @php
                        $student = $studentPair->get($slot);
                        $modules = collect($student['modules'] ?? []);
                    @endphp
                    <td class="layout-cell">
                        @if($student)
                            <div class="sheet">
                                <img src="{{ public_path('/logo.png') }}" alt="Logo" style="width: 100%; height: 54px;">
                                <div style="margin-top: 5px; width: 100%; display: flex; justify-content: space-between;">
                                    <div class="header">{{ $scopeLabel !== '' ? $scopeLabel : '-' }}</div>
                                    <div class="date">Fes le : {{ $generatedAt->format('d/m/Y') }}</div>
                                </div>

                                <h1>RELEVE DES NOTES</h1>
                                <h2>{{ $filiereLabel ?: '-' }}</h2>

                                <table class="info-table">
                                    <tr>
                                        <td class="label">Etudiant</td>
                                        <td class="value">{{ $student['nom_complet'] ?: '-' }}</td>
                                        <td class="label">CNE</td>
                                        <td class="value">{{ $student['cne'] ?: '-' }}</td>
                                    </tr>
                                    <tr>
                                        <td class="label">Niveau</td>
                                        <td class="value">{{ $student['niveau'] ?: '-' }}</td>
                                        <td class="label">Section</td>
                                        <td class="value">{{ $student['section'] ?: '-' }}</td>
                                    </tr>
                                    <tr>
                                        <td class="label">Annee universitaire</td>
                                        <td class="value">{{ $anneeLabel ?: '-' }}</td>
                                        <td class="label">Date generation</td>
                                        <td class="value">{{ $generatedAt->format('d/m/Y H:i') }}</td>
                                    </tr>
                                </table>

                                <table>
                                    <thead>
                                    <tr>
                                        <th style="width: 7%;">#</th>
                                        <th style="width: 12%;">Type</th>
                                        <th style="width: 15%;">Code</th>
                                        <th style="width: 36%;">Intitule</th>
                                        <th style="width: 12%;">Note / 20</th>
                                        <th style="width: 18%;">Statut</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    @foreach($modules as $moduleIndex => $module)
                                        @php
                                            $moduleStatus = trim((string) ($module['statut_module'] ?? ''));
                                            $moduleStatusClass = in_array(strtolower($moduleStatus), ['valide', 'capitalise'], true) ? 'status-ok' : 'status-ko';
                                            $elements = collect($module['elements'] ?? []);
                                        @endphp
                                        <tr class="module-row">
                                            <td class="text-center">{{ $moduleIndex + 1 }}</td>
                                            <td class="text-center">Module</td>
                                            <td>{{ $module['code_module'] ?: '-' }}</td>
                                            <td>
                                                {{ $module['nom_module'] ?: '-' }}
                                                @if(!empty($module['semestre_nom']))
                                                    ({{ $module['semestre_nom'] }})
                                                @endif
                                            </td>
                                            <td class="text-center">{{ $formatScore($module['moyenne_module'] ?? null) }}</td>
                                            <td class="text-center {{ $moduleStatusClass }}">{{ $moduleStatus !== '' ? $moduleStatus : '-' }}</td>
                                        </tr>

                                        @foreach($elements as $element)
                                            @php
                                                $elementStatus = trim((string) ($element['statut_element'] ?? ''));
                                                $elementStatusClass = in_array(strtolower($elementStatus), ['valide', 'capitalise'], true) ? 'status-ok' : 'status-ko';
                                            @endphp
                                            <tr class="element-row">
                                                <td class="text-center"></td>
                                                <td class="text-center">Element</td>
                                                <td>{{ $element['code_element'] ?: '-' }}</td>
                                                <td class="element-name">{{ $element['nom_element'] ?: '-' }}</td>
                                                <td class="text-center">{{ $formatScore($element['moyenne_element'] ?? null) }}</td>
                                                <td class="text-center {{ $elementStatusClass }}">{{ $elementStatus !== '' ? $elementStatus : '-' }}</td>
                                            </tr>
                                        @endforeach
                                    @endforeach
                                    </tbody>
                                </table>

                                <div class="generated-at">
                                    Genere le {{ $generatedAt->format('d/m/Y H:i') }}
                                </div>
                            </div>
                        @else
                            <div class="sheet sheet-empty">&nbsp;</div>
                        @endif
                    </td>
                @endforeach
            </tr>
        </table>
    </div>
@endforeach
</body>
</html>
