<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Etudiant;
use App\Models\Filiere;
use App\Models\Section;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EtudiantController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $students = Etudiant::with('section', 'section.filiere')->get();
        
        $sections = Section::with('filiere')->get();
        return Inertia::render('GestionsEtudiantes/Etudiantes/Index',
            [
                'students'=> $students,
                'sections'=> $sections
            ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
