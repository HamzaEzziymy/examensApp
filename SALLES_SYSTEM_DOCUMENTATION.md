# Système de Gestion des Salles

## Vue d'ensemble
Le système de gestion des salles permet de gérer les salles de cours et d'examens de l'établissement. Il offre une interface complète pour créer, modifier, supprimer et consulter les informations des salles.

## Fonctionnalités

### 1. Affichage des Salles
- **Liste complète** : Affichage de toutes les salles avec pagination
- **Recherche** : Recherche par code, nom ou bâtiment
- **Filtrage** : Filtrage par disponibilité (disponibles/non disponibles)
- **Statistiques** : Affichage des statistiques globales (total, disponibles, capacités)

### 2. Gestion des Salles
- **Ajout** : Création de nouvelles salles avec validation
- **Modification** : Mise à jour des informations existantes
- **Suppression** : Suppression individuelle ou en lot
- **Validation** : Contrôles de saisie et unicité du code

### 3. Informations des Salles
Chaque salle contient :
- **Code salle** : Identifiant unique (ex: A101)
- **Nom** : Nom descriptif de la salle
- **Capacité** : Nombre de places en cours normal
- **Capacité examens** : Nombre de places pour les examens
- **Bâtiment** : Localisation de la salle
- **Disponibilité** : Statut actuel de la salle
- **Spécificités** : Équipements et caractéristiques

## Structure Technique

### Routes
```php
Route::prefix('configuration')->name('configuration.')->group(function () {
    Route::resource('salles', SalleController::class);
    Route::post('salles/bulk-destroy', [SalleController::class, 'bulkDestroy'])
        ->name('salles.bulk-destroy');
});
```

### Modèle (Salle.php)
```php
protected $fillable = [
    'code_salle', 'nom_salle', 'capacite', 'capacite_examens',
    'batiment', 'est_disponible', 'specificites'
];
```

### Contrôleur (SalleController.php)
- `index()` : Affichage de la liste
- `store()` : Création d'une nouvelle salle
- `update()` : Mise à jour d'une salle
- `destroy()` : Suppression d'une salle
- `bulkDestroy()` : Suppression en lot

### Interface React (Index.jsx)
- Composant principal avec gestion d'état
- Modales pour ajout/modification
- Pagination et filtrage
- Confirmation de suppression avec SweetAlert2

## Navigation
Le système est accessible via :
- **Menu principal** : Configuration > Salles
- **URL** : `/configuration/salles`
- **Route nommée** : `configuration.salles.index`

## Validation
- Code salle : Requis, unique, max 20 caractères
- Nom salle : Requis, max 100 caractères
- Capacité : Requise, entre 1 et 1000
- Capacité examens : Optionnelle, entre 1 et 1000
- Bâtiment : Optionnel, max 100 caractères
- Spécificités : Optionnelles, max 500 caractères

## Sécurité
- Protection CSRF sur toutes les opérations
- Validation côté serveur et client
- Vérification des relations avant suppression
- Messages d'erreur explicites

## Données de Test
Le système inclut un seeder (`SalleSeeder`) avec 5 salles d'exemple pour les tests et démonstrations.

## Utilisation
1. Accéder au menu "Salles" dans la sidebar
2. Consulter la liste des salles existantes
3. Utiliser la recherche et les filtres pour trouver des salles
4. Cliquer sur "Ajouter" pour créer une nouvelle salle
5. Utiliser les icônes d'action pour modifier ou supprimer
6. Sélectionner plusieurs salles pour suppression en lot