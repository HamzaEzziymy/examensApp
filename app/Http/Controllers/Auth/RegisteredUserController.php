<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Faculte;
use App\Models\User;
use App\Models\Filiere;
use App\Models\AnneeUniversitaire;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // Assign a random filiere and the active academic year to the new user
        $filiere = Filiere::inRandomOrder()->first() ?? Filiere::factory()->create();
        $annee = AnneeUniversitaire::where('est_active', true)->first()
            ?? AnneeUniversitaire::factory()->create(['est_active' => true]);

        // Create the user_filiere_annee pivot entry
        $selectFiliereAnnee = $user->userFiliereAnnees()->create([
            'id_filiere' => $filiere->id_filiere,
            'id_annee' => $annee->id_annee,
        ]);

        event(new Registered($user));

        Auth::login($user);
        // $facultes = Faculte::all();
        // dd($facultes);

        return redirect(route('dashboard', absolute: false));
    }
}
