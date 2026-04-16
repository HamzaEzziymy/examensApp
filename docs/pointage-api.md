# Pointage API

The pointage integration uses a shared token configured with `POINTAGE_API_TOKEN`.

Send the token with either header:

```http
Authorization: Bearer your-token
```

or:

```http
X-Pointage-Token: your-token
```

## Pull Repartitions

```http
GET /api/pointage/examens/{id_examen}/repartitions
```

Response shape:

```json
{
  "data": {
    "exam": {
      "id_examen": 1,
      "date_examen": "2026-06-10",
      "date_debut": "2026-06-10 08:00:00",
      "date_fin": "2026-06-10 10:00:00",
      "statut": "Planifiee",
      "session": {},
      "module": {},
      "element": null,
      "salles": []
    },
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
