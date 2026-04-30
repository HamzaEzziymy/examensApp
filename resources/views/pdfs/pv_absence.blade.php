<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proces-verbal d'absence</title>
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            margin: 0;
            font-size: 12px;
        }

        .page {
            padding: 18px 22px 10px;
            page-break-after: always;
        }

        .page:last-child {
            page-break-after: auto;
        }

        .header-row,
        .title-block,
        .stats-row,
        .signature-block {
            display: flex;
            justify-content: space-between;
            gap: 18px;
        }

        .header-row {
            align-items: flex-start;
            margin-bottom: 10px;
        }

        .logo {
            width: 260px;
            height: auto;
        }

        .service-meta {
            min-width: 220px;
            text-align: right;
            padding-top: 8px;
        }

        .service-label {
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 6px;
        }

        .service-date {
            font-size: 12px;
            font-weight: 700;
        }

        .title-block {
            align-items: flex-end;
            margin-bottom: 14px;
        }

        .title-text h1 {
            margin: 0;
            font-size: 24px;
            letter-spacing: 1px;
        }

        .title-text h2 {
            margin: 4px 0 0;
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
        }

        .doc-meta {
            max-width: 240px;
            text-align: right;
            font-size: 11px;
            color: #4b5563;
        }

        .doc-meta strong {
            display: block;
            color: #111827;
            margin-bottom: 4px;
        }

        .info-table,
        .absent-table {
            width: 100%;
            border-collapse: collapse;
        }

        .info-table {
            margin-bottom: 14px;
        }

        .info-table td,
        .absent-table th,
        .absent-table td {
            border: 1.5px solid #111827;
            padding: 7px 8px;
            vertical-align: top;
        }

        .info-label {
            width: 18%;
            font-weight: 700;
            background: #f3f4f6;
        }

        .info-value {
            width: 32%;
            font-weight: 700;
        }

        .stats-row {
            gap: 10px;
            align-items: center;
            font-weight: 700;
        }

        .stats-row span {
            white-space: nowrap;
        }

        .observations {
            border: 1.5px solid #111827;
            min-height: 88px;
            padding: 10px 10px 16px;
            margin-bottom: 14px;
        }

        .observations strong {
            display: block;
            margin-bottom: 8px;
        }

        .observation-line {
            border-bottom: 1px dotted #6b7280;
            height: 16px;
            margin-top: 10px;
        }

        .content-grid {
            display: grid;
            grid-template-columns: 1.08fr 0.92fr;
            gap: 14px;
        }

        .panel-title {
            background: #fde68a;
            border: 1.5px solid #111827;
            border-bottom: 0;
            padding: 8px 10px;
            font-size: 12px;
            font-weight: 800;
            text-align: center;
        }

        .absent-table th {
            background: #fde68a;
            text-align: center;
        }

        .absent-table td {
            height: 28px;
        }

        .signature-panel {
            border: 1.5px solid #111827;
            padding: 0;
            min-height: 470px;
        }

        .signature-section-title {
            background: #fde68a;
            border-bottom: 1.5px solid #111827;
            padding: 8px 10px;
            font-size: 11px;
            font-weight: 800;
            text-align: center;
        }

        .signature-section {
            padding: 12px 12px 4px;
            min-height: 136px;
        }

        .signature-line {
            border-bottom: 1px dotted #6b7280;
            height: 26px;
            margin-bottom: 12px;
        }

        .footer-note {
            margin-top: 10px;
            font-size: 10px;
            color: #4b5563;
            font-style: italic;
        }
    </style>
</head>
<body>
    @php
        $pageItems = collect($pages ?? []);
        if ($pageItems->isEmpty() && isset($data) && is_array($data)) {
            $pageItems = collect([[
                'session' => $data['session'] ?? '-',
                'salle' => $data['salle'] ?? '-',
                'module_label' => $data['module'] ?? ($data['module_label'] ?? '-'),
                'niveau' => $data['niveau'] ?? '-',
                'filiere' => $data['filiere'] ?? '-',
                'section' => $data['section'] ?? '-',
                'date_examen' => $data['date_examen'] ?? '-',
                'heure_debut' => $data['heure_debut'] ?? '-',
                'heure_fin' => $data['heure_fin'] ?? '-',
                'duree' => $data['duree'] ?? '-',
                'total' => $data['total'] ?? null,
                'present' => $data['present'] ?? null,
                'absent' => $data['absent'] ?? null,
                'attendance_known' => $data['attendance_known'] ?? false,
                'absents' => collect($data['absents'] ?? []),
            ]]);
        }

        $printedDate = optional($generatedAt ?? null)->format('d/m/Y') ?? now()->format('d/m/Y');
        $docTitle = trim((string) ($documentTitle ?? "Proces-verbal d'absence"));
        $docDescription = trim((string) ($documentDescription ?? ''));
    @endphp

    @foreach ($pageItems as $page)
        @php
            $absentRows = collect($page['absents'] ?? [])->values();
            $displayRows = max($absentRows->count(), 11);
            $attendanceKnown = (bool) ($page['attendance_known'] ?? false);
            $presentCount = $attendanceKnown ? ($page['present'] ?? '-') : '-';
            $absentCount = $attendanceKnown ? ($page['absent'] ?? '-') : '-';
            $totalCount = $page['total'] ?? '-';
            $filiereLabel = trim(collect([$page['niveau'] ?? null, $page['filiere'] ?? null])->filter()->implode(' - '));
        @endphp

        <div class="page">
            <div class="header-row">
                <img class="logo" src="{{ public_path('/logo.png') }}" alt="Logo">
                <div class="service-meta">
                    <div class="service-label">Service Examens</div>
                    <div class="service-date">Fes le : {{ $printedDate }}</div>
                </div>
            </div>

            <div class="title-block">
                <div class="title-text">
                    <h1>PROCES-VERBAL D'ABSENCE</h1>
                    <h2>{{ $filiereLabel !== '' ? $filiereLabel : ($page['niveau'] ?? '-') }}</h2>
                </div>

                @if ($docTitle !== '' || $docDescription !== '')
                    <div class="doc-meta">
                        @if ($docTitle !== '')
                            <strong>{{ $docTitle }}</strong>
                        @endif
                        @if ($docDescription !== '')
                            <span>{{ $docDescription }}</span>
                        @endif
                    </div>
                @endif
            </div>

            <table class="info-table">
                <tr>
                    <td class="info-label">Session</td>
                    <td class="info-value">{{ $page['session'] ?? '-' }}</td>
                    <td class="info-label">Section</td>
                    <td class="info-value">{{ $page['section'] ?? '-' }}</td>
                </tr>
                <tr>
                    <td class="info-label">Salle</td>
                    <td class="info-value">{{ $page['salle'] ?? '-' }}</td>
                    <td class="info-label">Duree</td>
                    <td class="info-value">{{ $page['duree'] ?? '-' }}</td>
                </tr>
                <tr>
                    <td class="info-label">Epreuve</td>
                    <td class="info-value">{{ $page['module_label'] ?? '-' }}</td>
                    <td class="info-label">Horaire</td>
                    <td class="info-value">{{ ($page['heure_debut'] ?? '-') . ' - ' . ($page['heure_fin'] ?? '-') }}</td>
                </tr>
                <tr>
                    <td class="info-label">Date</td>
                    <td class="info-value">{{ $page['date_examen'] ?? '-' }}</td>
                    <td colspan="2">
                        <div class="stats-row">
                            <span>Nbre presents : {{ $presentCount }}</span>
                            <span>Nbre absents : {{ $absentCount }}</span>
                            <span>Nbre total : {{ $totalCount }}</span>
                        </div>
                    </td>
                </tr>
            </table>

            <div class="observations">
                <strong>Observations sur le deroulement de l'epreuve (incident, fraude, etc.)</strong>
                <div class="observation-line"></div>
                <div class="observation-line"></div>
                <div class="observation-line"></div>
                <div class="observation-line"></div>
            </div>

            <div class="content-grid">
                <div>
                    <div class="panel-title">Etudiants ABSENTS</div>
                    <table class="absent-table">
                        <thead>
                            <tr>
                                <th style="width: 18%;">Ndeg Place</th>
                                <th style="width: 24%;">CNE</th>
                                <th>Nom et prenom</th>
                            </tr>
                        </thead>
                        <tbody>
                            @if ($absentRows->isEmpty())
                                <tr>
                                    <td colspan="3">Aucune absence signalee.</td>
                                </tr>
                            @else
                                @foreach ($absentRows as $row)
                                    <tr>
                                        <td>{{ $row['place'] ?? '-' }}</td>
                                        <td>{{ $row['cne'] ?? '-' }}</td>
                                        <td>{{ $row['name'] ?? '-' }}</td>
                                    </tr>
                                @endforeach
                            @endif

                            @for ($i = $absentRows->isEmpty() ? 1 : $absentRows->count(); $i < $displayRows; $i++)
                                <tr>
                                    <td>&nbsp;</td>
                                    <td>&nbsp;</td>
                                    <td>&nbsp;</td>
                                </tr>
                            @endfor
                        </tbody>
                    </table>
                </div>

                <div>
                    <div class="panel-title">Signatures et encadrement</div>
                    <div class="signature-panel">
                        <div class="signature-section-title">Nom, prenom et signature des surveillants enseignants</div>
                        <div class="signature-section">
                            <div class="signature-line"></div>
                            <div class="signature-line"></div>
                            <div class="signature-line"></div>
                        </div>

                        <div class="signature-section-title">Nom, prenom et signature des administratifs</div>
                        <div class="signature-section">
                            <div class="signature-line"></div>
                            <div class="signature-line"></div>
                            <div class="signature-line"></div>
                        </div>

                        <div class="signature-section-title">Nom, prenom et signature des doctorants</div>
                        <div class="signature-section">
                            <div class="signature-line"></div>
                            <div class="signature-line"></div>
                            <div class="signature-line"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer-note">
                Finir la liste des absents au verso si necessaire.
            </div>
        </div>
    @endforeach
</body>
</html>
