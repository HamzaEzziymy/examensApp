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
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
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
        }

        .info-table .value {
            text-transform: uppercase;
            font-weight: 800;
            text-align: center;
            font-size: 18px;
        }

        .attendance-row td {
            padding: 5px 8px;
        }

        .observations {
            font-size: 11px;
            margin: 15px 0;
            padding: 8px 0;
            width: 100%;
        }

        .main-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            margin-left: auto;
            margin-right: auto;
        }

        .main-table th,
        .main-table {
            border: 2px solid #000;
            padding: 8px;
            text-align: center;
            font-size: 12px;
        }
        td{
             border: 2px solid #000;
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
            width: 100%;
        }
        .niveau {
            text-transform: uppercase;
            font-weight: 800;
            font-size: 20px;
        }
    </style>
</head>
<body>
    <div class="container" style="padding-right: 30px;">
        <!-- logo -->
        <img src="{{ public_path('/logo.png') }}" alt="Logo" style="top: 20px; left: 20px; width: 100%; height: 70px;">
        <div class="header" style="margin-top:8px;">Service Examens</div>

        <div class="date">Fès le : {{ now()->format('d/m/Y') }}</div>
        
        <h1>PROCÈS VERBAL</h1>
        <h2 class="niveau">{{ $data["niveau"] }}</h2>

        <table class="info-table">
            <tr>
                <td class="label">SALLE</td>
                <td class="value" >{{ $data["salle"] }}</td>
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
            <br>...........................................................................................................................................................................................................................................
            <br>...........................................................................................................................................................................................................................................
            <br>...........................................................................................................................................................................................................................................
            <br>...........................................................................................................................................................................................................................................
        </div>

        <table class="main-table">
            <tr>
                <th class="absent-header">Étudiants ABSENTS</th>
                <th class="absent-header">NOM, PRÉNOM ET SIGNATURE DES<br>SURVEILLANTS ENSEIGNANTS</th>
            </tr>
            <tr>
                <td style="width: 50%;">
                    <div>
                        <div style="margin-top:-100px;background: #FFD966; font-weight: bold;text-align: center; display: flex; justify-content: space-between;">
                            <div class="place-col" style="display: inline-block; width: 25%; padding: 10px 0; font-weight: bold; border-right:solid 2px ">N° Place</div>
                            <div class="name-col" style="display: inline-block; width: 75%; padding: 10px 0; font-weight: bold;">NOM ET PRÉNOM</div>
                        </div>
                        <div class="student-list dotted-lines" style="border-top:solid 2px; padding-top: 17px; padding-right: 5px;padding-left: 5px;">
                            ........................&nbsp;&nbsp;&nbsp;............................................................................<br/><br/><br/>
                            ........................&nbsp;&nbsp;&nbsp;............................................................................<br/><br/><br/>
                            ........................&nbsp;&nbsp;&nbsp;............................................................................<br/><br/><br/>
                            ........................&nbsp;&nbsp;&nbsp;............................................................................<br/><br/><br/>
                            ........................&nbsp;&nbsp;&nbsp;............................................................................<br/><br/><br/>
                            ........................&nbsp;&nbsp;&nbsp;............................................................................<br/><br/><br/>
                            ........................&nbsp;&nbsp;&nbsp;............................................................................<br/><br/><br/>
                            ........................&nbsp;&nbsp;&nbsp;............................................................................<br/><br/><br/>
                            ........................&nbsp;&nbsp;&nbsp;............................................................................<br/><br/><br/>
                            ........................&nbsp;&nbsp;&nbsp;............................................................................<br/><br/><br/>
                            ........................&nbsp;&nbsp;&nbsp;............................................................................<br/><br/><br/>
                        </div>
                    </div>
                </td>
                <td style="width: 50%;">
                    <div class="signature-section dotted-lines" style="padding: 10px; border-bottom: 2px solid #000;">
                        .............................................................................................................<br/><br/><br/>
                        .............................................................................................................<br/><br/><br/>
                        .............................................................................................................<br/><br/><br/>
                    </div>
                    <div class="signature-header admin-section" style="border-bottom: 2px solid #000;">
                        NOM, PRÉNOM ET SIGNATURE<br>DES ADMINISTRATIFS
                    </div>
                    <div class="signature-section dotted-lines" style="padding: 10px; border-bottom: 2px solid #000;">
                        .............................................................................................................<br/><br/><br/>
                        .............................................................................................................<br/><br/><br/>
                        .............................................................................................................<br/><br/><br/>
                    </div>
                    <div class="signature-header doctoral-section" style="border-bottom: 2px solid #000; height: 40px;">
                        NOM ET PRÉNOM ET SIGNATURE DES DOCTORANTS
                    </div>
                    <div class="signature-section dotted-lines" style="padding: 10px;">
                        .............................................................................................................<br/><br/><br/>
                        .............................................................................................................<br/><br/><br/>
                        .............................................................................................................<br/><br/><br/>
                    </div>
                </td>
            </tr>
        </table>

        <div class="footer-note">
            * Finir la liste des absents au verso si nécessaire.
        </div>
    </div>
</body>
</html>