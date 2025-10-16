<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Procès Verbal - Examen</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }

        .container {
            max-width: 800px;
            margin: 0 20px;
        }

        .header {
            text-align: right;
            font-size: 11px;
            margin-bottom: 5px;
            color: #666;
        }

        .date {
            text-align: left;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 20px;
        }

        h1 {
            text-align: center;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
            letter-spacing: 2px;
        }

        h2 {
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }

        .info-table td {
            border: 2px solid #000;
            padding: 8px;
            font-size: 13px;
        }

        .info-table .label {
            font-weight: bold;
            width: 15%;
            /* background: #f9f9f9; */
        }

        .info-table .value {
            width: 35%;
        }

        .attendance-row td {
            padding: 5px 8px;
        }

        .observations {
            font-size: 11px;
            margin: 15px 0;
            padding: 8px 0;
        }

        .main-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .main-table th,
        .main-table td {
            border: 2px solid #000;
            padding: 8px;
            text-align: center;
            font-size: 12px;
        }

        .main-table th {
            background: #FFD966;
            font-weight: bold;
        }

        .absent-header {
            background: #FFD966;
            font-weight: bold;
            padding: 10px;
        }

        .signature-header {
            background: #FFD966;
            font-weight: bold;
            padding: 8px;
            font-size: 11px;
        }

        .admin-section {
            background: #FFD966;
        }

        .doctoral-section {
            background: #FFD966;
        }

        .student-list {
            height: 400px;
        }

        .signature-section {
            height: 150px;
        }

        .place-col {
            width: 8%;
        }

        .name-col {
            width: 42%;
        }

        .signature-col {
            width: 50%;
        }

        .footer-note {
            font-size: 10px;
            margin-top: 10px;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">Service Examens 19/05/2025</div>
        <div class="date">Fès : VENDREDI 19/09/2025</div>
        
        <h1>PROCÈS VERBAL</h1>
        <h2>{{ $data["niveau"] }}</h2>

        <table class="info-table">
            <tr>
                <td class="label">SALLE</td>
                <td class="value">{{ $data["salle"] }}</td>
                <td class="label">Durée de l'épreuve :</td>
                <td class="value"></td>
            </tr>
            <tr>
                <td class="label">Épreuve</td>
                <td class="value">{{ $data["module"] }}</td>
                <td class="label">Début de l'épreuve :</td>
                <td class="value"></td>
            </tr>
            <tr class="attendance-row">
                <td colspan="2">Nbre des Étudiants Présents :</td>
                <td colspan="2">Nbre des absents :</td>
            </tr>
        </table>

        <div class="observations">
            - Observations sur le déroulement de l'épreuve (Incident,Fraude,etc...)
            <br>..........................................................................................................................................................................................
            <br>..........................................................................................................................................................................................
            <br>..........................................................................................................................................................................................
            <br>..........................................................................................................................................................................................
        </div>

        <table class="main-table">
            <tr>
                <th class="absent-header">Étudiants ABSENTS</th>
                <th class="absent-header">NOM, PRÉNOM ET SIGNATURE DES<br>SURVEILLANTS ENSEIGNANTS</th>
            </tr>
            <tr>
                <td style="padding: 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 2px solid #000;">
                            <th style="border-right: 2px solid #000; padding: 8px; width: 15%;">N° Place</th>
                            <th style="padding: 8px;">Nom et Prénom</th>
                        </tr>
                    </table>
                    <div class="student-list dotted-lines" style="padding: 10px;"></div>
                </td>
                <td style="padding: 0; vertical-align: top;">
                    <div class="signature-section dotted-lines" style="padding: 10px; border-bottom: 2px solid #000;"></div>
                    <div class="signature-header admin-section">
                        NOM, PRÉNOM ET SIGNATURE<br>DES ADMINISTRATIFS
                    </div>
                    <div class="signature-section dotted-lines" style="padding: 10px; border-bottom: 2px solid #000;"></div>
                    <div class="signature-header doctoral-section">
                        NOM ET PRÉNOM ET SIGNATURE DES DOCTORANTS
                    </div>
                    <div class="signature-section dotted-lines" style="padding: 10px;"></div>
                </td>
            </tr>
        </table>

        <div class="footer-note">
            * Finir la liste des absents au verso si nécessaire.
        </div>
    </div>
</body>
</html>
