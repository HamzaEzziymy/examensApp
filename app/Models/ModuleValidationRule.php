<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModuleValidationRule extends Model
{
    use HasFactory;

    protected $fillable = [
        'id_filiere',
        'id_module',
        'module_pass_threshold',
        'enforce_all_elements_threshold',
        'element_pass_threshold',
    ];

    protected $casts = [
        'module_pass_threshold' => 'float',
        'enforce_all_elements_threshold' => 'boolean',
        'element_pass_threshold' => 'float',
    ];

    public function filiere(): BelongsTo
    {
        return $this->belongsTo(Filiere::class, 'id_filiere', 'id_filiere');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class, 'id_module', 'id_module');
    }
}
