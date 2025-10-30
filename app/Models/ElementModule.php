<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ElementModule extends Model
{
    use HasFactory;

    protected $table = 'elements_module';
    protected $primaryKey = 'id_element';
    protected $guarded = [];

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class, 'id_module', 'id_module');
    }

    public function resultatsElements(): HasMany
    {
        return $this->hasMany(ResultatElement::class, 'id_element', 'id_element');
    }

    public function reclamations(): HasMany
    {
        return $this->hasMany(Reclamation::class, 'id_element_module', 'id_element');
    }
}
