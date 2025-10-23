-- ================================================================
-- BASE DE DONNÉES - GESTION DES EXAMENS UNIVERSITAIRES
-- ================================================================

-- ================================================================
-- 1. STRUCTURE ADMINISTRATIVE
-- ================================================================

-- Années universitaires
CREATE TABLE annees_universitaires (
    id_annee INTEGER PRIMARY KEY AUTO_INCREMENT,
    annee_universitaire VARCHAR(9) NOT NULL UNIQUE, -- "2023/2024"
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    est_active BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_format_annee CHECK (annee_universitaire REGEXP '^[0-9]{4}/[0-9]{4}$')
);

-- Secteurs/Filières
CREATE TABLE filieres (
    id_filiere INTEGER PRIMARY KEY AUTO_INCREMENT,
    code_filiere VARCHAR(20) NOT NULL UNIQUE,
    nom_filiere VARCHAR(100) NOT NULL,
    description TEXT,
    est_active BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Niveaux d'études
CREATE TABLE niveaux (
    id_niveau INTEGER PRIMARY KEY AUTO_INCREMENT,
    code_niveau VARCHAR(20) NOT NULL UNIQUE,
    nom_niveau VARCHAR(100) NOT NULL,
    id_filiere INTEGER NOT NULL,
    ordre_niveau INTEGER NOT NULL, -- L1=1, L2=2, M1=3, etc.
    credits_requis INTEGER NOT NULL DEFAULT 60,
    FOREIGN KEY (id_filiere) REFERENCES filieres(id_filiere) ON DELETE CASCADE,
    UNIQUE KEY unique_ordre_filiere (id_filiere, ordre_niveau)
);

-- ================================================================
-- 2. GESTION DES UTILISATEURS
-- ================================================================

-- Table principale des utilisateurs
CREATE TABLE utilisateurs (
    id_utilisateur INTEGER PRIMARY KEY AUTO_INCREMENT,
    nom_utilisateur VARCHAR(100) NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    type_utilisateur ENUM('administrateur', 'enseignant', 'etudiant') NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    est_actif BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    derniere_connexion TIMESTAMP NULL,
    INDEX idx_email (email),
    INDEX idx_type (type_utilisateur)
);

-- Enseignants
CREATE TABLE enseignants (
    id_enseignant INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_utilisateur INTEGER UNIQUE,
    code_enseignant VARCHAR(20) NOT NULL UNIQUE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email_academique VARCHAR(255) NOT NULL UNIQUE,
    telephone VARCHAR(20),
    id_filiere INTEGER,
    grade VARCHAR(50), -- Professeur, Docteur, etc.
    specialite VARCHAR(100),
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE,
    FOREIGN KEY (id_filiere) REFERENCES filieres(id_filiere) ON DELETE SET NULL,
    INDEX idx_nom_prenom (nom, prenom)
);

-- Étudiants
CREATE TABLE etudiants (
    id_etudiant INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_utilisateur INTEGER UNIQUE,
    cne VARCHAR(20) NOT NULL UNIQUE,
    cin VARCHAR(20) UNIQUE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email_academique VARCHAR(255) NOT NULL UNIQUE,
    email_personnel VARCHAR(255),
    date_naissance DATE,
    telephone VARCHAR(20),
    adresse TEXT,
    ville VARCHAR(100),
    photo_url VARCHAR(255),
    id_filiere INTEGER,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id_utilisateur) ON DELETE CASCADE,
    FOREIGN KEY (id_filiere) REFERENCES filieres(id_filiere) ON DELETE SET NULL,
    INDEX idx_cne (cne),
    INDEX idx_nom_prenom (nom, prenom)
);

-- ================================================================
-- 3. INSCRIPTIONS
-- ================================================================

-- Inscriptions des étudiants par niveau et année
CREATE TABLE inscriptions (
    id_inscription INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_etudiant INTEGER NOT NULL,
    id_niveau INTEGER NOT NULL,
    id_annee INTEGER NOT NULL,
    statut_inscription ENUM('inscrit', 'redoublant', 'abandonne', 'transfere') NOT NULL DEFAULT 'inscrit',
    date_inscription DATE NOT NULL,
    credits_acquis INTEGER DEFAULT 0,
    FOREIGN KEY (id_etudiant) REFERENCES etudiants(id_etudiant) ON DELETE CASCADE,
    FOREIGN KEY (id_niveau) REFERENCES niveaux(id_niveau) ON DELETE CASCADE,
    FOREIGN KEY (id_annee) REFERENCES annees_universitaires(id_annee) ON DELETE CASCADE,
    UNIQUE KEY unique_inscription (id_etudiant, id_niveau, id_annee),
    INDEX idx_statut (statut_inscription)
);

-- ================================================================
-- 4. STRUCTURE PÉDAGOGIQUE
-- ================================================================

-- Modules
CREATE TABLE modules (
    id_module INTEGER PRIMARY KEY AUTO_INCREMENT,
    code_module VARCHAR(20) NOT NULL UNIQUE,
    nom_module VARCHAR(150) NOT NULL,
    abreviation_module VARCHAR(20),
    type_module ENUM('majeur', 'complementaire', 'stage', 'projet') NOT NULL,
    id_niveau INTEGER NOT NULL,
    semestre INTEGER NOT NULL, -- 1, 2, 3, 4, etc.
    quadrimestre INTEGER NOT NULL, -- 1 ou 2
    seuil_validation DECIMAL(4,2) DEFAULT 10.00,
    coefficient_module DECIMAL(4,2) NOT NULL,
    credits_module INTEGER DEFAULT 0,
    description TEXT,
    FOREIGN KEY (id_niveau) REFERENCES niveaux(id_niveau) ON DELETE CASCADE,
    INDEX idx_niveau_semestre (id_niveau, semestre),
    CONSTRAINT chk_seuil CHECK (seuil_validation >= 0 AND seuil_validation <= 20),
    CONSTRAINT chk_coefficient CHECK (coefficient_module > 0)
);

-- Éléments de module
CREATE TABLE elements_module (
    id_element INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_module INTEGER NOT NULL,
    code_element VARCHAR(20) NOT NULL,
    nom_element VARCHAR(150) NOT NULL,
    coefficient_element DECIMAL(4,2) NOT NULL,
    seuil_validation DECIMAL(4,2) DEFAULT 10.00,
    est_obligatoire BOOLEAN DEFAULT TRUE,
    type_element ENUM('cours', 'td', 'tp', 'projet', 'autre') DEFAULT 'cours',
    FOREIGN KEY (id_module) REFERENCES modules(id_module) ON DELETE CASCADE,
    UNIQUE KEY unique_code_element (code_element),
    CONSTRAINT chk_coef_element CHECK (coefficient_element > 0)
);

-- Enseignement des modules (qui enseigne quoi)
CREATE TABLE enseignements (
    id_enseignement INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_module INTEGER NOT NULL,
    id_element INTEGER,
    id_enseignant INTEGER NOT NULL,
    id_annee INTEGER NOT NULL,
    role_enseignant ENUM('responsable', 'charge_cours', 'charge_td', 'charge_tp') NOT NULL,
    FOREIGN KEY (id_module) REFERENCES modules(id_module) ON DELETE CASCADE,
    FOREIGN KEY (id_element) REFERENCES elements_module(id_element) ON DELETE CASCADE,
    FOREIGN KEY (id_enseignant) REFERENCES enseignants(id_enseignant) ON DELETE CASCADE,
    FOREIGN KEY (id_annee) REFERENCES annees_universitaires(id_annee) ON DELETE CASCADE,
    UNIQUE KEY unique_enseignement (id_module, id_element, id_enseignant, id_annee)
);

-- ================================================================
-- 5. INFRASTRUCTURE
-- ================================================================

-- Salles d'examen
CREATE TABLE salles (
    id_salle INTEGER PRIMARY KEY AUTO_INCREMENT,
    code_salle VARCHAR(20) NOT NULL UNIQUE,
    nom_salle VARCHAR(100) NOT NULL,
    capacite INTEGER NOT NULL,
    batiment VARCHAR(50),
    etage VARCHAR(10),
    est_disponible BOOLEAN DEFAULT TRUE,
    equipements TEXT, -- Projecteur, climatisation, etc.
    CONSTRAINT chk_capacite CHECK (capacite > 0)
);

-- ================================================================
-- 6. SESSIONS D'EXAMENS
-- ================================================================

-- Sessions d'examens
CREATE TABLE sessions_examens (
    id_session INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_filiere INTEGER NOT NULL,
    id_annee INTEGER NOT NULL,
    type_session ENUM('normale', 'rattrapage', 'exceptionnelle') NOT NULL,
    nom_session VARCHAR(100), -- "Session Normale S1 2023/2024"
    semestre INTEGER NOT NULL,
    quadrimestre INTEGER NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    statut_session ENUM('planifiee', 'en_cours', 'terminee', 'annulee') NOT NULL DEFAULT 'planifiee',
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_filiere) REFERENCES filieres(id_filiere) ON DELETE CASCADE,
    FOREIGN KEY (id_annee) REFERENCES annees_universitaires(id_annee) ON DELETE CASCADE,
    INDEX idx_dates (date_debut, date_fin),
    INDEX idx_statut (statut_session)
);

-- Planification des examens
CREATE TABLE examens (
    id_examen INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_session INTEGER NOT NULL,
    id_module INTEGER NOT NULL,
    id_salle INTEGER,
    date_examen DATE NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    duree_minutes INTEGER NOT NULL,
    type_examen SET('qcm', 'croquis', 'copie', 'oral', 'pratique') NOT NULL,
    statut_examen ENUM('planifie', 'en_cours', 'termine', 'annule') NOT NULL DEFAULT 'planifie',
    consignes TEXT,
    documents_autorises BOOLEAN DEFAULT FALSE,
    calculatrice_autorisee BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_session) REFERENCES sessions_examens(id_session) ON DELETE CASCADE,
    FOREIGN KEY (id_module) REFERENCES modules(id_module) ON DELETE CASCADE,
    FOREIGN KEY (id_salle) REFERENCES salles(id_salle) ON DELETE SET NULL,
    INDEX idx_date_examen (date_examen),
    CONSTRAINT chk_duree CHECK (duree_minutes > 0)
);

-- ================================================================
-- 7. ANONYMAT ET PRÉSENCES
-- ================================================================

-- Codes d'anonymat
CREATE TABLE anonymat (
    id_anonymat INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_session INTEGER NOT NULL,
    id_etudiant INTEGER NOT NULL,
    id_examen INTEGER NOT NULL,
    code_anonymat VARCHAR(20) NOT NULL,
    date_generation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_session) REFERENCES sessions_examens(id_session) ON DELETE CASCADE,
    FOREIGN KEY (id_etudiant) REFERENCES etudiants(id_etudiant) ON DELETE CASCADE,
    FOREIGN KEY (id_examen) REFERENCES examens(id_examen) ON DELETE CASCADE,
    UNIQUE KEY unique_code_anonymat (id_session, code_anonymat),
    UNIQUE KEY unique_etudiant_examen (id_etudiant, id_examen),
    INDEX idx_code (code_anonymat)
);

-- Présences et absences
CREATE TABLE presences_examens (
    id_presence INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_examen INTEGER NOT NULL,
    id_anonymat INTEGER NOT NULL,
    est_present BOOLEAN NOT NULL DEFAULT FALSE,
    heure_arrivee TIME,
    motif_absence TEXT,
    justificatif_url VARCHAR(255),
    statut_justification ENUM('non_justifiee', 'justifiee', 'en_attente') DEFAULT 'non_justifiee',
    date_enregistrement TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_examen) REFERENCES examens(id_examen) ON DELETE CASCADE,
    FOREIGN KEY (id_anonymat) REFERENCES anonymat(id_anonymat) ON DELETE CASCADE,
    UNIQUE KEY unique_presence (id_examen, id_anonymat)
);

-- ================================================================
-- 8. SURVEILLANCE
-- ================================================================

-- Surveillances d'examens
CREATE TABLE surveillances (
    id_surveillance INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_examen INTEGER NOT NULL,
    id_enseignant INTEGER NOT NULL,
    role_surveillance ENUM('principal', 'assistant', 'volant') NOT NULL,
    heure_debut TIME,
    heure_fin TIME,
    observations TEXT,
    FOREIGN KEY (id_examen) REFERENCES examens(id_examen) ON DELETE CASCADE,
    FOREIGN KEY (id_enseignant) REFERENCES enseignants(id_enseignant) ON DELETE CASCADE,
    UNIQUE KEY unique_surveillance (id_examen, id_enseignant)
);

-- Incidents pendant les examens
CREATE TABLE incidents_examens (
    id_incident INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_examen INTEGER NOT NULL,
    id_surveillance INTEGER,
    id_anonymat INTEGER,
    type_incident ENUM('triche', 'perturbation', 'materiel', 'medical', 'autre') NOT NULL,
    description TEXT NOT NULL,
    heure_incident TIME NOT NULL,
    gravite ENUM('faible', 'moyenne', 'elevee') DEFAULT 'moyenne',
    mesures_prises TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_examen) REFERENCES examens(id_examen) ON DELETE CASCADE,
    FOREIGN KEY (id_surveillance) REFERENCES surveillances(id_surveillance) ON DELETE SET NULL,
    FOREIGN KEY (id_anonymat) REFERENCES anonymat(id_anonymat) ON DELETE SET NULL
);

-- ================================================================
-- 9. CORRECTION ET NOTATION
-- ================================================================

-- Attribution des copies aux correcteurs
CREATE TABLE corrections (
    id_correction INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_examen INTEGER NOT NULL,
    id_enseignant INTEGER NOT NULL,
    nombre_copies INTEGER DEFAULT 0,
    date_attribution DATE NOT NULL,
    date_limite_correction DATE,
    statut_correction ENUM('attribue', 'en_cours', 'termine') NOT NULL DEFAULT 'attribue',
    FOREIGN KEY (id_examen) REFERENCES examens(id_examen) ON DELETE CASCADE,
    FOREIGN KEY (id_enseignant) REFERENCES enseignants(id_enseignant) ON DELETE CASCADE,
    INDEX idx_statut (statut_correction)
);

-- Notes des examens
CREATE TABLE notes (
    id_note INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_anonymat INTEGER NOT NULL,
    id_correction INTEGER NOT NULL,
    note DECIMAL(5,2) NOT NULL,
    note_sur DECIMAL(5,2) DEFAULT 20.00,
    date_saisie TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP,
    statut_note ENUM('brouillon', 'validee', 'publiee') NOT NULL DEFAULT 'brouillon',
    commentaire TEXT,
    FOREIGN KEY (id_anonymat) REFERENCES anonymat(id_anonymat) ON DELETE CASCADE,
    FOREIGN KEY (id_correction) REFERENCES corrections(id_correction) ON DELETE CASCADE,
    UNIQUE KEY unique_note_anonymat (id_anonymat),
    CONSTRAINT chk_note CHECK (note >= 0 AND note <= note_sur)
);

-- ================================================================
-- 10. RÉSULTATS
-- ================================================================

-- Résultats par élément de module
CREATE TABLE resultats_elements (
    id_resultat_element INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_inscription INTEGER NOT NULL,
    id_element INTEGER NOT NULL,
    id_session INTEGER NOT NULL,
    moyenne_element DECIMAL(5,2),
    statut_element ENUM('en_cours', 'valide', 'non_valide', 'dispense') NOT NULL DEFAULT 'en_cours',
    date_validation DATE,
    FOREIGN KEY (id_inscription) REFERENCES inscriptions(id_inscription) ON DELETE CASCADE,
    FOREIGN KEY (id_element) REFERENCES elements_module(id_element) ON DELETE CASCADE,
    FOREIGN KEY (id_session) REFERENCES sessions_examens(id_session) ON DELETE CASCADE,
    UNIQUE KEY unique_resultat_element (id_inscription, id_element, id_session)
);

-- Résultats par module
CREATE TABLE resultats_modules (
    id_resultat_module INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_inscription INTEGER NOT NULL,
    id_module INTEGER NOT NULL,
    id_session INTEGER NOT NULL,
    moyenne_module DECIMAL(5,2),
    statut_module ENUM('en_cours', 'valide', 'non_valide', 'rattrapage', 'capitalise', 'dette') NOT NULL DEFAULT 'en_cours',
    date_validation DATE,
    est_anticipe BOOLEAN DEFAULT FALSE, -- Module pris en avance
    FOREIGN KEY (id_inscription) REFERENCES inscriptions(id_inscription) ON DELETE CASCADE,
    FOREIGN KEY (id_module) REFERENCES modules(id_module) ON DELETE CASCADE,
    FOREIGN KEY (id_session) REFERENCES sessions_examens(id_session) ON DELETE CASCADE,
    UNIQUE KEY unique_resultat_module (id_inscription, id_module, id_session)
);

-- Capitalisations (modules acquis définitivement)
CREATE TABLE capitalisations (
    id_capitalisation INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_inscription INTEGER NOT NULL,
    id_module INTEGER NOT NULL,
    moyenne_capitalisee DECIMAL(5,2) NOT NULL,
    date_capitalisation DATE NOT NULL,
    id_session_origine INTEGER, -- Session où le module a été acquis
    FOREIGN KEY (id_inscription) REFERENCES inscriptions(id_inscription) ON DELETE CASCADE,
    FOREIGN KEY (id_module) REFERENCES modules(id_module) ON DELETE CASCADE,
    FOREIGN KEY (id_session_origine) REFERENCES sessions_examens(id_session) ON DELETE SET NULL,
    UNIQUE KEY unique_capitalisation (id_inscription, id_module)
);

-- ================================================================
-- 11. DÉLIBÉRATIONS
-- ================================================================

-- Délibérations
CREATE TABLE deliberations (
    id_deliberation INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_session INTEGER NOT NULL,
    id_niveau INTEGER NOT NULL,
    date_deliberation DATE NOT NULL,
    statut_deliberation ENUM('planifiee', 'en_cours', 'terminee') NOT NULL DEFAULT 'planifiee',
    proces_verbal TEXT,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_session) REFERENCES sessions_examens(id_session) ON DELETE CASCADE,
    FOREIGN KEY (id_niveau) REFERENCES niveaux(id_niveau) ON DELETE CASCADE
);

-- Décisions de délibération par étudiant
CREATE TABLE decisions_deliberation (
    id_decision INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_deliberation INTEGER NOT NULL,
    id_inscription INTEGER NOT NULL,
    decision ENUM('admis', 'redoublant', 'exclus', 'autorise_rattrapage') NOT NULL,
    mention ENUM('passable', 'assez_bien', 'bien', 'tres_bien', 'excellent') NULL,
    moyenne_generale DECIMAL(5,2),
    observations TEXT,
    FOREIGN KEY (id_deliberation) REFERENCES deliberations(id_deliberation) ON DELETE CASCADE,
    FOREIGN KEY (id_inscription) REFERENCES inscriptions(id_inscription) ON DELETE CASCADE,
    UNIQUE KEY unique_decision (id_deliberation, id_inscription)
);

-- Réclamations
CREATE TABLE reclamations (
    id_reclamation INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_inscription INTEGER NOT NULL,
    id_module INTEGER,
    id_note INTEGER,
    type_reclamation ENUM('note', 'deliberation', 'autre') NOT NULL,
    date_reclamation DATE NOT NULL,
    motif TEXT NOT NULL,
    reponse TEXT,
    decision_finale TEXT,
    statut_reclamation ENUM('soumise', 'en_cours', 'acceptee', 'rejetee') NOT NULL DEFAULT 'soumise',
    date_traitement DATE,
    FOREIGN KEY (id_inscription) REFERENCES inscriptions(id_inscription) ON DELETE CASCADE,
    FOREIGN KEY (id_module) REFERENCES modules(id_module) ON DELETE SET NULL,
    FOREIGN KEY (id_note) REFERENCES notes(id_note) ON DELETE SET NULL,
    INDEX idx_statut (statut_reclamation)
);

-- ================================================================
-- 12. STAGES (pour filières médicales/paramédicales)
-- ================================================================

-- Stages
CREATE TABLE stages (
    id_stage INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_etudiant INTEGER NOT NULL,
    id_module INTEGER,
    nom_etablissement VARCHAR(255) NOT NULL,
    service VARCHAR(100),
    adresse_etablissement TEXT,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    encadrant_externe VARCHAR(255),
    contact_encadrant VARCHAR(100),
    id_enseignant_tuteur INTEGER, -- Tuteur pédagogique
    note_stage DECIMAL(5,2),
    rapport_stage_url VARCHAR(255),
    fiche_evaluation_url VARCHAR(255),
    statut_stage ENUM('planifie', 'en_cours', 'termine', 'annule') NOT NULL DEFAULT 'planifie',
    FOREIGN KEY (id_etudiant) REFERENCES etudiants(id_etudiant) ON DELETE CASCADE,
    FOREIGN KEY (id_module) REFERENCES modules(id_module) ON DELETE SET NULL,
    FOREIGN KEY (id_enseignant_tuteur) REFERENCES enseignants(id_enseignant) ON DELETE SET NULL,
    INDEX idx_dates (date_debut, date_fin)
);

-- ================================================================
-- 13. PROCÈS-VERBAUX
-- ================================================================

-- PV des examens
CREATE TABLE proces_verbaux (
    id_pv INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_examen INTEGER NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nombre_inscrits INTEGER,
    nombre_presents INTEGER,
    nombre_absents INTEGER,
    nombre_copies_rendues INTEGER,
    incidents_signales BOOLEAN DEFAULT FALSE,
    observations_generales TEXT,
    document_url VARCHAR(255),
    FOREIGN KEY (id_examen) REFERENCES examens(id_examen) ON DELETE CASCADE
);

-- ================================================================
-- 14. COMMISSIONS
-- ================================================================

-- Commissions (disciplinaires, recours, etc.)
CREATE TABLE commissions (
    id_commission INTEGER PRIMARY KEY AUTO_INCREMENT,
    type_commission ENUM('disciplinaire', 'recours', 'pedagogique', 'autre') NOT NULL,
    nom_commission VARCHAR(255) NOT NULL,
    description TEXT,
    est_active BOOLEAN DEFAULT TRUE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Membres des commissions
CREATE TABLE membres_commission (
    id_membre INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_commission INTEGER NOT NULL,
    id_enseignant INTEGER NOT NULL,
    role_membre ENUM('president', 'vice_president', 'membre', 'rapporteur', 'secretaire') NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE,
    FOREIGN KEY (id_commission) REFERENCES commissions(id_commission) ON DELETE CASCADE,
    FOREIGN KEY (id_enseignant) REFERENCES enseignants(id_enseignant) ON DELETE CASCADE,
    UNIQUE KEY unique_membre (id_commission, id_enseignant, date_debut)
);

-- Décisions des commissions
CREATE TABLE decisions_commission (
    id_decision_commission INTEGER PRIMARY KEY AUTO_INCREMENT,
    id_commission INTEGER NOT NULL,
    id_incident INTEGER, -- Peut référencer un incident d'examen
    id_reclamation INTEGER, -- Peut référencer une réclamation
    date_reunion DATE NOT NULL,
    date_decision DATE NOT NULL,
    decision TEXT NOT NULL,
    sanction TEXT,
    observations TEXT,
    document_url VARCHAR(255),
    FOREIGN KEY (id_commission) REFERENCES commissions(id_commission) ON DELETE CASCADE,
    FOREIGN KEY (id_incident) REFERENCES incidents_examens(id_incident) ON DELETE SET NULL,
    FOREIGN KEY (id_reclamation) REFERENCES reclamations(id_reclamation) ON DELETE SET NULL
);

-- ================================================================
-- 15. VUES UTILES
-- ================================================================

-- Vue: Liste complète des examens avec informations
CREATE VIEW vue_examens_complets AS
SELECT 
    e.id_examen,
    e.date_examen,
    e.heure_debut,
    e.heure_fin,
    m.code_module,
    m.nom_module,
    n.nom_niveau,
    f.nom_filiere,
    s.nom_salle,
    s.capacite,
    se.type_session,
    e.statut_examen
FROM examens e
JOIN modules m ON e.id_module = m.id_module
JOIN niveaux n ON m.id_niveau = n.id_niveau
JOIN filieres f ON n.id_filiere = f.id_filiere
LEFT JOIN salles s ON e.id_salle = s.id_salle
JOIN sessions_examens se ON e.id_session = se.id_session;

-- Vue: Résultats étudiants avec moyennes
CREATE VIEW vue_resultats_etudiants AS
SELECT 
    et.cne,
    et.nom,
    et.prenom,
    n.nom_niveau,
    au.annee_universitaire,
    rm.moyenne_module,
    m.nom_module,
    rm.statut_module
FROM resultats_modules rm
JOIN inscriptions i ON rm.id_inscription = i.id_inscription
JOIN etudiants et ON i.id_etudiant = et.id_etudiant
JOIN modules m ON rm.id_module = m.id_module
JOIN niveaux n ON i.id_niveau = n.id_niveau
JOIN annees_universitaires au ON i.id_annee = au.id_annee;

-- ================================================================
-- 16. INDEX SUPPLÉMENTAIRES POUR PERFORMANCES
-- ================================================================

CREATE INDEX idx_inscriptions_annee ON inscriptions(id_annee);
CREATE INDEX idx_examens_session ON examens(id_session);
CREATE INDEX idx_notes_statut ON notes(statut_note);
CREATE INDEX idx_resultats_statut ON resultats_modules(statut_module);

-- ================================================================
-- FIN DU SCRIPT
-- ================================================================