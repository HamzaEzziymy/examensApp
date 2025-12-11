# InscriptionPedagogique Relationship Fix

## Issue
```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'id_etudiant' in 'field list' 
(Connection: mysql, SQL: select `id_inscription_pedagogique`, `id_etudiant`, `id_module` 
from `inscriptions_pedagogiques` where `id_module` = 4 order by `id_inscription_pedagogique` asc)
```

## Root Cause
Two model relationships were incorrectly defined, trying to access columns that don't exist in the `inscriptions_pedagogiques` table:

1. **Etudiant Model**: Trying to access `id_etudiant` column (doesn't exist)
2. **Module Model**: Trying to access `id_module` column (doesn't exist)

## Database Structure
The `inscriptions_pedagogiques` table has:
- `id_inscription_pedagogique` (primary key)
- `id_inscription_admin` (links to administrative inscriptions)
- `id_offre` (links to offre_formation)
- `type_inscription`
- `credits_acquis`

**No direct `id_etudiant` or `id_module` columns!**

## Solution

### 1. Fixed Etudiant Model Relationship
**Before (Incorrect):**
```php
public function inscriptionsPedagogiques(): HasMany
{
    return $this->hasMany(InscriptionPedagogique::class, 'id_etudiant', 'id_etudiant');
}
```

**After (Correct):**
```php
public function inscriptionsPedagogiques()
{
    return $this->hasManyThrough(
        InscriptionPedagogique::class,
        InscriptionAdministrative::class,
        'id_etudiant', // Foreign key on inscriptions_administratives table
        'id_inscription_admin', // Foreign key on inscriptions_pedagogiques table
        'id_etudiant', // Local key on etudiants table
        'id_inscription_admin' // Local key on inscriptions_administratives table
    );
}
```

### 2. Fixed Module Model Relationship
**Before (Incorrect):**
```php
public function inscriptionsPedagogiques(): HasMany
{
    return $this->hasMany(InscriptionPedagogique::class, 'id_module', 'id_module');
}
```

**After (Correct):**
```php
public function inscriptionsPedagogiques()
{
    return $this->hasManyThrough(
        InscriptionPedagogique::class,
        OffreFormation::class,
        'id_module', // Foreign key on offre_formation table
        'id_offre', // Foreign key on inscriptions_pedagogiques table
        'id_module', // Local key on modules table
        'id_offre' // Local key on offre_formation table
    );
}
```

## Relationship Chain

### Student to Pedagogical Inscriptions:
```
Etudiant → InscriptionAdministrative → InscriptionPedagogique
```

### Module to Pedagogical Inscriptions:
```
Module → OffreFormation → InscriptionPedagogique
```

## Benefits
✅ **No Database Changes**: Fixed without adding unwanted columns
✅ **Proper Relationships**: Uses existing table structure correctly
✅ **Maintains Data Integrity**: Follows the intended database design
✅ **Fixes Query Errors**: Eliminates the "Column not found" errors

## Usage
Now you can properly access:
```php
// Get all pedagogical inscriptions for a student
$student = Etudiant::find(1);
$inscriptions = $student->inscriptionsPedagogiques;

// Get all pedagogical inscriptions for a module
$module = Module::find(4);
$inscriptions = $module->inscriptionsPedagogiques;
```