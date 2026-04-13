<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Erreur de connexion</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            color: #111827;
        }
        .card {
            background: #fff;
            border-radius: 12px;
            padding: 48px 40px;
            max-width: 440px;
            width: 100%;
            text-align: center;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        }
        .icon {
            width: 56px;
            height: 56px;
            background: #fee2e2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }
        .icon svg { color: #dc2626; }
        h1 { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
        p { font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 28px; }
        a {
            display: inline-block;
            padding: 10px 24px;
            background: #4f46e5;
            color: #fff;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
        }
        a:hover { background: #4338ca; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
        </div>
        <h1>Erreur de connexion à la base de données</h1>
        <p>Impossible de se connecter à la base de données.<br>Vérifiez que le serveur est démarré et réessayez.</p>
        <a href="{{ url()->current() }}">Réessayer</a>
    </div>
</body>
</html>
