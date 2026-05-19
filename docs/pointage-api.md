# Pointage API

The pointage integration uses a shared token configured with `POINTAGE_API_TOKEN`.

For the button inside the repartition page, configure the external pointage app endpoint:

```env
POINTAGE_EXTERNAL_URL=http://10.6.4.58:8000/api/integrations/import-exam-affectations/
POINTAGE_EXTERNAL_TOKEN=external-app-token
POINTAGE_EXTERNAL_TIMEOUT=15
```

This endpoint is the Django integration route reachable on the local network. If the host, port, or path changes later, update `POINTAGE_EXTERNAL_URL` accordingly.

Send the token with either header:

```http
Authorization: Bearer your-token
```

or:

```http
X-Pointage-Token: your-token
```

## Push Repartition From The UI

The `Envoyer au pointage` button in the repartition page sends the selected exam repartition to `POINTAGE_EXTERNAL_URL`.

It sends a `POST` request with JSON:

```json
{
  "source": "app_repartition_examens",
  "generated_at": "2026-06-15T07:30:00Z",
  "examens": [
    {
      "examen_code": "EXAM-ANA-S1",
      "examen_libelle": "Examen Anatomie S1",
      "session": "Normale",
      "date_examen": "2026-06-15",
      "heure_debut": "08:30:00",
      "heure_fin": "10:30:00",
      "salle_code": "AMPHI-A1",
      "salle_nom": "Amphi A1",
      "etudiants": [
        {
          "cne": "D123456789",
          "nom": "BEN BRAHIM",
          "prenom": "Rabia",
          "device_user_id": "2023",
          "autorise": true,
          "numero_place": "A12"
        }
      ]
    }
  ]
}
```

Notes:

- The push payload is room-oriented. For a multi-room exam, `examens` contains one entry per room with only that room's students.
- `device_user_id` currently maps to the local `id_etudiant` as a string because the app does not store a dedicated pointage-device identifier.

If `POINTAGE_EXTERNAL_TOKEN` is set, the request includes:

```http
Authorization: Bearer external-app-token
```

## Pull Repartitions

```http
GET /api/pointage/examens/{id_examen}/repartitions
```

By default, the response includes:

- `exam`: annee, filiere, session, niveau, semestre, section, offre, module, element, dates, salles.
- `students`: flat student + seat assignment list, useful if the external app wants to store students directly.
- `repartitions`: detailed repartition list, useful for syncing attendance back.

You can limit the response with `include`:

```http
GET /api/pointage/examens/{id_examen}/repartitions?include=exam,students
```

Allowed include values are:

- `exam`
- `students`
- `repartitions`

Response shape:

```json
{
  "data": {
    "exam": {
      "id_examen": 1,
      "annee": {
        "id_annee": 1,
        "annee_univ": "2025/2026",
        "date_debut": "2025-09-01",
        "date_fin": "2026-07-31"
      },
      "filiere": {
        "id_filiere": 3,
        "nom_filiere": "Medecine"
      },
      "session": {
        "id_session_examen": 2,
        "id_filiere": 3,
        "id_annee": 1,
        "nom_session": "Session Normale",
        "type_session": "Normale",
        "date_session_examen": "2026-06-01"
      },
      "niveau": {
        "id_niveau": 4,
        "code_niveau": "A3",
        "nom_niveau": "Annee 3",
        "ordre": 3
      },
      "semestre": {
        "id_semestre": 5,
        "code_semestre": "S5",
        "nom_semestre": "Semestre 5",
        "ordre": 5
      },
      "section": {
        "id_section": 8,
        "nom_section": "Section A",
        "langue": "FR"
      },
      "offre": {
        "id_offre": 12,
        "nom_affiche": "Anatomie"
      },
      "module": {
        "id_module": 7,
        "code_module": "MED-101",
        "nom_module": "Anatomie"
      },
      "date_examen": "2026-06-10",
      "date_debut": "2026-06-10 08:00:00",
      "date_fin": "2026-06-10 10:00:00",
      "statut": "Planifiee",
      "element": null,
      "salles": []
    },
    "students": [
      {
        "id_repartition": 10,
        "id_examen": 1,
        "id_inscription_pedagogique": 55,
        "id_etudiant": 44,
        "cne": "CNE12345678",
        "nom": "Nom",
        "prenom": "Prenom",
        "type_inscription": "Normal",
        "code_grille": 1001,
        "code_anonymat": "9001",
        "numero_place": "A101-001",
        "salle_index": 1,
        "salle": {},
        "present": false,
        "date_debut": null,
        "date_fin": null,
        "observation": null
      }
    ],
    "repartitions": [
      {
        "id_repartition": 10,
        "id_examen": 1,
        "id_inscription_pedagogique": 55,
        "student": {
          "id_etudiant": 44,
          "cne": "CNE12345678",
          "nom": "Nom",
          "prenom": "Prenom"
        },
        "type_inscription": "Normal",
        "code_grille": 1001,
        "code_anonymat": "9001",
        "numero_place": "A101-001",
        "salle_index": 1,
        "salle": {},
        "present": false,
        "date_debut": null,
        "date_fin": null,
        "heure_arrivee": null,
        "heure_sortie": null,
        "observation": null,
        "updated_at": "2026-06-10 07:50:00"
      }
    ]
  }
}
```

## Push Pointage Results

```http
POST /api/pointage/examens/{id_examen}/repartitions
```

`PUT` and `PATCH` are also accepted.

Request body:

```json
{
  "repartitions": [
    {
      "id_repartition": 10,
      "present": true,
      "date_debut": "2026-06-10 08:15:00",
      "date_fin": "2026-06-10 10:05:00",
      "observation": "Badge confirme"
    }
  ]
}
```

Notes:

- `id_repartition` must belong to the `{id_examen}` in the URL.
- `date_debut` is saved into `heure_arrivee`.
- `date_fin` is saved into `heure_sortie`.
- Full dates are accepted by the API, but the current database stores only the time part on each repartition.
- Missing fields are left unchanged.
