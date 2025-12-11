# Procès-Verbal Real Data Integration

## Overview
Updated the Documents Procès-Verbal system to use real database data instead of static/hardcoded options for Sessions, Niveaux, Salles, and Modules.

## Changes Made

### 1. DocumentController.php
**Updated `indexPv()` method** to fetch real data from the database:

```php
// Fetch real data for the form
$sessions = \App\Models\SessionExamen::select('id_session_examen', 'nom_session')
    ->orderBy('nom_session')
    ->get();
    
$niveaux = \App\Models\Niveau::select('id_niveau', 'nom_niveau')
    ->orderBy('nom_niveau')
    ->get();
    
$salles = \App\Models\Salle::select('id_salle', 'code_salle', 'nom_salle')
    ->where('est_disponible', true)
    ->orderBy('code_salle')
    ->get();
    
$modules = \App\Models\Module::select('id_module', 'nom_module')
    ->orderBy('nom_module')
    ->get();
    
$filieres = \App\Models\Filiere::select('id_filiere', 'nom_filiere')
    ->orderBy('nom_filiere')
    ->get();
    
$sections = \App\Models\Section::select('id_section', 'nom_section', 'id_filiere')
    ->orderBy('nom_section')
    ->get();
```

### 2. Index.jsx
**Updated component** to receive and pass real data:
- Added props: `sessions`, `niveaux`, `salles`, `modules`, `filieres`, `sections`
- Passed data to CreateForm component

### 3. CreateForm.jsx
**Replaced static options** with dynamic data from database and added cascading dropdowns:

#### Before (Static):
```javascript
<option value="2024/2025">2024/2025</option>
<option value="2025/2026">2025/2026</option>
```

#### After (Dynamic):
```javascript
{sessions.map((session) => (
    <option key={session.id_session_examen} value={session.nom_session}>
        {session.nom_session}
    </option>
))}
```

## Data Sources

### Sessions
- **Model**: `SessionExamen`
- **Fields**: `id_session_examen`, `nom_session`
- **Sorting**: By session name

### Niveaux
- **Model**: `Niveau`
- **Fields**: `id_niveau`, `nom_niveau`
- **Sorting**: By niveau name

### Salles
- **Model**: `Salle`
- **Fields**: `id_salle`, `code_salle`, `nom_salle`
- **Filter**: Only available salles (`est_disponible = true`)
- **Display**: "Code - Name" format
- **Sorting**: By salle code

### Modules
- **Model**: `Module`
- **Fields**: `id_module`, `nom_module`
- **Sorting**: By module name

### Filieres
- **Model**: `Filiere`
- **Fields**: `id_filiere`, `nom_filiere`
- **Sorting**: By filiere name

### Sections
- **Model**: `Section`
- **Fields**: `id_section`, `nom_section`, `id_filiere`
- **Filtering**: Sections filtered by selected filiere
- **Sorting**: By section name

### 4. PDF Template (pv_absence.blade.php)
**Updated niveau display** to show combined format:
```php
<h2 class="niveau">
    {{ $data["niveau"] }}
    @if(isset($data["filiere"]) && $data["filiere"])
        {{ $data["filiere"] }}
    @endif
    @if(isset($data["section"]) && $data["section"])
        {{ $data["section"] }}
    @endif
</h2>
```

## Benefits

✅ **Dynamic Data**: Form options now reflect current database content
✅ **Real-time Updates**: New sessions, niveaux, salles, modules, filieres, and sections appear automatically
✅ **Data Consistency**: Uses the same data as other parts of the system
✅ **Better UX**: Users see actual available options instead of dummy data
✅ **Cascading Dropdowns**: Sections are filtered based on selected filiere
✅ **Combined Display**: PDF shows "niveau filiere section" format
✅ **Maintainability**: No need to manually update hardcoded options

## Usage

1. **Access**: Navigate to Documents → PV ABSENCE
2. **Form Fields**: All dropdown fields now show real data from the database
3. **Cascading Selection**: Select filiere first, then section options are filtered accordingly
4. **PDF Generation**: Generated PDFs will show "niveau filiere section" format
4. **Data Management**: Add/edit sessions, niveaux, salles, and modules through their respective management interfaces

## Database Requirements

The system requires the following tables to have data:
- `sessions_examen` - For exam sessions
- `niveaux` - For academic levels
- `salles` - For rooms/halls
- `modules` - For course modules
- `filieres` - For academic programs
- `sections` - For program sections (linked to filieres)

Use the existing seeders to populate test data:
```bash
php artisan db:seed --class=CoreAcademicSeeder
php artisan db:seed --class=ExamSeeder
php artisan db:seed --class=SalleSeeder
```

## Future Enhancements

- Add filtering (e.g., salles by building, modules by filiere)
- Add search functionality in dropdowns
- Add validation to ensure selected data relationships are valid
- Add caching for frequently accessed data